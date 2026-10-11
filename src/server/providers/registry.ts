import {
  CompareRequest,
  CompareResponse,
  ModelResult,
  ModelStatus,
  ProviderId,
  ProviderInfo,
  SelectedModel,
} from '../../shared/types.js';
import { AIProvider, ProviderError } from './base.js';
import { DemoProvider, AnthropicProvider, OpenAIProvider } from './future-providers.js';
import { GeminiProvider } from './gemini.js';

export class ProviderRegistry {
  private providers = new Map<ProviderId, AIProvider>();

  constructor() {
    this.register(new GeminiProvider());
    this.register(new AnthropicProvider());
    this.register(new OpenAIProvider());
    this.register(new DemoProvider());
  }

  public register(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: ProviderId | string): AIProvider | undefined {
    return this.providers.get(id as ProviderId);
  }

  public getProvidersInfo(includeDemo = true): ProviderInfo[] {
    const list: ProviderInfo[] = [];

    for (const provider of this.providers.values()) {
      if (!includeDemo && provider.id === 'demo') {
        continue;
      }

      list.push({
        id: provider.id,
        name: provider.name,
        description: provider.description,
        isConfigured: provider.isConfigured(),
        envKeyName: provider.envKeyName,
        models: provider.getSupportedModels(),
        statusMessage: provider.isConfigured()
          ? 'Connected & Active'
          : `Requires ${provider.envKeyName} in server environment`,
      });
    }

    return list;
  }

  /**
   * Validates a comparison request
   */
  public validateRequest(body: unknown): { error?: string; request?: CompareRequest } {
    if (!body || typeof body !== 'object') {
      return { error: 'Request body must be a valid JSON object.' };
    }

    const payload = body as Partial<CompareRequest>;

    if (typeof payload.prompt !== 'string') {
      return { error: 'Prompt is required and must be a string.' };
    }

    const trimmedPrompt = payload.prompt.trim();
    if (trimmedPrompt.length === 0) {
      return { error: 'Prompt cannot be empty.' };
    }

    if (trimmedPrompt.length > 12000) {
      return { error: 'Prompt exceeds maximum character limit of 12,000 characters.' };
    }

    if (!Array.isArray(payload.models) || payload.models.length === 0) {
      return { error: 'At least one model must be selected for comparison.' };
    }

    if (payload.models.length > 4) {
      return { error: 'Maximum 4 models can be compared concurrently in a single run.' };
    }

    // Validate each selected model
    const validatedModels: SelectedModel[] = [];
    for (const item of payload.models) {
      if (!item || typeof item !== 'object') {
        return { error: 'Each model selection item must be a valid object.' };
      }
      if (!item.providerId || typeof item.providerId !== 'string') {
        return { error: 'Each selected model must have a valid providerId.' };
      }
      if (!item.modelId || typeof item.modelId !== 'string') {
        return { error: 'Each selected model must have a valid modelId.' };
      }

      const provider = this.getProvider(item.providerId);
      if (!provider) {
        return { error: `Provider '${item.providerId}' is unrecognized.` };
      }

      // Check if model belongs to provider
      const supported = provider.getSupportedModels().map((m) => m.id);
      if (!supported.includes(item.modelId)) {
        return {
          error: `Model '${item.modelId}' is not supported by provider '${item.providerId}'. Supported: ${supported.join(', ')}`,
        };
      }

      validatedModels.push({
        providerId: item.providerId,
        modelId: item.modelId,
      });
    }

    const timeoutMs =
      typeof payload.timeoutMs === 'number' && payload.timeoutMs > 0
        ? Math.min(payload.timeoutMs, 60000)
        : 25000;

    return {
      request: {
        prompt: trimmedPrompt,
        models: validatedModels,
        isDemoMode: Boolean(payload.isDemoMode),
        timeoutMs,
        systemInstruction: typeof payload.systemInstruction === 'string' ? payload.systemInstruction : undefined,
        temperature: typeof payload.temperature === 'number' ? payload.temperature : undefined,
      },
    };
  }

