'use client';

import { useState, useEffect } from 'react';
import { Settings, X, RefreshCw } from 'lucide-react';
import { authFetch } from './authFetch';

interface SettingsPanelProps {
  surfaceCard: string;
  onClose: () => void;
}

type CronPreset = { label: string; value: string };
type SettingIssue = { key: string; message: string };

function summarizeRepairWarning(issues: SettingIssue[] | undefined): string | null {
  if (!Array.isArray(issues) || issues.length === 0) return null;
  const keys = Array.from(new Set(issues.map(issue => issue.key))).join(', ');
  return `Some saved settings were invalid and are being shown with safe defaults: ${keys}. Save to persist the repaired values.`;
}

function summarizeSaveError(payload: any): string {
  if (Array.isArray(payload?.issues) && payload.issues.length > 0) {
    if (payload.issues.length === 1 && payload.issues[0]?.message) {
      return payload.issues[0].message;
    }

    const keys = Array.from(
      new Set(
        payload.issues
          .map((issue: SettingIssue | undefined) => issue?.key)
          .filter((value: string | undefined): value is string => Boolean(value))
      )
    );

    if (keys.length > 0) {
      return `These settings need attention: ${keys.join(', ')}.`;
    }
  }

  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error;
  }

  return 'Could not save settings.';
}

const heartbeatPresets: CronPreset[] = [
  { label: 'Every 15 min', value: '*/15 * * * *' },
  { label: 'Every 30 min', value: '*/30 * * * *' },
  { label: 'Hourly', value: '0 * * * *' },
  { label: 'Every 2 hours', value: '0 */2 * * *' },
];

