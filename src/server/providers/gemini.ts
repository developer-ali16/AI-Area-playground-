import { GoogleGenAI } from '@google/genai';
import { ModelOption } from '../../shared/types.js';
import { AIProvider, GenerateOptions, ProviderError, ProviderGenerateResult } from './base.js';

export class GeminiProvider implements AIProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini';
  public readonly description = 'Production multimodal reasoning & high-efficiency language models by Google';
  public readonly envKeyName = 'GEMINI_API_KEY';

  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ProviderError(
        'GEMINI_API_KEY is not configured in server environment. Set it in AI Studio Secrets or .env file.',
        'NOT_CONFIGURED',
        this.id,
        503
      );
    }

    if (!this.client) {
      this.client = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }

    return this.client;
  }

  public isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  }

  public getSupportedModels(): ModelOption[] {
    const configured = this.isConfigured();
    return [
      {
        id: 'gemini-3.8-flash',
        providerId: 'gemini',
        name: 'Gemini 3.8 Flash',
        description: 'Flagship workhorse for balanced latency, reasoning, coding, and conciseness.',
        contextWindow: '1M tokens',
        isConfigured: configured,
        isDefault: true,
        badge: 'Recommended',
        statusMessage: configured ? 'Active & Ready' : 'Awaiting GEMINI_API_KEY',
      },
      {
        id: 'gemini-3.1-flash-lite',
        providerId: 'gemini',
        name: 'Gemini 3.1 Flash Lite',
        description: 'Ultra-low latency model optimized for high-throughput and quick answers.',
        contextWindow: '1M tokens',
        isConfigured: configured,
        isDefault: false,
        badge: 'Ultra Fast',
        statusMessage: configured ? 'Active & Ready' : 'Awaiting GEMINI_API_KEY',
      },
    ];
  }

  public async generateResponse(options: GenerateOptions): Promise<ProviderGenerateResult> {
    const client = this.getClient();

    // Validate supported model
    const supported = this.getSupportedModels().map((m) => m.id);
    if (!supported.includes(options.model)) {
      throw new ProviderError(
        `Model '${options.model}' is not supported by GeminiProvider. Supported models: ${supported.join(', ')}`,
        'INVALID_MODEL',
        this.id,
        400
      );
    }

    try {
      const config: Record<string, unknown> = {};
      if (options.systemInstruction && options.systemInstruction.trim()) {
        config.systemInstruction = options.systemInstruction.trim();
      }
      if (typeof options.temperature === 'number') {
        config.temperature = options.temperature;
      }

      // Execute request with signal support if provided
      const responsePromise = client.models.generateContent({
        model: options.model,
        contents: options.prompt,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      // Handle signal cancellation if triggered
      if (options.signal) {
        if (options.signal.aborted) {
          throw new ProviderError('Request was aborted prior to execution.', 'TIMEOUT', this.id, 499);
        }
      }

      const response = await responsePromise;

      const text = response.text || '';
      if (!text && response.candidates?.[0]?.finishReason) {
        const reason = response.candidates[0].finishReason;
        throw new ProviderError(
          `Gemini returned empty response with finish reason: ${reason}`,
          'API_ERROR',
          this.id,
          502
        );
      }

      const usage = response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount,
            completionTokens: response.usageMetadata.candidatesTokenCount,
            totalTokens: response.usageMetadata.totalTokenCount,
          }
        : undefined;

      return {
        text,
        usage,
      };
    } catch (err: unknown) {
      if (err instanceof ProviderError) {
        throw err;
      }

      const errorObj = err as { message?: string; status?: number; code?: string | number };
      const rawMessage = errorObj.message || String(err);

      // Safe error classification without exposing internal secret signatures
      const sanitizedMessage = rawMessage.replace(/([?&]key=)[^& \n]+/gi, '$1[REDACTED]');

      if (
        sanitizedMessage.includes('429') ||
        sanitizedMessage.includes('RESOURCE_EXHAUSTED') ||
        sanitizedMessage.toLowerCase().includes('quota') ||
        sanitizedMessage.toLowerCase().includes('rate limit')
      ) {
        throw new ProviderError(
          'Gemini rate limit or quota exceeded. Please wait a few seconds before retrying.',
          'RATE_LIMITED',
          this.id,
          429
        );
      }

      if (
        sanitizedMessage.toLowerCase().includes('timeout') ||
        sanitizedMessage.toLowerCase().includes('deadline') ||
        sanitizedMessage.toLowerCase().includes('etimedout')
      ) {
        throw new ProviderError(
          'Gemini request timed out while generating response.',
          'TIMEOUT',
          this.id,
          504
        );
      }

      if (
        sanitizedMessage.includes('API_KEY_INVALID') ||
        sanitizedMessage.includes('invalid api key') ||
        sanitizedMessage.includes('PERMISSION_DENIED')
      ) {
        throw new ProviderError(
          'Invalid Gemini API key or permission denied. Verify GEMINI_API_KEY in Secrets.',
          'NOT_CONFIGURED',
          this.id,
          401
        );
      }

      throw new ProviderError(
        `Gemini API error: ${sanitizedMessage}`,
        'API_ERROR',
        this.id,
        502
      );
    }
  }
}
