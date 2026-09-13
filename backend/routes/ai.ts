import { Router, Request, Response } from 'express';
import { createAIService } from '../services/aiService';

const router = Router();

// Streaming chat endpoint
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, systemPrompt } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const aiService = createAIService();
    const appLink = req.get('Referer') || req.get('Origin') || `${req.protocol}://${req.get('host')}`;

    await new Promise((resolve) => setTimeout(resolve, 50));

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let clientDisconnected = false;
    req.on('close', () => { clientDisconnected = true; });

    for await (const chunk of aiService.chatDefault(message, systemPrompt, appLink)) {
      if (clientDisconnected || res.writableEnded) break;
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }

    if (!res.writableEnded) {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error) {
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    } else {
      res.end();
    }
  }
});

// Music generation endpoint - uses AI to generate music description and simulate generation
router.post('/generate-music', async (req: Request, res: Response) => {
  try {
    const { prompt, style, duration, mood } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const aiService = createAIService();
    const appLink = req.get('Referer') || req.get('Origin') || `${req.protocol}://${req.get('host')}`;

    const systemPrompt = `You are a creative music title generator. Given a music description, style, mood, and duration, generate a creative Chinese music title (2-8 characters) and a brief description (1-2 sentences in Chinese). Respond in JSON format: {"title": "...", "description": "..."}. Keep the title poetic and evocative.`;

    const userMessage = `Music description: ${prompt}\nStyle: ${style || 'general'}\nMood: ${mood || 'neutral'}\nDuration: ${duration || 60} seconds\n\nGenerate a creative title and description for this music.`;

    const response = await aiService.chat(userMessage, systemPrompt, appLink);

    let title = '未命名音乐';
    let description = prompt;

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        title = parsed.title || title;
        description = parsed.description || description;
      }
    } catch {
      // fallback to defaults
    }

    // Return a simulated audio URL (in production this would call a real music generation API)
    const sampleAudioUrls = [
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    ];
    const audioUrl = sampleAudioUrls[Math.floor(Math.random() * sampleAudioUrls.length)];

    res.json({
      success: true,
      data: {
        id: `music_${Date.now()}`,
        title,
        description,
        audioUrl,
        style: style || 'general',
        mood: mood || 'neutral',
        duration: duration || 60,
        prompt,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Music generation error:', error);
    res.status(500).json({ success: false, error: 'Music generation failed' });
  }
});

export default router;
