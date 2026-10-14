import axios from 'axios';

/**
 * Suno 第三方代理服务（默认对接 sunoapi.org 协议）
 *
 * 环境变量：
 * - SUNO_API_KEY      代理平台 API Key（必填）
 * - SUNO_API_BASE_URL 代理平台地址，默认 https://api.sunoapi.org
 * - SUNO_MODEL        模型版本，默认 V4
 *
 * 如更换其他代理平台，只需调整本文件内的三个方法的请求/响应映射。
 */

const BASE_URL = (
  process.env.SUNO_API_BASE_URL || 'https://api.sunoapi.org'
).replace(/\/+$/, '');
const API_KEY = process.env.SUNO_API_KEY || '';
const MODEL = process.env.SUNO_MODEL || 'V4';

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

/** 将代理平台的原始状态归一化为 pending / completed / failed */
function normalizeStatus(raw: string): SunoTaskStatus {
  const s = (raw || '').toUpperCase();
  if (s === 'COMPLETE' || s === 'COMPLETED' || s === 'SUCCESS') {
    return 'completed';
  }
  if (
    s.includes('FAILED') ||
    s.includes('ERROR') ||
    s === 'SENSITIVE_CONTENT_ERROR'
  ) {
    return 'failed';
  }
  return 'pending'; // PENDING / TEXT_SUCCESS / FIRST_SUCCESS / 未知状态均视为进行中
}

/** 提交生成任务，返回 taskId */
export async function createGenerationTask(params: {
  prompt: string; // 音乐描述（非自定义模式）或歌词（自定义模式）
  style: string; // 风格标签，如 "pop, energetic"
  title: string;
  instrumental: boolean;
}): Promise<string> {
  assertConfigured();

  const body = {
    prompt: params.prompt,
    style: params.style,
    title: params.title,
    customMode: false,
    instrumental: params.instrumental,
    model: MODEL,
  };

  try {
    const resp = await axios.post(`${BASE_URL}/api/v1/generate`, body, {
      headers: authHeaders(),
      timeout: 30_000,
    });

    const data = resp.data?.data;
    if (resp.data?.code === 200 && data?.taskId) {
      return data.taskId as string;
    }

    // 代理平台的业务错误（如余额不足、敏感词）
    throw new Error(resp.data?.msg || '提交生成任务失败');
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const msg =
        err.response?.data?.msg || err.response?.data?.message || err.message;
      throw new Error(`Suno API 请求失败: ${msg}`);
    }
    throw err;
  }
}

/** 轮询任务状态，返回归一化结果 */
export async function getTaskResult(taskId: string): Promise<SunoTaskResult> {
  assertConfigured();

  try {
    const resp = await axios.get(`${BASE_URL}/api/v1/generate/record-info`, {
      params: { taskId },
      headers: authHeaders(),
      timeout: 30_000,
    });

    const payload = resp.data?.data;
    if (resp.data?.code !== 200 || !payload) {
      throw new Error(resp.data?.msg || '查询任务状态失败');
    }

    const status = normalizeStatus(payload.status || '');
    const rawClips = payload.response?.sunoData || [];

    const clips: SunoClip[] = rawClips
      .filter((c: Record<string, unknown>) => c.audio_url || c.audioUrl)
      .map((c: Record<string, unknown>) => ({
        id: String(c.id || ''),
        audioUrl: String(c.audio_url || c.audioUrl || ''),
        title: String(c.title || ''),
        duration: Number(c.duration || 0),
      }));

    return {
      status,
      clips,
      failReason:
        status === 'failed' ? payload.failMsg || payload.status : undefined,
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const msg =
        err.response?.data?.msg || err.response?.data?.message || err.message;
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
