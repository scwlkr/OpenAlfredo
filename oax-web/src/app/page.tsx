'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, Bot, User, Settings, FileText, Terminal, X, Clock, Trash2, Plus } from 'lucide-react';

type AmbitionTask = {
  text: string;
  done: boolean;
  whenISO?: string;
  recur?: string;
  raw: string;
};

// Authenticated fetch wrapper — injects the API key as a Bearer token
function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const key = (window as any).__OAX_API_KEY || '';
  const headers = new Headers(opts.headers);
  if (key) headers.set('Authorization', `Bearer ${key}`);
  return fetch(url, { ...opts, headers });
}

export default function Home() {
  const [onboarding, setOnboarding] = useState(true);
  const [persona, setPersona] = useState('');
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string>('');
  const [model, setModel] = useState('llama3');
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  const sessionRef = useRef({ sessionId: '', model: 'llama3' });
  useEffect(() => {
    sessionRef.current = { sessionId, model };
  }, [sessionId, model]);

  // Bootstrap: fetch the API key first, then load models + onboarding state
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
            if (data.models && data.models.length > 0) {
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
            if (data.exists) {
              setSessionId(crypto.randomUUID());
            }
            setLoading(false);
          });
      })
      .catch(() => setLoading(false));
  }, []);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: () => sessionRef.current,
      headers: (): Record<string, string> => {
        const key = (window as any).__OAX_API_KEY;
        return key ? { 'Authorization': `Bearer ${key}` } : {};
      }
    })
  });

  const [input, setInput] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [showTasks, setShowTasks] = useState(false);
  const [tasks, setTasks] = useState<AmbitionTask[]>([]);
  const [tasksFilter, setTasksFilter] = useState<'scheduled' | 'all'>('scheduled');
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskWhen, setNewTaskWhen] = useState('');
  const [newTaskRecur, setNewTaskRecur] = useState('');

  const fetchTasks = async () => {
    try {
      const res = await authFetch('/api/ambition');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch {}
  };

  const toggleTask = async (raw: string, done: boolean) => {
    await authFetch('/api/ambition', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw, done }),
    });
    fetchTasks();
  };

  const removeTask = async (raw: string) => {
    await authFetch('/api/ambition', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    });
    fetchTasks();
  };

  const addTask = async () => {
    const text = newTaskText.trim();
    if (!text) return;
    let body = text;
    if (newTaskWhen.trim()) {
      // datetime-local value like "2026-04-10T09:00" -> ISO
      const iso = new Date(newTaskWhen).toISOString();
      body += ` |when:${iso}`;
    }
    if (newTaskRecur.trim()) body += ` |recur:${newTaskRecur.trim()}`;
    await authFetch('/api/ambition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: body }),
    });
    setNewTaskText('');
    setNewTaskWhen('');
    setNewTaskRecur('');
    fetchTasks();
  };

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

  useEffect(() => {
    if (showTasks) fetchTasks();
  }, [showTasks]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value);
  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    await authFetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'default', persona, goals }),
    });
    setOnboarding(false);
    setSessionId(crypto.randomUUID());
    setLoading(false);
  };

  const surfaceCard =
    'border border-[var(--oax-edge)] bg-[var(--oax-shell)] shadow-[0_24px_60px_-32px_var(--oax-shadow)]';
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--oax-paper)] text-[var(--oax-ink)]">
        Loading OpenAlfredo...
      </div>
    );
  }

  if (onboarding) {
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
              disabled={!persona || !goals}
              className="w-full rounded-2xl bg-[var(--oax-basil)] px-4 py-3 font-medium text-white transition-colors hover:bg-[var(--oax-basil-strong)] disabled:opacity-50"
            >
              Initialize SOUL
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen bg-[var(--oax-paper)] text-[var(--oax-ink)] font-sans">
      {/* Left Sidebar - Options */}
      <aside className="w-64 border-r border-[rgba(255,250,241,0.12)] bg-[var(--oax-ink)] text-[var(--oax-paper)] flex flex-col">
        <div className="p-6 border-b border-[rgba(255,250,241,0.12)] flex items-center gap-3">
          <Bot className="text-[var(--oax-brass)]" />
          <div>
            <h2 className="font-bold">OpenAlfredo</h2>
            <p className="text-xs text-[var(--oax-sage)]">Local-first agent steward</p>
          </div>
        </div>
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm text-[var(--oax-sage)] mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4"/> Active Model
            </label>
            <select 
              value={model} 
              onChange={e => setModel(e.target.value)}
              className="w-full rounded-xl border border-[rgba(255,250,241,0.14)] bg-[rgba(255,250,241,0.08)] p-2 text-[var(--oax-paper)] outline-none"
            >
              {availableModels.length > 0 ? (
                availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))
              ) : (
                <>
                  <option value="llama3">Llama 3</option>
                  <option value="mistral">Mistral</option>
                  <option value="phi3">Phi-3</option>
                </>
              )}
            </select>
          </div>
          <div>
             <h3 className="text-sm font-medium text-[var(--oax-sage)] flex items-center gap-2 mb-3">
               <FileText className="w-4 h-4"/> Memory State
             </h3>
             <div className="rounded-2xl border border-[rgba(255,250,241,0.12)] bg-[rgba(255,250,241,0.06)] p-3 text-xs text-[var(--oax-sage)]">
               Session ID: {sessionId.substring(0,8)}...<br/>
               Agent: default<br/>
               Context Injected: SOUL, Index
             </div>
          </div>
          <div className="pt-4 mt-4 border-t border-[rgba(255,250,241,0.12)] space-y-2">
            <button
              onClick={() => setShowTasks(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-[rgba(255,250,241,0.14)] bg-[rgba(255,250,241,0.08)] p-2 text-sm text-[var(--oax-paper)] transition-colors hover:bg-[rgba(255,250,241,0.14)]"
            >
              <Clock className="w-4 h-4" /> Task Queue
            </button>
            <button
              onClick={() => setShowLogs(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-[rgba(255,250,241,0.14)] bg-[rgba(255,250,241,0.08)] p-2 text-sm text-[var(--oax-paper)] transition-colors hover:bg-[rgba(255,250,241,0.14)]"
            >
              <Terminal className="w-4 h-4" /> Runtime Logs
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Window */}
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

        <div className="border-t border-[var(--oax-edge)] bg-[rgba(23,21,18,0.04)] p-6">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-3">
            <input 
              value={input}
              onChange={handleInputChange}
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

      {showLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,21,18,0.55)] p-6 backdrop-blur-sm">
          <div className={`flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] ${surfaceCard}`}>
            <div className="flex items-center justify-between border-b border-[var(--oax-edge)] p-4">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-[var(--oax-basil)]" />
                <h2 className="font-semibold text-[var(--oax-ink)]">Runtime Logs</h2>
              </div>
              <button onClick={() => setShowLogs(false)} className="text-[var(--oax-muted)] hover:text-[var(--oax-ink)]">
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
      )}

      {showTasks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,21,18,0.55)] p-6 backdrop-blur-sm">
          <div className={`flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] ${surfaceCard}`}>
            <div className="flex items-center justify-between border-b border-[var(--oax-edge)] p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-[var(--oax-basil)]" />
                <h2 className="font-semibold text-[var(--oax-ink)]">Task Queue</h2>
                <span className="ml-2 text-xs text-[var(--oax-muted)]">from AMBITION.md</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex rounded-xl border border-[var(--oax-edge)] bg-[#f3ebdc] text-xs">
                  <button
                    onClick={() => setTasksFilter('scheduled')}
                    className={`rounded-xl px-3 py-1 ${tasksFilter === 'scheduled' ? 'bg-[var(--oax-basil)] text-white' : 'text-[var(--oax-muted)]'}`}
                  >
                    Scheduled
                  </button>
                  <button
                    onClick={() => setTasksFilter('all')}
                    className={`rounded-xl px-3 py-1 ${tasksFilter === 'all' ? 'bg-[var(--oax-basil)] text-white' : 'text-[var(--oax-muted)]'}`}
                  >
                    All
                  </button>
                </div>
                <button onClick={() => setShowTasks(false)} className="text-[var(--oax-muted)] hover:text-[var(--oax-ink)]">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {(() => {
                const visible = tasksFilter === 'scheduled'
                  ? tasks.filter(t => t.whenISO || t.recur)
                  : tasks;
                if (visible.length === 0) {
                  return <div className="py-8 text-center text-sm text-[var(--oax-muted)]">
                    {tasksFilter === 'scheduled' ? 'No scheduled tasks yet.' : 'No tasks yet.'}
                  </div>;
                }
                return visible.map((t, i) => {
                  const isScheduled = !!(t.whenISO || t.recur);
                  const fireTime = t.whenISO ? new Date(t.whenISO) : null;
                  const fireMs = fireTime ? fireTime.getTime() : 0;
                  const nowMs = Date.now();
                  const overdue = fireTime && !t.done && fireMs < nowMs;
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border flex items-start gap-3 ${
                        t.done ? 'bg-[#ece4d5] border-[var(--oax-edge)] opacity-60' :
                        overdue ? 'bg-[rgba(185,138,61,0.16)] border-[rgba(185,138,61,0.45)]' :
                        isScheduled ? 'bg-[rgba(47,107,79,0.10)] border-[rgba(47,107,79,0.30)]' :
                        'bg-[#f7f1e5] border-[var(--oax-edge)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={(e) => toggleTask(t.raw, e.target.checked)}
                        className="mt-1 h-4 w-4 cursor-pointer accent-[var(--oax-basil)]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm ${t.done ? 'line-through text-[var(--oax-muted)]' : 'text-[var(--oax-ink)]'}`}>
                          {t.text}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs">
                          {t.whenISO && (
                            <span className={`rounded-full px-2 py-0.5 ${overdue && !t.done ? 'bg-[rgba(185,138,61,0.18)] text-[var(--oax-brass)]' : 'bg-[rgba(47,107,79,0.12)] text-[var(--oax-basil)]'}`}>
                              {overdue && !t.done ? 'overdue · ' : 'fires · '}
                              {fireTime!.toLocaleString()}
                            </span>
                          )}
                          {t.recur && (
                            <span className="rounded-full bg-[rgba(23,21,18,0.08)] px-2 py-0.5 text-[var(--oax-muted)]">
                              recur · {t.recur}
                            </span>
                          )}
                          {!isScheduled && (
                            <span className="rounded-full bg-[rgba(23,21,18,0.08)] px-2 py-0.5 text-[var(--oax-muted)]">
                              unscheduled
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeTask(t.raw)}
                        className="shrink-0 text-[var(--oax-muted)] hover:text-red-700"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="space-y-2 border-t border-[var(--oax-edge)] bg-[#f1e8d9] p-4">
              <div className="flex items-center gap-2 text-xs text-[var(--oax-muted)]">
                <Plus className="w-3 h-3" /> Add a new task
              </div>
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Task description..."
                className="w-full rounded-xl border border-[var(--oax-edge)] bg-[var(--oax-shell)] p-2 text-sm text-[var(--oax-ink)] outline-none focus:ring-1 focus:ring-[var(--oax-basil)]"
              />
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={newTaskWhen}
                  onChange={(e) => setNewTaskWhen(e.target.value)}
                  className="flex-1 rounded-xl border border-[var(--oax-edge)] bg-[var(--oax-shell)] p-2 text-sm text-[var(--oax-ink)] outline-none"
                />
                <input
                  type="text"
                  value={newTaskRecur}
                  onChange={(e) => setNewTaskRecur(e.target.value)}
                  placeholder="recur (e.g. daily@09:00)"
                  className="flex-1 rounded-xl border border-[var(--oax-edge)] bg-[var(--oax-shell)] p-2 text-sm text-[var(--oax-ink)] outline-none"
                />
                <button
                  onClick={addTask}
                  disabled={!newTaskText.trim()}
                  className="rounded-xl bg-[var(--oax-basil)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--oax-basil-strong)] disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
