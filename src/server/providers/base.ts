import { ModelOption, ProviderId, TokenUsage } from '../../shared/types.js';

export interface GenerateOptions {
  prompt: string;
  model: string;
  signal?: AbortSignal;
  systemInstruction?: string;
  temperature?: number;
}

export interface ProviderGenerateResult {
  text: string;
  usage?: TokenUsage;
}

export interface AIProvider {
  id: ProviderId;
  name: string;
  description: string;
  envKeyName: string;
  isConfigured(): boolean;
  getSupportedModels(): ModelOption[];
  generateResponse(options: GenerateOptions): Promise<ProviderGenerateResult>;
}

export class ProviderError extends Error {
  public readonly code: 'NOT_CONFIGURED' | 'TIMEOUT' | 'RATE_LIMITED' | 'API_ERROR' | 'INVALID_MODEL';
  public readonly providerId: string;
  public readonly status: number;

  constructor(
    message: string,
    code: 'NOT_CONFIGURED' | 'TIMEOUT' | 'RATE_LIMITED' | 'API_ERROR' | 'INVALID_MODEL',
    providerId: string,
    status = 500
  ) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.providerId = providerId;
    this.status = status;
  }
}
