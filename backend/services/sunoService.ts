import axios from 'axios';

/**
 * Suno 第三方代理服务（默认对接 open.suno.cn 协议）
 *
 * 环境变量：
 * - SUNO_API_KEY      代理平台 API Key（必填）
 * - SUNO_API_BASE_URL 代理平台地址，默认 https://open.suno.cn
 * - SUNO_MODEL        模型版本（对应平台 mv 字段），默认 chirp-hawk
 *                     可选值：chirp-hawk（V6，默认）| chirp-hawk-wild | chirp-goose
 *
 * 接口约定（open.suno.cn）：
 * - 提交生成：POST /api/v1/music/generate  返回 { code, data: [taskId, ...], success, message }
 * - 查询任务：GET  /api/v1/music/task?id=  返回 { code, data: { status, result, error, ... }, success, message }
 * - 必填字段：mv、title、make_instrumental，以及 gpt_description_prompt 与 prompt 二选一
 *
 * 如更换其他代理平台，只需调整本文件内的请求/响应映射。
 */

const BASE_URL = (
  process.env.SUNO_API_BASE_URL || 'https://open.suno.cn'
).replace(/\/+$/, '');
const API_KEY = process.env.SUNO_API_KEY || '';
/** 平台 mv 字段，必填；chirp-hawk 即 V6 模型 */
const MODEL = process.env.SUNO_MODEL || 'chirp-hawk';

export interface SunoClip {
  id: string;
  audioUrl?: string;
  title?: string;
  duration?: number;
}

export type SunoTaskStatus = 'pending' | 'completed' | 'failed';

export interface SunoTaskResult {
  status: SunoTaskStatus;
  clips: SunoClip[];
  failReason?: string;
}

export function isSunoConfigured(): boolean {
  return !!API_KEY;
}

function assertConfigured() {
  if (!API_KEY) {
    throw new Error(
      'SUNO_API_KEY 未配置，请在环境变量中填写 Suno 代理平台的 API Key'
    );
  }
}

function authHeaders() {
  return {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  };
}

/** 将平台原始状态归一化为 pending / completed / failed */
function normalizeStatus(raw: string): SunoTaskStatus {
  const s = (raw || '').toUpperCase();
  if (s === 'COMPLETED' || s === 'COMPLETE' || s === 'SUCCESS') {
    return 'completed';
  }
  if (s === 'FAILED' || s === 'ERROR') {
    return 'failed';
  }
  return 'pending'; // PENDING / PROCESSING / 未知状态均视为进行中
}

/** 该平台的提示信息字段为 message */
function pickMessage(payload: Record<string, unknown> | undefined, fallback: string) {
  const msg = payload?.message ?? payload?.msg;
  return typeof msg === 'string' && msg ? msg : fallback;
}

/** result.extend 是 JSON 字符串，其中含有歌曲标题 */
function parseTitle(extend: unknown): string {
  if (typeof extend === 'string' && extend) {
    try {
      const parsed = JSON.parse(extend) as Record<string, unknown>;
      return String(parsed?.title || '');
    } catch {
      return '';
    }
  }
  if (extend && typeof extend === 'object') {
    return String((extend as Record<string, unknown>).title || '');
  }
  return '';
}

/** 从平台响应中提取任务 ID
 * 兼容形态：数字数组、单个 ID、对象包裹（taskId/task_id/id/task_ids） */
function pickTaskId(data: unknown): string | null {
  const fromValue = (v: unknown): string | null => {
    if (typeof v === 'number' || typeof v === 'string') return String(v);
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      const inner = o.taskId ?? o.task_id ?? o.id;
      if (typeof inner === 'number' || typeof inner === 'string') {
        return String(inner);
      }
      // 平台当前返回 data.task_ids: [id, id]
      const ids = o.task_ids ?? o.taskIds;
      if (Array.isArray(ids) && ids.length > 0) return fromValue(ids[0]);
    }
    return null;
  };
  if (Array.isArray(data)) return data.length > 0 ? fromValue(data[0]) : null;
  return fromValue(data);
}

