import { Router, Request, Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db, isDbConfigured } from '../db';
import { music, users } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { createAIService } from '../services/aiService';
import {
  createGenerationTask,
  getTaskResult,
  downloadAudio,
  isSunoConfigured,
} from '../services/sunoService';
import { uploadAudio, deleteAudio, getDownloadUrl, isR2Configured } from '../services/r2Service';

const router = Router();

// ============ 内部工具 ============

/** 调 DeepSeek 把用户描述扩写为 Suno 可用的英文提示词 */
async function optimizePrompt(
  prompt: string,
  style: string,
  mood: string,
): Promise<{ title: string; sunoPrompt: string; tags: string }> {
  const ai = createAIService();
  const systemPrompt = `You are a professional Suno AI music prompt engineer. Based on the user's Chinese music description, produce:
1. "title": a poetic Chinese music title (2-8 characters)
2. "sunoPrompt": a vivid English music prompt for Suno (1-3 sentences, describing genre, instruments, tempo, atmosphere)
3. "tags": comma-separated English style tags (3-6 tags, e.g. "lofi, jazz, piano, relaxing")
Respond ONLY with JSON: {"title":"...","sunoPrompt":"...","tags":"..."}`;

  const userMessage = `描述: ${prompt}\n风格: ${style || '不限'}\n情绪: ${mood || '不限'}`;

  const raw = await ai.chat(userMessage, systemPrompt);
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || '未命名音乐',
        sunoPrompt: parsed.sunoPrompt || prompt,
        tags: parsed.tags || style || '',
      };
    }
  } catch {
    // 解析失败走兜底
  }
  return { title: '未命名音乐', sunoPrompt: prompt, tags: style || '' };
}

/**
 * 后台生成任务：提交 Suno → 轮询 → 下载音频 → 转存 R2 → 更新数据库
 * 进程内异步执行，不阻塞请求
 */
async function runGeneration(musicId: number, userId: number) {
  const fail = async (reason: string) => {
    console.error(`[music:${musicId}] 生成失败: ${reason}`);
    await db
      .update(music)
      .set({ status: 'failed', failReason: reason.slice(0, 500) })
      .where(eq(music.id, musicId));
  };

  try {
    const rows = await db.select().from(music).where(eq(music.id, musicId)).limit(1);
    const record = rows[0];
    if (!record || !record.sunoTaskId) {
      return fail('记录或任务 ID 不存在');
    }

    // 轮询：每 6 秒一次，最多 6 分钟
    const MAX_POLLS = 60;
    let clip = null;
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, 6000));

      const result = await getTaskResult(record.sunoTaskId);
      if (result.status === 'completed' && result.clips.length > 0) {
        clip = result.clips[0];
        break;
      }
      if (result.status === 'failed') {
        return fail(result.failReason || 'Suno 生成失败');
      }
    }
    if (!clip?.audioUrl) {
      return fail('生成超时，请稍后重试');
    }

    // 无 R2 配置时直接使用代理平台的临时 URL（有时效，仅演示用）
    if (!isR2Configured()) {
      console.warn('[music] R2 未配置，直接使用 Suno 临时音频 URL');
      await db
        .update(music)
        .set({
          status: 'completed',
          audioUrl: clip.audioUrl,
          duration: clip.duration || null,
          completedAt: new Date(),
        })
        .where(eq(music.id, musicId));
      return;
    }

    // 下载并转存 R2
    const buffer = await downloadAudio(clip.audioUrl);
    const { key, publicUrl } = await uploadAudio(userId, buffer);

    await db
      .update(music)
      .set({
        status: 'completed',
        audioUrl: publicUrl,
        r2Key: key,
        duration: clip.duration || null,
        completedAt: new Date(),
      })
      .where(eq(music.id, musicId));

    console.log(`[music:${musicId}] 生成完成 → ${publicUrl}`);
  } catch (err) {
    await fail(err instanceof Error ? err.message : String(err));
  }
}

/** 数据库记录 → 前端格式 */
function toClient(r: typeof music.$inferSelect) {
  return {
    id: String(r.id),
    title: r.title,
    description: r.description,
    prompt: r.prompt,
    optimizedPrompt: r.optimizedPrompt,
    tags: r.tags,
    mood: r.mood,
    instrumental: !!r.instrumental,
    duration: r.duration,
    status: r.status,
    failReason: r.failReason,
    audioUrl: r.audioUrl,
    createdAt: r.createdAt,
  };
}

// ============ 路由 ============

