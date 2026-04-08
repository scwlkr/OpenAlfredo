'use client';

import { useState, useEffect } from 'react';
import { Clock, X, Trash2, Plus } from 'lucide-react';
import { authFetch } from './authFetch';

type TaskItem = {
  text: string;
  done: boolean;
  whenISO?: string;
  recur?: string;
  raw: string;
};

interface TasksModalProps {
  surfaceCard: string;
  onClose: () => void;
}

export default function TasksModal({ surfaceCard, onClose }: TasksModalProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksFilter, setTasksFilter] = useState<'scheduled' | 'all'>('scheduled');
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskWhen, setNewTaskWhen] = useState('');
  const [newTaskRecur, setNewTaskRecur] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const fetchTasks = async () => {
    try {
      const res = await authFetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch {}
  };

  useEffect(() => {
    let isMounted = true;

    authFetch('/api/tasks')
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setTasks(data.tasks || []);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const toggleTask = async (raw: string, done: boolean) => {
    await authFetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw, done }),
    });
    fetchTasks();
  };

  const removeTask = async (raw: string) => {
    await authFetch('/api/tasks', {
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
      const iso = new Date(newTaskWhen).toISOString();
      body += ` |when:${iso}`;
    }
    if (newTaskRecur.trim()) body += ` |recur:${newTaskRecur.trim()}`;
    await authFetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: body }),
    });
    setNewTaskText('');
    setNewTaskWhen('');
    setNewTaskRecur('');
    fetchTasks();
  };

  const visible = tasksFilter === 'scheduled'
    ? tasks.filter(t => t.whenISO || t.recur)
    : tasks;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,21,18,0.55)] p-6 backdrop-blur-sm">
      <div className={`flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] ${surfaceCard}`}>
        <div className="flex items-center justify-between border-b border-[var(--oax-edge)] p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[var(--oax-basil)]" />
            <h2 className="font-semibold text-[var(--oax-ink)]">Task Queue</h2>
            <span className="ml-2 text-xs text-[var(--oax-muted)]">from TASKS.md</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-xl border border-[var(--oax-edge)] bg-[#f3ebdc] text-xs">
              <button
                onClick={() => setTasksFilter('scheduled')}
                className={`rounded-xl px-3 py-1 ${tasksFilter === 'scheduled' ? 'bg-[var(--oax-basil)] text-white' : 'text-[var(--oax-muted)]'}`}
              >Scheduled</button>
              <button
                onClick={() => setTasksFilter('all')}
                className={`rounded-xl px-3 py-1 ${tasksFilter === 'all' ? 'bg-[var(--oax-basil)] text-white' : 'text-[var(--oax-muted)]'}`}
              >All</button>
            </div>
            <button onClick={onClose} className="text-[var(--oax-muted)] hover:text-[var(--oax-ink)]">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {visible.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--oax-muted)]">
              {tasksFilter === 'scheduled' ? 'No scheduled tasks yet.' : 'No tasks yet.'}
            </div>
          ) : visible.map((t, i) => {
            const isScheduled = !!(t.whenISO || t.recur);
            const fireTime = t.whenISO ? new Date(t.whenISO) : null;
            const overdue = fireTime && !t.done && fireTime.getTime() < now;
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
          })}
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
            >Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}
