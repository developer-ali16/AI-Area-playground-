import { ModelOption } from '../../shared/types.js';
import { AIProvider, GenerateOptions, ProviderError, ProviderGenerateResult } from './base.js';

/**
 * Anthropic Claude Provider Adapter (Pre-architected for Phase 2).
 * Accurately reports missing configuration if ANTHROPIC_API_KEY is not present.
 */
export class AnthropicProvider implements AIProvider {
  public readonly id = 'anthropic';
  public readonly name = 'Anthropic Claude';
  public readonly description = 'Anthropic Claude models specializing in nuanced reasoning, coding, and comprehension';
  public readonly envKeyName = 'ANTHROPIC_API_KEY';

  public isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 0);
  }

  public getSupportedModels(): ModelOption[] {
    const configured = this.isConfigured();
    return [
      {
        id: 'claude-3-5-sonnet',
        providerId: 'anthropic',
        name: 'Claude 3.5 Sonnet',
        description: 'Anthropic flagship model for reasoning and synthesis (pre-wired architecture).',
        contextWindow: '200K tokens',
        isConfigured: configured,
        isDefault: false,
        statusMessage: configured ? 'Configured & Active' : 'Not Connected (Awaiting ANTHROPIC_API_KEY)',
      },
      {
        id: 'claude-3-5-haiku',
        providerId: 'anthropic',
        name: 'Claude 3.5 Haiku',
        description: 'Fast, compact model for rapid queries (pre-wired architecture).',
        contextWindow: '200K tokens',
        isConfigured: configured,
        isDefault: false,
        statusMessage: configured ? 'Configured & Active' : 'Not Connected (Awaiting ANTHROPIC_API_KEY)',
      },
    ];
  }

  public async generateResponse(options: GenerateOptions): Promise<ProviderGenerateResult> {
    if (!this.isConfigured()) {
      throw new ProviderError(
        'Anthropic provider is not configured. Set ANTHROPIC_API_KEY in server environment to enable genuine Claude comparisons.',
        'NOT_CONFIGURED',
        this.id,
        503
      );
    }

    // Direct fetch to Anthropic API if key is supplied
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY!;
      const controller = new AbortController();
      const signal = options.signal || controller.signal;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: options.model,
          max_tokens: 1024,
          messages: [{ role: 'user', content: options.prompt }],
          system: options.systemInstruction || undefined,
          temperature: options.temperature ?? 0.7,
        }),
        signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 429) {
          throw new ProviderError('Anthropic rate limit reached.', 'RATE_LIMITED', this.id, 429);
        }
        throw new ProviderError(`Anthropic error (${res.status}): ${errorText.slice(0, 200)}`, 'API_ERROR', this.id, res.status);
      }

      const data = (await res.json()) as {
        content: Array<{ text: string }>;
        usage?: { input_tokens: number; output_tokens: number };
      };

      const text = data.content?.[0]?.text || '';
      return {
        text,
        usage: data.usage
          ? {
              promptTokens: data.usage.input_tokens,
              completionTokens: data.usage.output_tokens,
              totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
            }
          : undefined,
      };
    } catch (err: unknown) {
      if (err instanceof ProviderError) throw err;
      throw new ProviderError(`Anthropic request failed: ${(err as Error).message}`, 'API_ERROR', this.id, 502);
    }
  }
}

/**
 * OpenAI Provider Adapter (Pre-architected for Phase 2).
 * Accurately reports missing configuration if OPENAI_API_KEY is not present.
 */
export class OpenAIProvider implements AIProvider {
  public readonly id = 'openai';
  public readonly name = 'OpenAI';
  public readonly description = 'OpenAI GPT models for general problem solving, math, and structured text';
  public readonly envKeyName = 'OPENAI_API_KEY';

