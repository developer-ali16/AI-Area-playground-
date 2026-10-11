import {
  CompareRequest,
  CompareResponse,
  ModelResult,
  ProviderInfo,
  SingleRegenerateRequest,
} from '../shared/types.js';

export async function fetchProviders(includeDemo = true): Promise<ProviderInfo[]> {
  const res = await fetch(`/api/providers?includeDemo=${includeDemo}`);
  if (!res.ok) {
    throw new Error(`Failed to load providers (${res.status})`);
  }
  const data = (await res.json()) as { providers: ProviderInfo[] };
  return data.providers;
}

export async function checkHealth(): Promise<{
  status: string;
  configuredProviders: number;
  totalProviders: number;
}> {
  const res = await fetch('/api/health');
  if (!res.ok) {
    throw new Error(`Health check failed (${res.status})`);
  }
  return res.json();
}

export async function runComparison(payload: CompareRequest): Promise<CompareResponse> {
  const res = await fetch('/api/compare', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
    throw new Error(errorData.error || `Comparison failed with status ${res.status}`);
  }

  return res.json();
}

export async function regenerateModel(payload: SingleRegenerateRequest): Promise<ModelResult> {
  const res = await fetch('/api/regenerate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: `Regeneration failed (${res.status})` }));
    throw new Error(errorData.error || `Regeneration failed (${res.status})`);
  }

  return res.json();
}
