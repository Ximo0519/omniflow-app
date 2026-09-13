import axios from 'axios';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface StreamingChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

const DEFAULT_MODEL = 'deepseek-chat';

class AIService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.AI_API_KEY || process.env.OMNIFLOW_API_KEY || '';
    this.baseUrl =
      process.env.AI_API_BASE_URL || 'https://api.deepseek.com';
    this.model = process.env.AI_MODEL || DEFAULT_MODEL;
  }

  async chatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/chat/completions`,
        {
          ...request,
          stream: false,
          model: this.model,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error(`AI service request failed: ${error}`);
    }
  }

  async *chatCompletionStream(
    request: ChatCompletionRequest,
  ): AsyncGenerator<string, void, unknown> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/chat/completions`,
        {
          ...request,
          stream: true,
          model: this.model,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        },
      );

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed: StreamingChunk = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming chunk:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('AI Service Streaming Error:', error);
      throw new Error(`AI service streaming request failed: ${error}`);
    }
  }

  async chat(
    message: string,
    systemPrompt?: string,
    _appLink?: string,
  ): Promise<string> {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: message });

    const response = await this.chatCompletion({ messages });
    return response.choices[0]?.message?.content || '';
  }

  async *chatDefault(
    message: string,
    systemPrompt?: string,
    _appLink?: string,
  ): AsyncGenerator<string, void, unknown> {
    yield* this.chatStream(message, systemPrompt);
  }

  async chatWithHistory(messages: ChatMessage[]): Promise<string> {
    const response = await this.chatCompletion({ messages });
    return response.choices[0]?.message?.content || '';
  }

  async *chatStream(
    message: string,
    systemPrompt?: string,
    _appLink?: string,
  ): AsyncGenerator<string, void, unknown> {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: message });

    yield* this.chatCompletionStream({ messages });
  }
}

export function createAIService(): AIService {
  return new AIService();
}

export default AIService;
export type {
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
};