  public isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0);
  }

  public getSupportedModels(): ModelOption[] {
    const configured = this.isConfigured();
    return [
      {
        id: 'gpt-4o',
        providerId: 'openai',
        name: 'GPT-4o',
        description: 'Omni flagship model for cross-domain synthesis and coding (pre-wired architecture).',
        contextWindow: '128K tokens',
        isConfigured: configured,
        isDefault: false,
        statusMessage: configured ? 'Configured & Active' : 'Not Connected (Awaiting OPENAI_API_KEY)',
      },
      {
        id: 'gpt-4o-mini',
        providerId: 'openai',
        name: 'GPT-4o Mini',
        description: 'Lightweight model for cost-effective tasks (pre-wired architecture).',
        contextWindow: '128K tokens',
        isConfigured: configured,
        isDefault: false,
        statusMessage: configured ? 'Configured & Active' : 'Not Connected (Awaiting OPENAI_API_KEY)',
      },
    ];
  }

  public async generateResponse(options: GenerateOptions): Promise<ProviderGenerateResult> {
    if (!this.isConfigured()) {
      throw new ProviderError(
        'OpenAI provider is not configured. Set OPENAI_API_KEY in server environment to enable genuine GPT comparisons.',
        'NOT_CONFIGURED',
        this.id,
        503
      );
    }

    // Direct fetch to OpenAI API if key is supplied
    try {
      const apiKey = process.env.OPENAI_API_KEY!;
      const controller = new AbortController();
      const signal = options.signal || controller.signal;

      const messages: Array<{ role: string; content: string }> = [];
      if (options.systemInstruction) {
        messages.push({ role: 'system', content: options.systemInstruction });
      }
      messages.push({ role: 'user', content: options.prompt });

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: options.model,
          messages,
          temperature: options.temperature ?? 0.7,
        }),
        signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 429) {
          throw new ProviderError('OpenAI rate limit reached.', 'RATE_LIMITED', this.id, 429);
        }
        throw new ProviderError(`OpenAI error (${res.status}): ${errorText.slice(0, 200)}`, 'API_ERROR', this.id, res.status);
      }

      const data = (await res.json()) as {
        choices: Array<{ message: { content: string } }>;
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      };

      const text = data.choices?.[0]?.message?.content || '';
      return {
        text,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (err: unknown) {
      if (err instanceof ProviderError) throw err;
      throw new ProviderError(`OpenAI request failed: ${(err as Error).message}`, 'API_ERROR', this.id, 502);
    }
  }
}

/**
 * Explicit Demo Provider.
 * Strictly used ONLY when client explicitly requests Demo Mode to test multi-column layout.
 * Every response clearly announces itself as a simulated demo benchmark.
 */
export class DemoProvider implements AIProvider {
  public readonly id = 'demo';
  public readonly name = 'Demo Benchmark Simulator';
  public readonly description = 'Clearly-labeled offline benchmark simulator for evaluating multi-column UI behavior without secondary API keys';
  public readonly envKeyName = 'NONE (Always available in demo mode)';

  public isConfigured(): boolean {
    return true;
  }

  public getSupportedModels(): ModelOption[] {
    return [
      {
        id: 'demo-analytical-model',
        providerId: 'demo',
        name: 'Demo Benchmark A (Analytical)',
        description: 'Simulated high-depth analytical model response.',
        contextWindow: 'Demo 32K',
        isConfigured: true,
        badge: 'Demo Mode',
        statusMessage: 'Ready (Demo Simulation)',
      },
      {
        id: 'demo-concise-model',
        providerId: 'demo',
        name: 'Demo Benchmark B (Concise)',
        description: 'Simulated terse executive summary response.',
        contextWindow: 'Demo 16K',
        isConfigured: true,
        badge: 'Demo Mode',
        statusMessage: 'Ready (Demo Simulation)',
      },
    ];
  }

  public async generateResponse(options: GenerateOptions): Promise<ProviderGenerateResult> {
    // Simulate real network delay (500ms - 1200ms)
    const delay = 600 + Math.floor(Math.random() * 400);
    await new Promise((resolve) => setTimeout(resolve, delay));

    const promptPreview = options.prompt.length > 60 ? options.prompt.slice(0, 60) + '...' : options.prompt;
    const isConcise = options.model.includes('concise');

    const demoHeader =
      `> [!NOTE]\n` +
      `> **[DEMO BENCHMARK PREVIEW]**\n` +
      `> This is an offline simulated response generated strictly for evaluating AI Arena's side-by-side comparison UI while only the Gemini provider is connected live.\n\n`;

    const text = isConcise
      ? `${demoHeader}### Summary for: "${promptPreview}"\n\n` +
        `• **Key Takeaway**: Prompt evaluated successfully across parameters.\n` +
        `• **Efficiency**: Low latency model profile simulated.\n` +
        `• **Architectural Note**: Genuine multi-provider comparison is activated when secondary API keys (Anthropic/OpenAI) are configured in the environment.`
      : `${demoHeader}### In-Depth Analysis for: "${promptPreview}"\n\n` +
        `1. **Structural Breakdown**:\n` +
        `   This response demonstrates side-by-side card rendering, duration tracking, and token counting in AI Arena.\n\n` +
        `2. **Comparative Evaluation**:\n` +
        `   Notice how latency, token breakdown, and copy actions operate independently per column.\n\n` +
        `3. **Production Readiness**:\n` +
        `   The Gemini integration uses your live GEMINI_API_KEY, while this benchmark card lets you explore 2-column or 3-column desktop viewports simultaneously.`;

    const promptTokens = Math.max(12, Math.round(options.prompt.length / 4));
    const completionTokens = Math.round(text.length / 4);

    return {
      text,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    };
  }
}
