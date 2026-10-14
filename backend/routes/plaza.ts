import { Router, Request, Response } from 'express';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db, isDbConfigured } from '../db';
import { shares, likes, music, users } from '../db/schema';
import { requireAuth } from '../middleware/auth';

const router = Router();

/** 简单敏感词过滤（课程演示级别） */
const BANNED_WORDS = ['赌博', '诈骗', '毒品', '枪支'];
function containsBanned(text: string): boolean {
  return BANNED_WORDS.some((w) => text.includes(w));
}

function toClient(
  s: typeof shares.$inferSelect,
  likedByMe: boolean,
) {
  return {
    id: String(s.id),
    userId: s.userId,
    authorName: s.authorName,
    musicId: s.musicId ? String(s.musicId) : null,
    title: s.title,
    description: s.description,
    promptText: s.promptText,
    audioUrl: s.audioUrl,
    likesCount: s.likesCount,
    playsCount: s.playsCount,
    likedByMe,
    createdAt: s.createdAt,
  };
}

/** 发布分享（音乐分享或纯提示词分享） */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!isDbConfigured()) {
      return res.status(503).json({ success: false, error: '数据库未配置' });
    }

    const user = req.authUser!;
    const { musicId, title, description, promptText } = req.body;

    if (title && containsBanned(String(title))) {
      return res.status(400).json({ success: false, error: '内容包含敏感词，无法分享' });
    }
    if (description && containsBanned(String(description))) {
      return res.status(400).json({ success: false, error: '内容包含敏感词，无法分享' });
    }

    let finalTitle = '';
    let finalDescription = '';
    let finalPrompt = '';
    let finalAudioUrl: string | null = null;
    let finalMusicId: number | null = null;

    if (musicId) {
      // 音乐分享：从音乐库取记录（必须是自己的且已完成）
      const rows = await db
        .select()
        .from(music)
        .where(
          and(
            eq(music.id, parseInt(String(musicId), 10)),
            eq(music.userId, user.id),
          ),
        )
        .limit(1);
      const record = rows[0];
      if (!record) {
        return res.status(404).json({ success: false, error: '音乐不存在' });
      }
      if (record.status !== 'completed' || !record.audioUrl) {
        return res
          .status(400)
          .json({ success: false, error: '只能分享已生成完成的音乐' });
      }

      finalMusicId = record.id;
      finalTitle = String(title || record.title).trim().slice(0, 100);
      finalDescription = String(description || record.description).trim().slice(0, 500);
      finalPrompt = String(promptText || record.optimizedPrompt || record.prompt).slice(0, 2000);
      finalAudioUrl = record.audioUrl;
    } else {
      // 纯提示词分享
      finalTitle = String(title || '').trim().slice(0, 100);
      finalDescription = String(description || '').trim().slice(0, 500);
      finalPrompt = String(promptText || '').trim().slice(0, 2000);
      if (!finalTitle || !finalPrompt) {
        return res
          .status(400)
          .json({ success: false, error: '标题和提示词不能为空' });
      }
      if (containsBanned(finalPrompt)) {
        return res.status(400).json({ success: false, error: '内容包含敏感词，无法分享' });
      }
    }

    const inserted = await db
      .insert(shares)
      .values({
        userId: user.id,
        musicId: finalMusicId,
        title: finalTitle,
        description: finalDescription,
        promptText: finalPrompt,
        audioUrl: finalAudioUrl,
        authorName: user.username,
      })
      .returning();

    return res.json({ success: true, data: toClient(inserted[0], false) });
  } catch (err) {
    console.error('[plaza] create error:', err);
    return res.status(500).json({ success: false, error: '分享失败' });
  }
});

/** 广场列表（最新在前，附带我是否点过赞） */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(shares)
      .orderBy(desc(shares.createdAt))
      .limit(100);

    const myLikes = await db
      .select({ shareId: likes.shareId })
      .from(likes)
      .where(eq(likes.userId, req.authUser!.id));
    const likedSet = new Set(myLikes.map((l) => l.shareId));

    return res.json({
      success: true,
      data: rows.map((s) => toClient(s, likedSet.has(s.id))),
    });
  } catch (err) {
    console.error('[plaza] list error:', err);
    return res.status(500).json({ success: false, error: '获取广场列表失败' });
  }
});

/** 点赞/取消点赞（切换） */
router.post('/:id/like', requireAuth, async (req: Request, res: Response) => {
  try {
    const shareId = parseInt(String(req.params.id), 10);
    const userId = req.authUser!.id;

    const existing = await db
      .select({ id: likes.id })
      .from(likes)
      .where(and(eq(likes.shareId, shareId), eq(likes.userId, userId)))
      .limit(1);

    let liked: boolean;
    if (existing.length > 0) {
      await db.delete(likes).where(eq(likes.id, existing[0].id));
      await db
        .update(shares)
        .set({ likesCount: sql`GREATEST(${shares.likesCount} - 1, 0)` })
        .where(eq(shares.id, shareId));
      liked = false;
    } else {
      await db.insert(likes).values({ shareId, userId });
      await db
        .update(shares)
        .set({ likesCount: sql`${shares.likesCount} + 1` })
        .where(eq(shares.id, shareId));
      liked = true;
    }

    const updated = await db
      .select({ likesCount: shares.likesCount })
      .from(shares)
      .where(eq(shares.id, shareId))
      .limit(1);

    return res.json({
      success: true,
      data: { liked, likesCount: updated[0]?.likesCount ?? 0 },
    });
  } catch (err) {
    console.error('[plaza] like error:', err);
    return res.status(500).json({ success: false, error: '点赞操作失败' });
  }
});

/** 播放计数（前端开始播放时调用） */
router.post('/:id/play', requireAuth, async (req: Request, res: Response) => {
  try {
    const shareId = parseInt(String(req.params.id), 10);
    await db
      .update(shares)
      .set({ playsCount: sql`${shares.playsCount} + 1` })
      .where(eq(shares.id, shareId));
    return res.json({ success: true, data: null });
  } catch (err) {
    console.error('[plaza] play error:', err);
    return res.status(500).json({ success: false, error: '记录播放失败' });
  }
});

export default router;

// 引用 users 避免 TS 未使用报错（用户名已冗余存储）
void users;
