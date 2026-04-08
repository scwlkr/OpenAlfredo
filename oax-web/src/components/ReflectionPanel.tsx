'use client';

import { useState, useEffect } from 'react';
import { Sparkles, X, RefreshCw } from 'lucide-react';
import { authFetch } from './authFetch';

interface ReflectionPanelProps {
  surfaceCard: string;
  onClose: () => void;
}

export default function ReflectionPanel({ surfaceCard, onClose }: ReflectionPanelProps) {
  const [reflection, setReflection] = useState('');
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    authFetch('/api/ambition')
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setReflection(data.reflection || '');
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const res = await authFetch('/api/ambition', { method: 'POST' });
      const data = await res.json();
      setReflection(data.reflection || '');
    } catch {}
    setRegenerating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,21,18,0.55)] p-6 backdrop-blur-sm">
      <div className={`flex h-[75vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] ${surfaceCard}`}>
        <div className="flex items-center justify-between border-b border-[var(--oax-edge)] p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--oax-brass)]" />
            <h2 className="font-semibold text-[var(--oax-ink)]">AMBITION</h2>
            <span className="ml-2 text-xs text-[var(--oax-muted)]">reflective morning brief</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={regenerate}
              disabled={regenerating}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--oax-edge)] bg-[rgba(47,107,79,0.08)] px-3 py-1.5 text-xs text-[var(--oax-basil)] transition-colors hover:bg-[rgba(47,107,79,0.14)] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
              {regenerating ? 'Generating...' : 'Regenerate'}
            </button>
            <button onClick={onClose} className="text-[var(--oax-muted)] hover:text-[var(--oax-ink)]">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-full items-center justify-center text-[var(--oax-muted)]">Loading reflection...</div>
          ) : reflection ? (
            <div className="prose prose-sm max-w-none text-[var(--oax-ink)]">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{reflection}</pre>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Sparkles className="h-10 w-10 text-[var(--oax-brass)] opacity-50" />
              <p className="text-[var(--oax-muted)]">No reflection generated yet.</p>
              <p className="text-xs text-[var(--oax-muted)]">
                Use Regenerate to create one now, or it will be generated automatically at the scheduled time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
