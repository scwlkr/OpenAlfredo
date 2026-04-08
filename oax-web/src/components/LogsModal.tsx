'use client';

import { Terminal, X } from 'lucide-react';

interface LogsModalProps {
  logs: any[];
  surfaceCard: string;
  onClose: () => void;
}

export default function LogsModal({ logs, surfaceCard, onClose }: LogsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,21,18,0.55)] p-6 backdrop-blur-sm">
      <div className={`flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] ${surfaceCard}`}>
        <div className="flex items-center justify-between border-b border-[var(--oax-edge)] p-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-[var(--oax-basil)]" />
            <h2 className="font-semibold text-[var(--oax-ink)]">Runtime Logs</h2>
          </div>
          <button onClick={onClose} className="text-[var(--oax-muted)] hover:text-[var(--oax-ink)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2">
          {logs.map((log, i) => (
            <div
              key={i}
              className={`rounded-2xl p-3 ${
                log.level === 'ERROR'
                  ? 'bg-red-950/10 text-red-700'
                  : 'bg-[#f7f1e5] text-[var(--oax-ink)]'
              }`}
            >
              <span className="text-[var(--oax-muted)]">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
              <span className={`font-bold ${log.level === 'ERROR' ? 'text-red-800' : 'text-[var(--oax-basil)]'}`}>{log.event}</span>{' '}
              <span className="text-[var(--oax-muted)]">{JSON.stringify(log.data)}</span>
            </div>
          ))}
          {logs.length === 0 && <div className="py-8 text-center text-[var(--oax-muted)]">No logs available for today.</div>}
        </div>
      </div>
    </div>
  );
}