  /**
   * Executes comparison concurrently across all selected models with timeouts and error containment.
   */
  public async compare(request: CompareRequest): Promise<CompareResponse> {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    const tasks = request.models.map((selected) => this.runSingleModel(selected, request));

    const settled = await Promise.allSettled(tasks);

    const results: ModelResult[] = settled.map((outcome, idx) => {
      const selected = request.models[idx];
      const provider = this.getProvider(selected.providerId);
      const providerName = provider?.name || selected.providerId;
      const modelMeta = provider?.getSupportedModels().find((m) => m.id === selected.modelId);
      const modelName = modelMeta?.name || selected.modelId;

      if (outcome.status === 'fulfilled') {
        return outcome.value;
      }

      // Unexpected unhandled rejection fallback
      const errorMsg = outcome.reason instanceof Error ? outcome.reason.message : 'Unknown execution failure';
      return {
        providerId: selected.providerId,
        providerName,
        modelId: selected.modelId,
        modelName,
        status: 'error' as ModelStatus,
        durationMs: 0,
        error: errorMsg,
        isDemo: selected.providerId === 'demo',
        timestamp: new Date().toISOString(),
      };
    });

    const totalDurationMs = Math.round(performance.now() - startTime);

    return {
      prompt: request.prompt,
      timestamp,
      totalDurationMs,
      results,
      isDemoMode: Boolean(request.isDemoMode),
    };
  }

  /**
   * Executes a single provider/model with timeout racing and detailed telemetry.
   */
  public async runSingleModel(selected: SelectedModel, request: CompareRequest): Promise<ModelResult> {
    const provider = this.getProvider(selected.providerId);
    const providerName = provider?.name || selected.providerId;
    const modelMeta = provider?.getSupportedModels().find((m) => m.id === selected.modelId);
    const modelName = modelMeta?.name || selected.modelId;
    const isDemo = selected.providerId === 'demo';

    if (!provider) {
      return {
        providerId: selected.providerId,
        providerName,
        modelId: selected.modelId,
        modelName,
        status: 'error',
        durationMs: 0,
        error: `Provider '${selected.providerId}' not registered`,
        isDemo,
        timestamp: new Date().toISOString(),
      };
    }

    if (!provider.isConfigured() && !isDemo) {
      return {
        providerId: selected.providerId,
        providerName,
        modelId: selected.modelId,
        modelName,
        status: 'not_configured',
        durationMs: 0,
        error: `${providerName} is not configured. Set ${provider.envKeyName} in server environment or Secrets to enable genuine responses.`,
        isDemo: false,
        timestamp: new Date().toISOString(),
      };
    }

    const itemStartTime = performance.now();
    const timeoutMs = request.timeoutMs || 25000;

    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;

    try {
      // Race execution with timeout
      const generatePromise = provider.generateResponse({
        prompt: request.prompt,
        model: selected.modelId,
        signal: controller.signal,
        systemInstruction: request.systemInstruction,
        temperature: request.temperature,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(
            new ProviderError(
              `Request timed out after ${timeoutMs / 1000}s`,
              'TIMEOUT',
              selected.providerId,
              504
            )
          );
        }, timeoutMs);
      });

      const outcome = await Promise.race([generatePromise, timeoutPromise]);
      if (timer) clearTimeout(timer);

      const durationMs = Math.round(performance.now() - itemStartTime);

      return {
        providerId: selected.providerId,
        providerName,
        modelId: selected.modelId,
        modelName,
        status: 'success',
        text: outcome.text,
        durationMs,
        usage: outcome.usage,
        isDemo,
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      if (timer) clearTimeout(timer);
      const durationMs = Math.round(performance.now() - itemStartTime);

      let status: ModelStatus = 'error';
      let errorMsg = 'An unexpected error occurred while requesting model response.';

      if (err instanceof ProviderError) {
        if (err.code === 'TIMEOUT') status = 'timeout';
        else if (err.code === 'RATE_LIMITED') status = 'rate_limited';
        else if (err.code === 'NOT_CONFIGURED') status = 'not_configured';
        else status = 'error';

        errorMsg = err.message;
      } else if (err instanceof Error) {
        if (err.name === 'AbortError' || err.message.toLowerCase().includes('timeout') || err.message.toLowerCase().includes('aborted')) {
          status = 'timeout';
          errorMsg = `Request timed out after ${timeoutMs / 1000}s.`;
        } else {
          errorMsg = err.message;
        }
      }

      return {
        providerId: selected.providerId,
        providerName,
        modelId: selected.modelId,
        modelName,
        status,
        durationMs,
        error: errorMsg,
        isDemo,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
