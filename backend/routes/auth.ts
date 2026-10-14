import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, isDbConfigured } from '../db';
import { users } from '../db/schema';
import { requireAuth, signToken, refreshQuota } from '../middleware/auth';

const DAILY_QUOTA = parseInt(process.env.DAILY_QUOTA || '10', 10);

const router = Router();

/** 用户公开信息（不含密码哈希） */
function publicUser(u: {
  id: number;
  username: string;
  quotaRemaining: number;
  createdAt: Date;
}) {
  return {
    id: u.id,
    username: u.username,
    quotaRemaining: u.quotaRemaining,
    createdAt: u.createdAt,
  };
}

/** 注册 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    if (!isDbConfigured()) {
      return res.status(503).json({ success: false, error: '数据库未配置' });
    }

    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/.test(username)) {
      return res.status(400).json({
        success: false,
        error: '用户名需为 2-20 位中英文、数字或下划线',
      });
    }
    if (password.length < 6 || password.length > 50) {
      return res
        .status(400)
        .json({ success: false, error: '密码长度需为 6-50 位' });
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: '用户名已被注册' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const inserted = await db
      .insert(users)
      .values({
        username,
        passwordHash,
        quotaRemaining: DAILY_QUOTA,
        quotaResetDate: new Date().toISOString().slice(0, 10),
      })
      .returning();

    const user = inserted[0];
    return res.json({
      success: true,
      data: { token: signToken(user.id), user: publicUser(user) },
    });
  } catch (err) {
    console.error('[auth] register error:', err);
    return res.status(500).json({ success: false, error: '注册失败，请稍后重试' });
  }
});

/** 登录 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    if (!isDbConfigured()) {
      return res.status(503).json({ success: false, error: '数据库未配置' });
    }

    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, error: '请输入用户名和密码' });
    }

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }

    const quota = await refreshQuota(user);
    return res.json({
      success: true,
      data: {
        token: signToken(user.id),
        user: publicUser({ ...user, quotaRemaining: quota.quotaRemaining }),
      },
    });
  } catch (err) {
    console.error('[auth] login error:', err);
    return res.status(500).json({ success: false, error: '登录失败，请稍后重试' });
  }
});

/** 获取当前用户信息（含配额） */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  return res.json({ success: true, data: req.authUser });
});

export default router;
