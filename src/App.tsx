/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ComparisonHistoryItem,
  ModelResult,
  ProviderInfo,
  SelectedModel,
} from './shared/types.js';
import { fetchProviders, runComparison, regenerateModel } from './services/api.js';
import { Header } from './components/Header.js';
import { PromptEditor } from './components/PromptEditor.js';
import { ComparisonView } from './components/ComparisonView.js';
import { ArchitectureModal } from './components/ArchitectureModal.js';
import { HistoryDrawer } from './components/HistoryDrawer.js';
import { AlertTriangle, X } from 'lucide-react';

const STORAGE_KEY_THEME = 'ai_arena_theme';
const STORAGE_KEY_HISTORY = 'ai_arena_history_v1';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Providers & Models
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [selectedModels, setSelectedModels] = useState<SelectedModel[]>([
    { providerId: 'gemini', modelId: 'gemini-3.8-flash' },
    { providerId: 'gemini', modelId: 'gemini-3.1-flash-lite' },
  ]);

  // Prompt & Parameters
  const [prompt, setPrompt] = useState<string>('');
  const [systemInstruction, setSystemInstruction] = useState<string>('');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [timeoutSec, setTimeoutSec] = useState<number>(25);

  // Results & Loading
  const [results, setResults] = useState<ModelResult[]>([]);
  const [totalDurationMs, setTotalDurationMs] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [regeneratingMap, setRegeneratingMap] = useState<Record<string, boolean>>({});

  // Modals & Drawers
  const [isArchitectureModalOpen, setIsArchitectureModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  // History
  const [history, setHistory] = useState<ComparisonHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Apply theme class to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }, [theme]);

  // Load providers from backend
  const loadProviders = useCallback(async () => {
    try {
      const list = await fetchProviders(true);
      setProviders(list);
    } catch (err) {
      console.error('Failed to load providers:', err);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history.slice(0, 30)));
    } catch {
      // Storage quota safety
    }
  }, [history]);

  // Toggle Theme
  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Toggle Demo Mode
  const handleToggleDemoMode = () => {
    const nextMode = !isDemoMode;
    setIsDemoMode(nextMode);

    // If enabling demo mode, conveniently add a demo model so user immediately gets a multi-column comparison
    if (nextMode) {
      setSelectedModels((prev) => {
        const hasDemo = prev.some((m) => m.providerId === 'demo');
        if (!hasDemo && prev.length < 4) {
          return [...prev, { providerId: 'demo', modelId: 'demo-analytical-model' }];
        }
        return prev;
      });
    } else {
      // Remove demo models if turning off demo mode
      setSelectedModels((prev) => prev.filter((m) => m.providerId !== 'demo'));
    }
  };

  // Toggle selected model
  const handleToggleModel = (providerId: string, modelId: string) => {
    setSelectedModels((prev) => {
      const exists = prev.some((m) => m.providerId === providerId && m.modelId === modelId);
      if (exists) {
        return prev.filter((m) => !(m.providerId === providerId && m.modelId === modelId));
      } else {
        if (prev.length >= 4) {
          setGeneralError('Maximum 4 models can be compared concurrently.');
          return prev;
        }
        return [...prev, { providerId, modelId }];
      }
    });
  };

  // Submit Comparison
  const handleSubmit = async () => {
    if (!prompt.trim()) {
      setGeneralError('Please enter a prompt before running comparison.');
      return;
    }
    if (selectedModels.length === 0) {
      setGeneralError('Please select at least one model to compare.');
      return;
    }

    setGeneralError(null);
    setIsLoading(true);

    // Initialize loading placeholders so user gets instant visual feedback with live timer
    const loadingPlaceholders: ModelResult[] = selectedModels.map((selected) => {
      const provider = providers.find((p) => p.id === selected.providerId);
      const model = provider?.models.find((m) => m.id === selected.modelId);
      return {
        providerId: selected.providerId,
        providerName: provider?.name || selected.providerId,
        modelId: selected.modelId,
        modelName: model?.name || selected.modelId,
        status: 'loading',
        durationMs: 0,
        isDemo: selected.providerId === 'demo',
        timestamp: new Date().toISOString(),
      };
    });

    setResults(loadingPlaceholders);

    try {
      const response = await runComparison({
        prompt: prompt.trim(),
        models: selectedModels,
        isDemoMode,
        timeoutMs: timeoutSec * 1000,
        systemInstruction: systemInstruction.trim() || undefined,
        temperature,
      });

      setResults(response.results);
      setTotalDurationMs(response.totalDurationMs);

      // Save to history
      const historyItem: ComparisonHistoryItem = {
        id: `run-${Date.now()}`,
        timestamp: response.timestamp,
        prompt: response.prompt,
        isDemoMode: response.isDemoMode,
        results: response.results,
        totalDurationMs: response.totalDurationMs,
      };

      setHistory((prev) => [historyItem, ...prev]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Comparison request failed.';
      setGeneralError(msg);
      // Mark all in-flight placeholders as error
      setResults((prev) =>
        prev.map((item) =>
          item.status === 'loading'
            ? { ...item, status: 'error', error: msg }
            : item
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Single Model Regeneration
  const handleRegenerateModel = async (providerId: string, modelId: string) => {
    const key = `${providerId}-${modelId}`;
    setRegeneratingMap((prev) => ({ ...prev, [key]: true }));

    try {
      const singleResult = await regenerateModel({
        prompt: prompt.trim(),
        providerId,
        modelId,
        isDemoMode,
        timeoutMs: timeoutSec * 1000,
        systemInstruction: systemInstruction.trim() || undefined,
        temperature,
      });

      setResults((prev) =>
        prev.map((r) =>
          r.providerId === providerId && r.modelId === modelId ? singleResult : r
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to regenerate response.';
      setResults((prev) =>
        prev.map((r) =>
          r.providerId === providerId && r.modelId === modelId
            ? { ...r, status: 'error', error: msg }
            : r
        )
      );
    } finally {
      setRegeneratingMap((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Reset arena
  const handleReset = () => {
    setPrompt('');
    setResults([]);
    setTotalDurationMs(undefined);
    setGeneralError(null);
  };

  // Load from history
  const handleSelectHistoryItem = (item: ComparisonHistoryItem) => {
    setPrompt(item.prompt);
    setResults(item.results);
    setTotalDurationMs(item.totalDurationMs);
    setIsDemoMode(item.isDemoMode);
    setSelectedModels(
      item.results.map((r) => ({ providerId: r.providerId, modelId: r.modelId }))
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-150">
      {/* Header */}
      <Header
        theme={theme}
        onToggleTheme={handleToggleTheme}
        providers={providers}
        isDemoMode={isDemoMode}
        onToggleDemoMode={handleToggleDemoMode}
        onOpenArchitectureModal={() => setIsArchitectureModalOpen(true)}
        onOpenHistoryDrawer={() => setIsHistoryDrawerOpen(true)}
        historyCount={history.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* General Error Banner */}
        {generalError && (
          <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/20 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{generalError}</span>
            </div>
            <button
              type="button"
              onClick={() => setGeneralError(null)}
              className="p-1 hover:text-rose-950 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Demo Mode Notice Banner (if active) */}
        {isDemoMode && (
          <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
            <div>
              <span className="font-semibold">Demo Benchmark Mode Active:</span> Offline simulated
              benchmark models are selectable to test multi-column comparisons alongside live Gemini
              models.
            </div>
            <button
              type="button"
              onClick={handleToggleDemoMode}
              className="text-[11px] font-semibold underline hover:no-underline shrink-0"
            >
              Disable Demo
            </button>
          </div>
        )}

        {/* Prompt Input & Model Selector */}
        <section aria-label="Prompt Input and Configuration">
          <PromptEditor
            prompt={prompt}
            onChangePrompt={setPrompt}
            selectedModels={selectedModels}
            onToggleModel={handleToggleModel}
            providers={providers}
            onSubmit={handleSubmit}
            onReset={handleReset}
            isLoading={isLoading}
            systemInstruction={systemInstruction}
            onChangeSystemInstruction={setSystemInstruction}
            temperature={temperature}
            onChangeTemperature={setTemperature}
            timeoutSec={timeoutSec}
            onChangeTimeoutSec={setTimeoutSec}
            isDemoMode={isDemoMode}
          />
        </section>

        {/* Comparison Results Section */}
        <section aria-label="Model Comparison Results">
          <ComparisonView
            results={results}
            isLoading={isLoading}
            onRegenerateModel={handleRegenerateModel}
            regeneratingMap={regeneratingMap}
            onSelectPromptPreset={(presetText) => setPrompt(presetText)}
            totalDurationMs={totalDurationMs}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 bg-white/50 dark:bg-slate-900/40 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">AI Arena</span>
            <span aria-hidden="true">·</span>
            <span>Concurrent Model Evaluation Platform</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Google Gemini SDK Active</span>
            <span aria-hidden="true">·</span>
            <span>Zero Client-Exposed Credentials</span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <ArchitectureModal
        isOpen={isArchitectureModalOpen}
        onClose={() => setIsArchitectureModalOpen(false)}
        providers={providers}
      />

      <HistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        history={history}
        onSelectHistoryItem={handleSelectHistoryItem}
        onClearHistory={() => setHistory([])}
      />
    </div>
  );
}
