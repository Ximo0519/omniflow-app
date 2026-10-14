import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db, isDbConfigured } from '../db';
import { users } from '../db/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'aimusic-dev-secret-change-me';
const DAILY_QUOTA = parseInt(process.env.DAILY_QUOTA || '10', 10);

/** 挂载到 req 上的用户信息 */
export interface AuthUser {
  id: number;
  username: string;
  quotaRemaining: number;
}

// 扩展 Express Request
declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 每日配额重置：如果 quotaResetDate 不是今天，则恢复满额
 */
export async function refreshQuota(user: {
  id: number;
  quotaRemaining: number;
  quotaResetDate: string | null;
}): Promise<{ quotaRemaining: number; reset: boolean }> {
  const today = todayStr();
  if (user.quotaResetDate !== today) {
    await db
      .update(users)
      .set({ quotaRemaining: DAILY_QUOTA, quotaResetDate: today })
      .where(eq(users.id, user.id));
    return { quotaRemaining: DAILY_QUOTA, reset: true };
  }
  return { quotaRemaining: user.quotaRemaining, reset: false };
}

/** JWT 签发 */
export function signToken(userId: number): string {
  return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '30d' });
}

/**
 * 认证中间件：校验 Bearer Token 并加载用户（含每日配额重置）
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!isDbConfigured()) {
      return res
        .status(503)
        .json({ success: false, error: '数据库未配置，请联系管理员' });
    }

    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) {
      return res.status(401).json({ success: false, error: '请先登录' });
    }

    let uid: number;
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { uid?: number };
      uid = payload.uid!;
    } catch {
      return res.status(401).json({ success: false, error: '登录已过期，请重新登录' });
    }

    const rows = await db.select().from(users).where(eq(users.id, uid)).limit(1);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ success: false, error: '用户不存在' });
    }

    const quota = await refreshQuota(user);
    req.authUser = {
      id: user.id,
      username: user.username,
      quotaRemaining: quota.quotaRemaining,
    };
    return next();
  } catch (err) {
    console.error('[auth] requireAuth error:', err);
    return res.status(500).json({ success: false, error: '认证失败' });
  }
}
