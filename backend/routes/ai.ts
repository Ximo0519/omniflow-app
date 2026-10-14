import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { createAIService } from '../services/aiService';

const router = Router();

/**
 * DeepSeek 提示词润色：把用户的中文简短描述扩写为 Suno 可用的英文提示词
 * 供前端「AI 润色」按钮与音乐生成流程使用
 */
router.post('/optimize-prompt', requireAuth, async (req: Request, res: Response) => {
  try {
    const { prompt, style, mood } = req.body;
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ success: false, error: '请输入音乐描述' });
    }

    const ai = createAIService();
    const systemPrompt = `You are a professional Suno AI music prompt engineer. Based on the user's Chinese music description, produce:
1. "title": a poetic Chinese music title (2-8 characters)
2. "sunoPrompt": a vivid English music prompt for Suno (1-3 sentences, describing genre, instruments, tempo, atmosphere)
3. "tags": comma-separated English style tags (3-6 tags, e.g. "lofi, jazz, piano, relaxing")
Respond ONLY with JSON: {"title":"...","sunoPrompt":"...","tags":"..."}`;

    const userMessage = `描述: ${String(prompt).trim()}\n风格: ${style || '不限'}\n情绪: ${mood || '不限'}`;

    const raw = await ai.chat(userMessage, systemPrompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res
        .status(502)
        .json({ success: false, error: '润色结果解析失败，请重试' });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.json({
      success: true,
      data: {
        title: parsed.title || '未命名音乐',
        sunoPrompt: parsed.sunoPrompt || String(prompt).trim(),
        tags: parsed.tags || String(style || ''),
      },
    });
  } catch (error) {
    console.error('Optimize prompt error:', error);
    return res.status(500).json({ success: false, error: '提示词润色失败' });
  }
});

export default router;
