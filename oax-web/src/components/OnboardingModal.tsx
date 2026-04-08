'use client';

import { useState } from 'react';
import { Bot } from 'lucide-react';
import { authFetch } from './authFetch';

interface OnboardingModalProps {
  surfaceCard: string;
  onComplete: () => void;
}

export default function OnboardingModal({ surfaceCard, onComplete }: OnboardingModalProps) {
  const [persona, setPersona] = useState('');
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(false);

  const completeOnboarding = async () => {
    setLoading(true);
    await authFetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'default', persona, goals }),
    });
    setLoading(false);
    onComplete();
  };

  return (
    <main className="flex h-screen items-center justify-center bg-[var(--oax-paper)] text-[var(--oax-ink)] p-6">
      <div className={`max-w-lg w-full rounded-[28px] p-8 ${surfaceCard}`}>
        <div className="flex items-center gap-3 mb-6">
          <Bot className="w-8 h-8 text-[var(--oax-basil)]" />
          <div>
            <h1 className="text-2xl font-bold">Meet OpenAlfredo</h1>
            <p className="text-sm text-[var(--oax-muted)]">Calibrate the local agent you want to keep around.</p>
          </div>
        </div>
        <p className="text-[var(--oax-muted)] mb-6">
          Start with identity and priorities. This becomes the durable frame your agent will return to every time it wakes up.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Persona & Identity</label>
            <textarea
              value={persona} onChange={e => setPersona(e.target.value)}
              className="w-full rounded-2xl border border-[var(--oax-edge)] bg-[#fcf7ed] p-3 text-[var(--oax-ink)] h-24 outline-none focus:ring-2 focus:ring-[var(--oax-basil)]"
              placeholder="You are a clear, steady strategic partner who remembers ongoing work..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Goals & Focus</label>
            <textarea
              value={goals} onChange={e => setGoals(e.target.value)}
              className="w-full rounded-2xl border border-[var(--oax-edge)] bg-[#fcf7ed] p-3 text-[var(--oax-ink)] h-24 outline-none focus:ring-2 focus:ring-[var(--oax-basil)]"
              placeholder="Help me keep projects moving, capture context, and surface what needs attention..."
            />
          </div>
          <button
            onClick={completeOnboarding}
            disabled={!persona || !goals || loading}
            className="w-full rounded-2xl bg-[var(--oax-basil)] px-4 py-3 font-medium text-white transition-colors hover:bg-[var(--oax-basil-strong)] disabled:opacity-50"
          >
            {loading ? 'Initializing...' : 'Initialize SOUL'}
          </button>
        </div>
      </div>
    </main>
  );
}
