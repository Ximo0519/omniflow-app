import axios, { AxiosError } from 'axios';

/**
 * Suno 第三方代理服务（默认对接 open.suno.cn 协议）
 *
 * 核心流程：提交生成 → 拿到两个 task_id → 轮询每个任务 → 完成后取 custom_id + 音频地址
 *
 * 接口约定：
 * - POST /api/v1/music/generate  返回 { code, data: { task_ids: [id1, id2] }, success }
 * - GET  /api/v1/music/task?id=  返回 { code, data: { status, result: { custom_id, fileInfo, extend }, error }, success }
 * - result.custom_id 是后续延长/翻唱/裁剪/变速等 API 的关键凭据
 * - result.points_refunded 为 true 时说明平台已退回该任务消耗的积分
 * - 402 = 积分不足；429 = 限流（降低请求频率）
 */

const BASE_URL = (
  process.env.SUNO_API_BASE_URL || 'https://open.suno.cn'
).replace(/\/+$/, '');
const API_KEY = process.env.SUNO_API_KEY || '';
const MODEL = process.env.SUNO_MODEL || 'chirp-hawk';

export interface SunoClip {
  id: string;            // task_id（数字转字符串）
  sunoId?: string;       // custom_id（UUID），下游 API 凭据
  audioUrl?: string;
  title?: string;
  duration?: number;
}

export type SunoTaskStatus = 'pending' | 'completed' | 'failed';

export interface SunoTaskResult {
  status: SunoTaskStatus;
  clips: SunoClip[];
  failReason?: string;
  pointsRefunded?: boolean; // 平台是否已退积分
}

/** 双版本生成的返回结构 */
export interface DualGenerationTask {
  taskIds: [string, string]; // 两个 task_id，分别对应两个版本
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
  if (s === 'COMPLETED' || s === 'COMPLETE' || s === 'SUCCESS') return 'completed';
  if (s === 'FAILED' || s === 'ERROR') return 'failed';
  return 'pending'; // PENDING / PROCESSING / 未知均视为进行中
}

/** 从 payload 中取 message/msg 字段 */
function pickMessage(
  payload: Record<string, unknown> | undefined,
  fallback: string,
): string {
  const msg = payload?.message ?? payload?.msg;
  return typeof msg === 'string' && msg ? msg : fallback;
}