/**
 * 提交生成任务，返回首个 taskId
 *
 * 注意：该平台一次请求会生成多个版本（data 为 taskId 数组），本项目取第一个。
 */
export async function createGenerationTask(params: {
  prompt: string; // 音乐描述（灵感模式）
  title: string;
  instrumental: boolean;
}): Promise<string> {
  assertConfigured();

  // mv / title / make_instrumental 为平台必填字段；
  // 灵感模式下风格由描述文本推断，故不再单独发送 tags（tags 仅适用自定义模式）
  const body = {
    gpt_description_prompt: params.prompt,
    mv: MODEL,
    title: params.title || '未命名音乐',
    make_instrumental: params.instrumental,
  };

  try {
    const resp = await axios.post(`${BASE_URL}/api/v1/music/generate`, body, {
      headers: authHeaders(),
      timeout: 30_000,
    });

    const payload = resp.data;
    const accepted =
      payload?.code === 200 || payload?.code === '200' || payload?.success === true;

    const taskId = accepted ? pickTaskId(payload?.data) : null;
    if (taskId) return taskId;

    // 已受理但未按预期返回任务 ID：带出原始响应便于排查
    if (accepted) {
      const raw = JSON.stringify(payload).slice(0, 500);
      console.error('[suno] 提交已受理但未取到任务 ID:', raw);
      throw new Error(
        `生成任务已提交但平台未返回任务 ID，原始响应: ${raw.slice(0, 300)}`
      );
    }

    // 平台的业务错误（如积分不足、敏感词）；带上原始响应便于排查
    const raw = JSON.stringify(payload).slice(0, 500);
    throw new Error(
      `${pickMessage(payload, '提交生成任务失败')}（原始响应: ${raw.slice(0, 300)}）`
    );
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data
        ? pickMessage(err.response.data, err.message)
        : err.message;
      throw new Error(`Suno API 请求失败: ${msg}`);
    }
    throw err;
  }
}

/** 轮询任务状态，返回归一化结果 */
export async function getTaskResult(taskId: string): Promise<SunoTaskResult> {
  assertConfigured();

  try {
    const resp = await axios.get(`${BASE_URL}/api/v1/music/task`, {
      params: { id: taskId },
      headers: authHeaders(),
      timeout: 30_000,
    });

    const payload = resp.data;
    if (payload?.code !== 200 || !payload?.data) {
      throw new Error(pickMessage(payload, '查询任务状态失败'));
    }

    const task = payload.data as Record<string, unknown>;
    const status = normalizeStatus(String(task.status ?? ''));
    // 当前平台把文件信息放在 data.fileInfo；legacy 兼容 data.result.fileInfo 旧结构
    const legacy = (task.result || {}) as Record<string, unknown>;
    const info = (task.fileInfo || legacy.fileInfo || {}) as Record<string, unknown>;

    const clips: SunoClip[] = [];
    if (status === 'completed') {
      const audioUrl = info.mp3Url || info.mp4Url || '';
      if (audioUrl) {
        clips.push({
          id: String(task.taskId ?? task.task_id ?? task.id ?? taskId),
          audioUrl: String(audioUrl),
          title: parseTitle(task.extend ?? legacy.extend),
          duration: Number(info.duration || 0),
        });
      }
    }

    return {
      status,
      clips,
      failReason: status === 'failed' ? String(task.error || '生成失败') : undefined,
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data
        ? pickMessage(err.response.data, err.message)
        : err.message;
      throw new Error(`Suno API 查询失败: ${msg}`);
    }
    throw err;
  }
}

/** 下载音频文件，返回 Buffer（用于转存 R2） */
export async function downloadAudio(url: string): Promise<Buffer> {
  const resp = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 120_000,
    maxContentLength: 50 * 1024 * 1024, // 50MB 上限
  });
  return Buffer.from(resp.data);
}
