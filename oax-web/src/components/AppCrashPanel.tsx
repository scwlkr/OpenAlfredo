'use client';

import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface AppCrashPanelProps {
  title: string;
  description: string;
  detail?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export default function AppCrashPanel({
  title,
  description,
  detail,
  primaryActionLabel = 'Try again',
  onPrimaryAction,
  secondaryActionLabel = 'Reload app',
  onSecondaryAction,
}: AppCrashPanelProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--oax-paper)] px-6 py-16 text-[var(--oax-ink)]">
      <div className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-[var(--oax-edge)] bg-[var(--oax-shell)] shadow-[0_32px_80px_-40px_var(--oax-shadow)]">
        <div className="border-b border-[var(--oax-edge)] bg-[linear-gradient(135deg,rgba(185,138,61,0.16),rgba(47,107,79,0.08))] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(185,138,61,0.18)] text-[var(--oax-brass)]">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--oax-muted)]">Runtime Fault</p>
              <h1 className="text-xl font-semibold">{title}</h1>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          <p className="max-w-xl text-sm leading-6 text-[var(--oax-muted)]">{description}</p>

          {detail ? (
            <div className="rounded-2xl border border-[var(--oax-edge)] bg-[#f6efdf] p-4">
              <p className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--oax-muted)]">Technical Detail</p>
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5 text-[var(--oax-ink)]">
                {detail}
              </pre>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {onPrimaryAction ? (
              <button
                onClick={onPrimaryAction}
                className="inline-flex items-center gap-2 rounded-2xl bg-[var(--oax-basil)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--oax-basil-strong)]"
              >
                <RotateCcw className="h-4 w-4" />
                {primaryActionLabel}
              </button>
            ) : null}
            {onSecondaryAction ? (
              <button
                onClick={onSecondaryAction}
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--oax-edge)] bg-[var(--oax-paper)] px-4 py-2 text-sm font-medium text-[var(--oax-ink)] transition-colors hover:bg-[#efe5d1]"
              >
                <RefreshCw className="h-4 w-4" />
                {secondaryActionLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