/** extend 是 JSON 字符串，parse 后取 title */
function parseTitle(extend: unknown): string {
  if (typeof extend === 'string' && extend) {
    try {
      const parsed = JSON.parse(extend) as Record<string, unknown>;
      if (Array.isArray(parsed)) {
        // extend 可能是数组，取第一个的 title
        const first = parsed[0] as Record<string, unknown> | undefined;
        return String(first?.title || '');
      }
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

/** 从对象中提取 custom_id，兼容多种字段名和嵌套位置 */
function pickCustomId(...sources: unknown[]): string | null {
  for (const src of sources) {
    if (!src || typeof src !== 'object') continue;
    const o = src as Record<string, unknown>;
    const id = (o.custom_id ?? o.customId ?? o.suno_id ?? o.sunoId ?? o.id);
    if (typeof id === 'string' && id.length > 0) return id;
  }
  return null;
}

/** 从 generate 响应的 data 字段中提取两个 task_id */
function extractTaskIds(data: unknown): string[] {
  if (!data) return [];

  // 形态 1: data = { task_ids: [123, 456] }
  if (typeof data === 'object' && data !== null) {
    const o = data as Record<string, unknown>;
    const ids = (o.task_ids ?? o.taskIds ?? o.ids);
    if (Array.isArray(ids)) {
      return ids.slice(0, 2).map((v) => String(v));
    }
    // 形态 2: data = { task_id: 123, task_ids: undefined }
    const single = o.task_id ?? o.taskId ?? o.id;
    if (typeof single === 'number' || typeof single === 'string') {
      return [String(single)];
    }
  }

  // 形态 3: data = [123, 456]
  if (Array.isArray(data)) {
    return data.slice(0, 2).map((v) => String(v));
  }

  return [];
}

/**
 * 提交生成任务，返回两个 task_id（Suno 每次生成默认产出 2 首）
 */
export async function createGenerationTask(params: {
  prompt: string;
  title: string;
  instrumental: boolean;
  /** extend/cover 模式传 'extend' 或 'cover'，普通模式不传 */
  taskType?: 'extend' | 'cover';
  /** 延长/翻唱模式需要的参考 custom_id */
  referenceClipId?: string;
}): Promise<DualGenerationTask> {
  assertConfigured();

  const body: Record<string, unknown> = {
    gpt_description_prompt: params.prompt,
    mv: MODEL,
    title: params.title || '未命名音乐',
    make_instrumental: params.instrumental,
  };

  // 延长/翻唱模式
  if (params.taskType === 'extend' && params.referenceClipId) {
    body.task = 'extend';
    body.continue_clip_id = params.referenceClipId;
    delete body.gpt_description_prompt; // 延长模式用参考音频，不需要描述
  } else if (params.taskType === 'cover' && params.referenceClipId) {
    body.task = 'cover';
    body.cover_clip_id = params.referenceClipId;
    delete body.gpt_description_prompt;
  }

  try {
    const resp = await axios.post(
      `${BASE_URL}/api/v1/music/generate`,
      body,
      { headers: authHeaders(), timeout: 30_000 },
    );

    const payload = resp.data;
    const accepted =
      payload?.code === 200 || payload?.code === '200' || payload?.success === true;

    if (!accepted) {
      throw new Error(pickMessage(payload, '提交生成任务失败'));
    }

    const ids = extractTaskIds(payload?.data);
    if (ids.length === 0) {
      console.error('[suno] 提交已受理但未取到 task_ids:', JSON.stringify(payload).slice(0, 500));
      throw new Error('生成任务已提交但平台未返回 task_ids');
    }

    // 不足两个补 null（不常见，但防御性处理）
    while (ids.length < 2) ids.push('');

    return { taskIds: ids as [string, string] };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const data = err.response?.data as Record<string, unknown> | undefined;
      if (status === 402) throw new Error('Suno API 积分不足，请前往商户后台充值');
      if (status === 429) throw new Error('Suno API 请求过于频繁，请稍后重试');
      const msg = data
        ? pickMessage(data, err.message)
        : err.message;
      throw new Error(`Suno API 请求失败(${status ?? '网络'}): ${msg}`);
    }
    throw err;
  }
}

/**
 * 查询单个任务状态，解析 custom_id + 音频地址
 *
 * 响应结构（open.suno.cn）：
 * {
 *   code: 200,
 *   data: {
 *     status: "pending" | "processing" | "completed" | "failed",
 *     result: {
 *       custom_id: "uuid-string",
 *       fileInfo: { mp3Url, duration, cosUrl },
 *       extend: "[{...完整 JSON...}]"
 *     },
 *     points_refunded: true/false,
 *     error: "失败原因"
 *   }
 * }
 */
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
    const pointsRefunded = Boolean(task.points_refunded);

    // 音频信息：文档说在 result.fileInfo，但我们兼容 task.fileInfo（不同版本平台）
    const resultWrap = (task.result || {}) as Record<string, unknown>;
    const fileInfo = (task.fileInfo || resultWrap.fileInfo || {}) as Record<string, unknown>;

    // custom_id：文档说在 result.custom_id，兼容多处
    const sunoId = pickCustomId(task, resultWrap);

    const clips: SunoClip[] = [];
    if (status === 'completed') {
      const audioUrl = fileInfo.mp3Url || fileInfo.mp4Url || '';
      if (audioUrl) {
        clips.push({
          id: String(task.taskId ?? task.task_id ?? task.id ?? taskId),
          sunoId: sunoId || undefined,
          audioUrl: String(audioUrl),
          title: parseTitle(task.extend ?? resultWrap.extend),
          duration: Number(fileInfo.duration || 0),
        });
      }
    }

    return {
      status,
      clips,
      failReason: status === 'failed'
        ? String(task.error || resultWrap.error || '生成失败')
        : undefined,
      pointsRefunded,
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const data = err.response?.data as Record<string, unknown> | undefined;
      if (status === 429) throw new Error('Suno API 限流，查询请稍后重试');
      const msg = data
        ? pickMessage(data, err.message)
        : err.message;
      throw new Error(`Suno API 查询失败(${status ?? '网络'}): ${msg}`);
    }
    throw err;
  }
}

/** 下载音频文件，返回 Buffer */
export async function downloadAudio(url: string): Promise<Buffer> {
  const resp = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 120_000,
    maxContentLength: 50 * 1024 * 1024,
  });
  return Buffer.from(resp.data);
}
