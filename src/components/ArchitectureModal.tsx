import React from 'react';
import { X, CheckCircle2, CircleDashed, ShieldAlert, Cpu } from 'lucide-react';
import { ProviderInfo } from '../shared/types.js';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: ProviderInfo[];
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose,
  providers,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Provider Architecture & Connectivity
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              How AI Arena handles genuine multi-model concurrency & security
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Provider status cards */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Registered Provider Adapters
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {providers.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-indigo-500" />
                      {p.name}
                    </div>
                    {p.isConfigured ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 font-medium">
                        <CircleDashed className="w-3.5 h-3.5" />
                        Awaiting Key
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                    {p.description}
                  </p>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200/80 dark:border-slate-800">
                    Env Secret: {p.envKeyName}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Genuine Single-Provider Initial Phase Notice */}
          <div className="p-4 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs space-y-2">
            <div className="font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <span>Phase 1 Connectivity Model</span>
            </div>
            <p className="text-indigo-800 dark:text-indigo-300/90 leading-relaxed">
              Google Gemini is genuinely connected via the server-side{' '}
              <code className="font-mono font-semibold">@google/genai</code> SDK. You can compare
              different Gemini models (e.g.{' '}
              <span className="font-semibold">Gemini 3.8 Flash</span> vs{' '}
              <span className="font-semibold">Gemini 3.1 Flash Lite</span>) concurrently right now.
            </p>
            <p className="text-indigo-800 dark:text-indigo-300/90 leading-relaxed">
              To test the multi-column layout with 3+ models without configuring external Anthropic
              or OpenAI API keys, turn on <span className="font-semibold">Demo Comparison Mode</span>{' '}
              in the top bar. All demo responses are explicitly labeled as benchmark simulations.
            </p>
          </div>

          {/* Security Guarantee */}
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1.5">
            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-emerald-500" />
              Security Architecture
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              All LLM calls execute strictly on the server-side Express runtime. No API keys or
              bearer credentials ever enter frontend bundles, client responses, or browser code.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
