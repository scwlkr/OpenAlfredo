'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, Bot, User, Settings, FileText, Terminal, Clock, FolderOpen, Sparkles } from 'lucide-react';

import { authFetch } from '@/components/authFetch';
import OnboardingModal from '@/components/OnboardingModal';
import LogsModal from '@/components/LogsModal';
import TasksModal from '@/components/TasksModal';
import WorkspacePanel from '@/components/WorkspacePanel';
import ReflectionPanel from '@/components/ReflectionPanel';
import SettingsPanel from '@/components/SettingsPanel';

const surfaceCard =
  'border border-[var(--oax-edge)] bg-[var(--oax-shell)] shadow-[0_24px_60px_-32px_var(--oax-shadow)]';

const DEV_SESSION_ID = process.env.NEXT_PUBLIC_OAX_DEV_SESSION_ID;

function nextSessionId() {
  return DEV_SESSION_ID || crypto.randomUUID();
}

export default function Home() {
  const [onboarding, setOnboarding] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string>('');
  const [model, setModel] = useState('llama3');
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Modal state
  const [showLogs, setShowLogs] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  const sessionRef = useRef({ sessionId: '', model: 'llama3' });
  useEffect(() => {
    sessionRef.current = { sessionId, model };
  }, [sessionId, model]);

  // Bootstrap: fetch API key, then models + onboarding state
  useEffect(() => {
    fetch('/api/auth/key')
      .then(res => res.json())
      .then(data => {
        if (data.key) (window as any).__OAX_API_KEY = data.key;
      })
      .then(() => {
        authFetch('/api/models')
          .then(res => res.json())
          .then(data => {
            if (data.models?.length > 0) {
              const names = data.models.map((m: { name: string }) => m.name);
              setAvailableModels(names);
              setModel(names[0]);
            } else {
              setAvailableModels(['llama3', 'mistral', 'phi3']);
            }
          })
          .catch(() => setAvailableModels(['llama3', 'mistral', 'phi3']));

        authFetch('/api/onboarding?agentId=default')
          .then(res => res.json())
          .then(data => {
            setOnboarding(!data.exists);
            if (data.exists) setSessionId(nextSessionId());
            setLoading(false);
          });
      })
      .catch(() => setLoading(false));
  }, []);

  /* eslint-disable react-hooks/refs */
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: () => sessionRef.current,
      headers: (): Record<string, string> => {
        const key = (window as any).__OAX_API_KEY;
        return key ? { Authorization: `Bearer ${key}` } : {};
      },
    }),
  });
  /* eslint-enable react-hooks/refs */

  const [input, setInput] = useState('');
  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  // Logs polling
  const fetchLogs = async () => {
    try {
      const res = await authFetch('/api/logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {}
  };
  useEffect(() => {
    if (showLogs) {
      fetchLogs();
      const interval = setInterval(fetchLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [showLogs]);

  // Loading screen
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--oax-paper)] text-[var(--oax-ink)]">
        Loading OpenAlfredo...
      </div>
    );
  }

  // Onboarding
  if (onboarding) {
    return (
      <OnboardingModal
        surfaceCard={surfaceCard}
        onComplete={() => {
          setOnboarding(false);
          setSessionId(nextSessionId());
        }}
      />
    );
  }

  return (
    <main className="flex h-screen bg-[var(--oax-paper)] text-[var(--oax-ink)] font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[rgba(255,250,241,0.12)] bg-[var(--oax-ink)] text-[var(--oax-paper)] flex flex-col">
        <div className="p-6 border-b border-[rgba(255,250,241,0.12)] flex items-center gap-3">
          <Bot className="text-[var(--oax-brass)]" />
          <div>
            <h2 className="font-bold">OpenAlfredo</h2>
            <p className="text-xs text-[var(--oax-sage)]">Local-first agent steward</p>
          </div>
        </div>
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Model selector */}
          <div>
            <label className="block text-sm text-[var(--oax-sage)] mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4" /> Active Model
            </label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="w-full rounded-xl border border-[rgba(255,250,241,0.14)] bg-[rgba(255,250,241,0.08)] p-2 text-[var(--oax-paper)] outline-none"
            >
              {availableModels.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Memory state */}
          <div>
            <h3 className="text-sm font-medium text-[var(--oax-sage)] flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4" /> Memory State
            </h3>
            <div className="rounded-2xl border border-[rgba(255,250,241,0.12)] bg-[rgba(255,250,241,0.06)] p-3 text-xs text-[var(--oax-sage)]">
              Session ID: {sessionId.substring(0, 8)}...<br />
              Agent: default<br />
              Context Injected: SOUL, Index
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 mt-4 border-t border-[rgba(255,250,241,0.12)] space-y-2">
            {[
              { icon: Clock, label: 'Task Queue', onClick: () => setShowTasks(true) },
              { icon: FolderOpen, label: 'Workspace', onClick: () => setShowWorkspace(true) },
              { icon: Sparkles, label: 'AMBITION', onClick: () => setShowReflection(true) },
              { icon: Terminal, label: 'Runtime Logs', onClick: () => setShowLogs(true) },
              { icon: Settings, label: 'Settings', onClick: () => setShowSettings(true) },
            ].map(({ icon: Icon, label, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[rgba(255,250,241,0.14)] bg-[rgba(255,250,241,0.08)] p-2 text-sm text-[var(--oax-paper)] transition-colors hover:bg-[rgba(255,250,241,0.14)]"
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Chat Window */}
      <section className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-8 space-y-6" id="chat-container">
          {messages.length === 0 && (
            <div className="mt-20 text-center text-[var(--oax-muted)]">
              <Bot className="mx-auto mb-4 h-12 w-12 text-[var(--oax-brass)] opacity-80" />
              <p>OpenAlfredo is calibrated. Pick up where you left off.</p>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex max-w-3xl mx-auto gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  m.role === 'user'
                    ? 'bg-[var(--oax-brass)] text-white'
                    : 'bg-[var(--oax-basil)] text-white'
                }`}
              >
                {m.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-[24px] p-4 ${
                  m.role === 'user'
                    ? 'border border-[rgba(185,138,61,0.35)] bg-[rgba(185,138,61,0.16)] text-[var(--oax-ink)]'
                    : `${surfaceCard} text-[var(--oax-ink)]`
                }`}
              >
                {m.parts?.find(p => p.type === 'text')?.text || ''}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex max-w-3xl mx-auto gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--oax-basil)] text-white">
                <Bot className="w-5 h-5" />
              </div>
              <div className={`flex items-center rounded-[24px] p-4 ${surfaceCard}`}>
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--oax-basil)]" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-[var(--oax-edge)] bg-[rgba(23,21,18,0.04)] p-6">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              className="flex-1 rounded-2xl border border-[var(--oax-edge)] bg-[var(--oax-shell)] px-6 py-4 text-[var(--oax-ink)] outline-none focus:ring-2 focus:ring-[var(--oax-basil)]"
              placeholder="Ask for help, capture context, or hand off a task..."
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input?.trim()}
              className="flex items-center justify-center rounded-2xl bg-[var(--oax-basil)] px-6 text-white shadow-lg transition-colors hover:bg-[var(--oax-basil-strong)] disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </section>

      {/* Modals */}
      {showLogs && <LogsModal logs={logs} surfaceCard={surfaceCard} onClose={() => setShowLogs(false)} />}
      {showTasks && <TasksModal surfaceCard={surfaceCard} onClose={() => setShowTasks(false)} />}
      {showWorkspace && <WorkspacePanel surfaceCard={surfaceCard} onClose={() => setShowWorkspace(false)} />}
      {showReflection && <ReflectionPanel surfaceCard={surfaceCard} onClose={() => setShowReflection(false)} />}
      {showSettings && <SettingsPanel surfaceCard={surfaceCard} onClose={() => setShowSettings(false)} />}
    </main>
  );
}