const reflectionPresets: CronPreset[] = [
  { label: '7am daily', value: '0 7 * * *' },
  { label: '8am daily', value: '0 8 * * *' },
  { label: 'Twice daily', value: '0 7,18 * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
];

export default function SettingsPanel({ surfaceCard, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    authFetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setSettings(data.settings || {});
          setWarning(summarizeRepairWarning(data.issues));
          setError(null);
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

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
    setError(null);
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const response = await authFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(summarizeSaveError(payload));
        return;
      }

      setSaved(true);
      setWarning(null);
    } catch {
      setError('Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,21,18,0.55)] p-6 backdrop-blur-sm">
        <div className={`rounded-[28px] p-8 ${surfaceCard}`}>Loading settings...</div>
      </div>
    );
  }

  const statusMessage =
    error ||
    warning ||
    (saved ? 'Saved. Restart the pod for changes to take effect.' : 'Changes are written to .env');
  const statusClass = error
    ? 'text-[#9a4139]'
    : warning
      ? 'text-[#8b6a17]'
      : saved
        ? 'text-[var(--oax-basil)]'
        : 'text-[var(--oax-muted)]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,21,18,0.55)] p-6 backdrop-blur-sm">
      <div className={`w-full max-w-2xl rounded-[28px] overflow-hidden ${surfaceCard}`}>
        <div className="flex items-center justify-between border-b border-[var(--oax-edge)] p-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-[var(--oax-basil)]" />
            <h2 className="font-semibold text-[var(--oax-ink)]">Settings</h2>
          </div>
          <button onClick={onClose} className="text-[var(--oax-muted)] hover:text-[var(--oax-ink)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* RESTLESS Heartbeat */}
          <div>
            <h3 className="text-sm font-medium text-[var(--oax-ink)] mb-2">RESTLESS Heartbeat</h3>
            <p className="text-xs text-[var(--oax-muted)] mb-3">How often Alfredo wakes up between conversations to think, reflect, and act.</p>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs text-[var(--oax-muted)] w-16">Active:</label>
              <button
                onClick={() => updateSetting('HEARTBEAT_ACTIVE', settings.HEARTBEAT_ACTIVE === 'true' ? 'false' : 'true')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  settings.HEARTBEAT_ACTIVE !== 'false'
                    ? 'bg-[var(--oax-basil)] text-white'
                    : 'bg-[#ece4d5] text-[var(--oax-muted)]'
                }`}
              >{settings.HEARTBEAT_ACTIVE !== 'false' ? 'On' : 'Off'}</button>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs text-[var(--oax-muted)] w-16">Cron:</label>
              <input
                type="text"
                value={settings.HEARTBEAT_CRON || '0 * * * *'}
                onChange={e => updateSetting('HEARTBEAT_CRON', e.target.value)}
                className="flex-1 rounded-xl border border-[var(--oax-edge)] bg-[var(--oax-shell)] p-2 text-sm font-mono outline-none focus:ring-1 focus:ring-[var(--oax-basil)]"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {heartbeatPresets.map(p => (
                <button key={p.value} onClick={() => updateSetting('HEARTBEAT_CRON', p.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                    settings.HEARTBEAT_CRON === p.value
                      ? 'bg-[var(--oax-basil)] text-white'
                      : 'bg-[#f3ebdc] text-[var(--oax-muted)] hover:bg-[#ece4d5]'
                  }`}
                >{p.label}</button>
              ))}
            </div>
          </div>

          {/* AMBITION Reflection */}
          <div>
            <h3 className="text-sm font-medium text-[var(--oax-ink)] mb-2">AMBITION Reflection</h3>
            <p className="text-xs text-[var(--oax-muted)] mb-3">When Alfredo generates a reflective morning brief synthesizing your trajectory and themes.</p>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs text-[var(--oax-muted)] w-16">Active:</label>
              <button
                onClick={() => updateSetting('REFLECTION_ACTIVE', settings.REFLECTION_ACTIVE === 'true' ? 'false' : 'true')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  settings.REFLECTION_ACTIVE !== 'false'
                    ? 'bg-[var(--oax-basil)] text-white'
                    : 'bg-[#ece4d5] text-[var(--oax-muted)]'
                }`}
              >{settings.REFLECTION_ACTIVE !== 'false' ? 'On' : 'Off'}</button>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs text-[var(--oax-muted)] w-16">Cron:</label>
              <input
                type="text"
                value={settings.REFLECTION_CRON || '0 7 * * *'}
                onChange={e => updateSetting('REFLECTION_CRON', e.target.value)}
                className="flex-1 rounded-xl border border-[var(--oax-edge)] bg-[var(--oax-shell)] p-2 text-sm font-mono outline-none focus:ring-1 focus:ring-[var(--oax-basil)]"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {reflectionPresets.map(p => (
                <button key={p.value} onClick={() => updateSetting('REFLECTION_CRON', p.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                    settings.REFLECTION_CRON === p.value
                      ? 'bg-[var(--oax-basil)] text-white'
                      : 'bg-[#f3ebdc] text-[var(--oax-muted)] hover:bg-[#ece4d5]'
                  }`}
                >{p.label}</button>
              ))}
            </div>
          </div>

          {/* Continuity Loop (Golden Goose) */}
          <div>
            <h3 className="text-sm font-medium text-[var(--oax-ink)] mb-2">Continuity Loop</h3>
            <p className="text-xs text-[var(--oax-muted)] mb-3">The adaptive behavior chain — extracts themes from your conversations and autonomously creates follow-up tasks, notes, and documents.</p>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs text-[var(--oax-muted)] w-16">Active:</label>
              <button
                onClick={() => updateSetting('CONTINUITY_ACTIVE', settings.CONTINUITY_ACTIVE === 'true' ? 'false' : 'true')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  settings.CONTINUITY_ACTIVE !== 'false'
                    ? 'bg-[var(--oax-basil)] text-white'
                    : 'bg-[#ece4d5] text-[var(--oax-muted)]'
                }`}
              >{settings.CONTINUITY_ACTIVE !== 'false' ? 'On' : 'Off'}</button>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs text-[var(--oax-muted)] w-16">Cron:</label>
              <input
                type="text"
                value={settings.CONTINUITY_CRON || '0 10,16 * * *'}
                onChange={e => updateSetting('CONTINUITY_CRON', e.target.value)}
                className="flex-1 rounded-xl border border-[var(--oax-edge)] bg-[var(--oax-shell)] p-2 text-sm font-mono outline-none focus:ring-1 focus:ring-[var(--oax-basil)]"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Twice daily', value: '0 10,16 * * *' },
                { label: 'Three times daily', value: '0 8,13,18 * * *' },
                { label: 'Every 4 hours', value: '0 */4 * * *' },
                { label: 'Daily at noon', value: '0 12 * * *' },
              ].map(p => (
                <button key={p.value} onClick={() => updateSetting('CONTINUITY_CRON', p.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                    settings.CONTINUITY_CRON === p.value
                      ? 'bg-[var(--oax-basil)] text-white'
                      : 'bg-[#f3ebdc] text-[var(--oax-muted)] hover:bg-[#ece4d5]'
                  }`}
                >{p.label}</button>
              ))}
            </div>
          </div>

          {/* Task Check */}
          <div>
            <h3 className="text-sm font-medium text-[var(--oax-ink)] mb-2">Task Check Interval</h3>
            <p className="text-xs text-[var(--oax-muted)] mb-3">How often the system checks for due scheduled tasks (deterministic, no LLM).</p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--oax-muted)] w-16">Cron:</label>
              <input
                type="text"
                value={settings.AMBITION_CRON || '*/30 * * * *'}
                onChange={e => updateSetting('AMBITION_CRON', e.target.value)}
                className="flex-1 rounded-xl border border-[var(--oax-edge)] bg-[var(--oax-shell)] p-2 text-sm font-mono outline-none focus:ring-1 focus:ring-[var(--oax-basil)]"
              />
            </div>
          </div>

          {/* Default Model */}
          <div>
            <h3 className="text-sm font-medium text-[var(--oax-ink)] mb-2">Default Model</h3>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--oax-muted)] w-16">Model:</label>
              <input
                type="text"
                value={settings.OAX_MODEL || 'llama3'}
                onChange={e => updateSetting('OAX_MODEL', e.target.value)}
                className="flex-1 rounded-xl border border-[var(--oax-edge)] bg-[var(--oax-shell)] p-2 text-sm font-mono outline-none focus:ring-1 focus:ring-[var(--oax-basil)]"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--oax-edge)] bg-[#f1e8d9] p-4 flex items-center justify-between">
          <p className={`text-xs ${statusClass}`}>{statusMessage}</p>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[var(--oax-basil)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--oax-basil-strong)] disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
