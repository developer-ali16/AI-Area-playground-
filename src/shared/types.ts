/**
 * Shared types for AI Arena client and server.
 */

export type ProviderId = 'gemini' | 'anthropic' | 'openai' | 'demo';

export type ModelStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'
  | 'timeout'
  | 'rate_limited'
  | 'not_configured';

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ModelOption {
  id: string;
  providerId: ProviderId;
  name: string;
  description: string;
  contextWindow?: string;
  isConfigured: boolean;
  isDefault?: boolean;
  badge?: string;
  statusMessage?: string;
}

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  description: string;
  isConfigured: boolean;
  envKeyName: string;
  models: ModelOption[];
  statusMessage: string;
  setupGuide?: string;
}

export interface SelectedModel {
  providerId: string;
  modelId: string;
}

export interface CompareRequest {
  prompt: string;
  models: SelectedModel[];
  isDemoMode?: boolean;
  timeoutMs?: number;
  systemInstruction?: string;
  temperature?: number;
}

export interface SingleRegenerateRequest {
  prompt: string;
  providerId: string;
  modelId: string;
  isDemoMode?: boolean;
  timeoutMs?: number;
  systemInstruction?: string;
  temperature?: number;
}

export interface ModelResult {
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
  status: ModelStatus;
  text?: string;
  durationMs: number;
  usage?: TokenUsage;
  error?: string;
  isDemo?: boolean;
  timestamp: string;
}

export interface CompareResponse {
  prompt: string;
  timestamp: string;
  totalDurationMs: number;
  results: ModelResult[];
  isDemoMode: boolean;
}

export interface ComparisonHistoryItem {
  id: string;
  timestamp: string;
  prompt: string;
  isDemoMode: boolean;
  results: ModelResult[];
  totalDurationMs: number;
}
