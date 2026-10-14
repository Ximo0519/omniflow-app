import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

/**
 * Cloudflare R2 对象存储（S3 兼容接口）
 *
 * 环境变量：
 * - R2_ACCOUNT_ID        Cloudflare 账户 ID
 * - R2_ACCESS_KEY_ID     R2 API 令牌 Access Key
 * - R2_SECRET_ACCESS_KEY R2 API 令牌 Secret Key
 * - R2_BUCKET_NAME       存储桶名称
 * - R2_PUBLIC_URL        桶的公开访问域名（如 https://pub-xxx.r2.dev）
 */

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const BUCKET = process.env.R2_BUCKET_NAME || '';
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');

export function isR2Configured(): boolean {
  return !!(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET);
}

function assertConfigured() {
  if (!isR2Configured()) {
    throw new Error('R2 存储未配置，请检查 R2_* 环境变量');
  }
}

let client: S3Client | null = null;

function getClient(): S3Client {
  assertConfigured();
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
    });
  }
  return client;
}

/** 上传音频 Buffer，返回 { key, publicUrl } */
export async function uploadAudio(
  userId: number,
  buffer: Buffer,
  contentType = 'audio/mpeg',
): Promise<{ key: string; publicUrl: string }> {
  const ext = contentType.includes('wav') ? 'wav' : 'mp3';
  const key = `music/${userId}/${randomUUID()}.${ext}`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return { key, publicUrl: `${PUBLIC_URL}/${key}` };
}

/** 删除音频对象（忽略不存在的情况） */
export async function deleteAudio(key: string): Promise<void> {
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: BUCKET, Key: key }),
    );
  } catch (err) {
    console.warn('[r2] delete failed (ignored):', err);
  }
}

/** 生成带下载头的临时签名 URL（用于音频下载） */
export async function getDownloadUrl(
  key: string,
  filename: string,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
  });
  return getSignedUrl(getClient(), command, { expiresIn: 3600 });
}