/** 发起生成：扣配额 → DeepSeek 润色 → 提交 Suno → 返回记录（前端轮询状态） */
router.post('/generate', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!isDbConfigured()) {
      return res.status(503).json({ success: false, error: '数据库未配置' });
    }
    if (!isSunoConfigured()) {
      return res
        .status(503)
        .json({ success: false, error: '音乐生成服务未配置（SUNO_API_KEY）' });
    }

    const { prompt, style, mood, instrumental } = req.body;
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ success: false, error: '请输入音乐描述' });
    }

    const user = req.authUser!;
    if (user.quotaRemaining <= 0) {
      return res
        .status(429)
        .json({ success: false, error: '今日生成次数已用完，明天再来吧' });
    }

    // DeepSeek 润色（约 3-8 秒，同步等待，可让标题立即展示）
    let title = '未命名音乐';
    let sunoPrompt = String(prompt).trim();
    let tags = String(style || '');
    try {
      const optimized = await optimizePrompt(
        String(prompt).trim(),
        String(style || ''),
        String(mood || ''),
      );
      title = optimized.title;
      sunoPrompt = optimized.sunoPrompt;
      tags = optimized.tags;
    } catch (err) {
      console.warn('[music] DeepSeek 润色失败，使用原始描述:', err);
    }

    // 提交 Suno 任务
    const taskId = await createGenerationTask({
      prompt: sunoPrompt,
      title,
      instrumental: instrumental !== false,
    });

    // 建记录（先扣配额再提交，防并发超用）
    await db
      .update(users)
      .set({ quotaRemaining: user.quotaRemaining - 1 })
      .where(eq(users.id, user.id));

    const inserted = await db
      .insert(music)
      .values({
        userId: user.id,
        title,
        description: String(prompt).trim(),
        prompt: String(prompt).trim(),
        optimizedPrompt: sunoPrompt,
        tags,
        mood: String(mood || ''),
        instrumental: instrumental === false ? 0 : 1,
        status: 'generating',
        sunoTaskId: taskId,
      })
      .returning();

    const record = inserted[0];

    // 启动后台任务（不 await）
    void runGeneration(record.id, user.id);

    return res.json({
      success: true,
      data: {
        music: toClient(record),
        quotaRemaining: user.quotaRemaining - 1,
      },
    });
  } catch (err) {
    console.error('[music] generate error:', err);
    const msg = err instanceof Error ? err.message : '发起生成失败';
    return res.status(500).json({ success: false, error: msg });
  }
});

/** 我的音乐列表 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(music)
      .where(eq(music.userId, req.authUser!.id))
      .orderBy(desc(music.createdAt))
      .limit(200);
    return res.json({ success: true, data: rows.map(toClient) });
  } catch (err) {
    console.error('[music] list error:', err);
    return res.status(500).json({ success: false, error: '获取列表失败' });
  }
});

/** 单条状态（前端轮询用） */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(music)
      .where(
        and(
          eq(music.id, parseInt(String(req.params.id), 10)),
          eq(music.userId, req.authUser!.id),
        ),
      )
      .limit(1);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: '音乐不存在' });
    }
    return res.json({ success: true, data: toClient(rows[0]) });
  } catch (err) {
    console.error('[music] detail error:', err);
    return res.status(500).json({ success: false, error: '获取详情失败' });
  }
});

/** 重命名 */
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const title = String(req.body.title || '').trim().slice(0, 100);
    if (!title) {
      return res.status(400).json({ success: false, error: '标题不能为空' });
    }
    const updated = await db
      .update(music)
      .set({ title })
      .where(
        and(
          eq(music.id, parseInt(String(req.params.id), 10)),
          eq(music.userId, req.authUser!.id),
        ),
      )
      .returning();
    if (updated.length === 0) {
      return res.status(404).json({ success: false, error: '音乐不存在' });
    }
    return res.json({ success: true, data: toClient(updated[0]) });
  } catch (err) {
    console.error('[music] rename error:', err);
    return res.status(500).json({ success: false, error: '重命名失败' });
  }
});

/** 删除（同时删除 R2 文件） */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const rows = await db
      .select()
      .from(music)
      .where(and(eq(music.id, id), eq(music.userId, req.authUser!.id)))
      .limit(1);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: '音乐不存在' });
    }

    const record = rows[0];
    if (record.r2Key) {
      await deleteAudio(record.r2Key);
    }
    await db.delete(music).where(eq(music.id, id));

    return res.json({ success: true, data: { id: String(id) } });
  } catch (err) {
    console.error('[music] delete error:', err);
    return res.status(500).json({ success: false, error: '删除失败' });
  }
});

/** 下载：返回带附件头的 R2 签名 URL */
router.get('/:id/download', requireAuth, async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(music)
      .where(
        and(
          eq(music.id, parseInt(String(req.params.id), 10)),
          eq(music.userId, req.authUser!.id),
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
        .json({ success: false, error: '音乐尚未生成完成' });
    }

    // 有 R2 Key 用签名 URL（带下载文件名）；否则直接回临时 URL
    if (record.r2Key && isR2Configured()) {
      const url = await getDownloadUrl(record.r2Key, `${record.title}.mp3`);
      return res.json({ success: true, data: { url } });
    }
    return res.json({ success: true, data: { url: record.audioUrl } });
  } catch (err) {
    console.error('[music] download error:', err);
    return res.status(500).json({ success: false, error: '获取下载链接失败' });
  }
});

export default router;
