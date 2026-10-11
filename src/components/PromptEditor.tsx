import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  AlertCircle,
} from 'lucide-react';
import { ModelOption, ProviderInfo, SelectedModel } from '../shared/types.js';

interface PromptEditorProps {
  prompt: string;
  onChangePrompt: (val: string) => void;
  selectedModels: SelectedModel[];
  onToggleModel: (providerId: string, modelId: string) => void;
  providers: ProviderInfo[];
  onSubmit: () => void;
  onReset: () => void;
  isLoading: boolean;
  systemInstruction: string;
  onChangeSystemInstruction: (val: string) => void;
  temperature: number;
  onChangeTemperature: (val: number) => void;
  timeoutSec: number;
  onChangeTimeoutSec: (val: number) => void;
  isDemoMode: boolean;
}

const PRESET_PROMPTS = [
  {
    label: 'Code',
    title: 'TypeScript LRU Cache',
    prompt:
      'Write a clean, production-grade generic LRU Cache in TypeScript with get(), put(), and capacity eviction. Include time complexity comments for each method.',
  },
  {
    label: 'Reasoning',
    title: 'Monty Hall Problem',
    prompt:
      'Explain the Monty Hall problem to a skeptical mathematician. Prove why switching doors gives a 2/3 probability of winning using Bayes’ Theorem and an intuitive table.',
  },
  {
    label: 'Architecture',
    title: 'Microservices vs Monolith',
    prompt:
      'Provide a balanced technical evaluation comparing Microservices vs Modular Monolith architecture. Break down latency overhead, operational complexity, and team scaling trade-offs.',
  },
  {
    label: 'Writing',
    title: 'Sci-Fi Hard Light Engine',
    prompt:
      'Write an evocative 150-word speculative fiction description of a spaceship engine that compresses light photons into propulsion thrust.',
  },
];

export const PromptEditor: React.FC<PromptEditorProps> = ({
  prompt,
  onChangePrompt,
  selectedModels,
  onToggleModel,
  providers,
  onSubmit,
  onReset,
  isLoading,
  systemInstruction,
  onChangeSystemInstruction,
  temperature,
  onChangeTemperature,
  timeoutSec,
  onChangeTimeoutSec,
  isDemoMode,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isLoading && prompt.trim().length > 0 && selectedModels.length > 0) {
        onSubmit();
      }
    }
  };

  // Flatten all models with provider information
  const availableModels: Array<{
    provider: ProviderInfo;
    model: ModelOption;
    isSelected: boolean;
  }> = [];

  providers.forEach((p) => {
    // If not demo mode, skip demo provider
    if (!isDemoMode && p.id === 'demo') return;

    p.models.forEach((m) => {
      const isSelected = selectedModels.some(
        (sm) => sm.providerId === p.id && sm.modelId === m.id
      );
      availableModels.push({
        provider: p,
        model: m,
        isSelected,
      });
    });
  });

  const maxChars = 12000;
  const charsUsed = prompt.length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden transition-colors">
      {/* Model Selection Row */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Selected Models for Comparison
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              ({selectedModels.length} of 4 selected)
            </span>
          </div>
          {selectedModels.length === 0 && (
            <span className="text-xs text-rose-500 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Select at least one model
            </span>
          )}
        </div>

        {/* Model Selection Buttons */}
        <div className="flex flex-wrap gap-2">
          {availableModels.map(({ provider, model, isSelected }) => {
            const isClickable = provider.isConfigured || provider.id === 'demo';

            return (
              <button
                key={`${provider.id}-${model.id}`}
                type="button"
                onClick={() => {
                  if (isClickable) {
                    onToggleModel(provider.id, model.id);
                  }
                }}
                disabled={!isClickable}
                className={`group text-left px-3 py-1.5 rounded-lg border text-xs transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-600/70 text-indigo-900 dark:text-indigo-200 font-medium shadow-xs'
                    : isClickable
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    : 'bg-slate-100/60 dark:bg-slate-800/30 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-80'
                }`}
                title={
                  !isClickable
                    ? `${provider.name} is not connected. Requires ${provider.envKeyName} in server environment.`
                    : `${model.name} (${model.contextWindow || 'Standard context'})`
                }
              >
                <div
                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : isClickable
                      ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800'
                  }`}
                >
                  {isSelected && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span>{model.name}</span>
                    {provider.id === 'demo' && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        (Demo)
                      </span>
                    )}
                    {!isClickable && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        (Needs Key)
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {provider.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Prompts Bar */}
      <div className="px-4 py-2 border-b border-slate-200/70 dark:border-slate-800/70 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          Benchmarks:
        </span>
        {PRESET_PROMPTS.map((preset) => (
          <button
            key={preset.title}
            type="button"
            onClick={() => onChangePrompt(preset.prompt)}
            className="px-2.5 py-1 rounded text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors whitespace-nowrap"
          >
            {preset.title}
          </button>
        ))}
      </div>

      {/* Prompt Textarea */}
      <div className="p-4">
        <label htmlFor="prompt-input" className="sr-only">
          Prompt Input
        </label>
        <textarea
          id="prompt-input"
          value={prompt}
          onChange={(e) => onChangePrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter prompt to evaluate across selected models simultaneously... (e.g., benchmark coding capabilities, reasoning speed, or creative nuance)"
          rows={4}
          className="w-full resize-y text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden leading-relaxed"
        />

        {/* Character count & shortcut info */}
        <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <span className="hidden sm:inline">
            Press <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px]">⌘+Enter</kbd> to run comparison
          </span>
          <span className="sm:hidden">Run with button below</span>
          <span className={`font-mono ${charsUsed > maxChars ? 'text-rose-500 font-semibold' : ''}`}>
            {charsUsed.toLocaleString()} / {maxChars.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Advanced Drawer (Collapsible) */}
      {showAdvanced && (
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 text-xs space-y-3 animate-in fade-in duration-100">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              System Instruction (Optional)
            </label>
            <input
              type="text"
              value={systemInstruction}
              onChange={(e) => onChangeSystemInstruction(e.target.value)}
              placeholder="e.g. You are an expert code reviewer prioritizing security and performance."
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
                <span>Temperature</span>
                <span className="font-mono">{temperature}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => onChangeTemperature(parseFloat(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0.0 (Precise)</span>
                <span>1.0 (Creative)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium mb-1">
                <span>Per-Provider Timeout</span>
                <span className="font-mono">{timeoutSec}s</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={timeoutSec}
                onChange={(e) => onChangeTimeoutSec(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>5s</span>
                <span>60s max</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        {/* Toggle Advanced */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Parameters</span>
          {showAdvanced ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={isLoading || (!prompt && selectedModels.length === 0)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading || prompt.trim().length === 0 || selectedModels.length === 0}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Compare Responses</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
