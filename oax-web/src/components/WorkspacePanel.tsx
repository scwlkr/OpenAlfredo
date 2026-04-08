'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, X, StickyNote, Upload, FileText } from 'lucide-react';
import { authFetch } from './authFetch';

type WorkspaceFile = {
  name: string;
  size: number;
  modified: string;
  subdir: string;
  type: 'sticky' | 'file';
};

interface WorkspacePanelProps {
  surfaceCard: string;
  onClose: () => void;
}

type Tab = 'desk' | 'files' | 'generated';

export default function WorkspacePanel({ surfaceCard, onClose }: WorkspacePanelProps) {
  const [tab, setTab] = useState<Tab>('desk');
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string } | null>(null);
  const [showStickyForm, setShowStickyForm] = useState(false);
  const [stickyTitle, setStickyTitle] = useState('');
  const [stickyContent, setStickyContent] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploadContent, setUploadContent] = useState('');

  const fetchFiles = async (subdir: Tab) => {
    try {
      const res = await authFetch(`/api/workspace?subdir=${subdir}`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch {}
  };

  useEffect(() => {
    let isMounted = true;

    authFetch(`/api/workspace?subdir=${tab}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setFiles(data.files || []);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [tab]);

  const handleTabChange = (nextTab: Tab) => {
    setSelectedFile(null);
    setTab(nextTab);
  };

  const openFile = async (name: string) => {
    try {
      const res = await authFetch(`/api/workspace?subdir=${tab}&file=${encodeURIComponent(name)}`);
      const data = await res.json();
      setSelectedFile({ name: data.name, content: data.content });
    } catch {}
  };

  const createSticky = async () => {
    if (!stickyTitle.trim() || !stickyContent.trim()) return;
    await authFetch('/api/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sticky: true, title: stickyTitle, content: stickyContent }),
    });
    setStickyTitle('');
    setStickyContent('');
    setShowStickyForm(false);
    fetchFiles('desk');
  };

  const uploadFile = async () => {
    if (!uploadName.trim() || !uploadContent.trim()) return;
    await authFetch('/api/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subdir: 'files', name: uploadName, content: uploadContent }),
    });
    setUploadName('');
    setUploadContent('');
    fetchFiles('files');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadName(file.name);
    const reader = new FileReader();
    reader.onload = () => setUploadContent(reader.result as string);
    reader.readAsText(file);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'desk', label: 'Desk' },
    { key: 'files', label: 'Files' },
    { key: 'generated', label: 'Generated' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,21,18,0.55)] p-6 backdrop-blur-sm">
      <div className={`flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] ${surfaceCard}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--oax-edge)] p-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-[var(--oax-basil)]" />
            <h2 className="font-semibold text-[var(--oax-ink)]">Workspace</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-xl border border-[var(--oax-edge)] bg-[#f3ebdc] text-xs">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => handleTabChange(t.key)}
                  className={`rounded-xl px-3 py-1 ${tab === t.key ? 'bg-[var(--oax-basil)] text-white' : 'text-[var(--oax-muted)]'}`}
                >{t.label}</button>
              ))}
            </div>
            <button onClick={onClose} className="text-[var(--oax-muted)] hover:text-[var(--oax-ink)]">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* File list */}
          <div className="w-1/3 border-r border-[var(--oax-edge)] overflow-y-auto p-3 space-y-1">
            {files.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--oax-muted)]">No files in {tab}/</div>
            ) : files.map((f, i) => (
              <button
                key={i}
                onClick={() => openFile(f.name)}
                className={`w-full text-left rounded-lg p-2 text-sm transition-colors hover:bg-[rgba(47,107,79,0.08)] ${
                  selectedFile?.name === f.name ? 'bg-[rgba(47,107,79,0.12)]' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  {f.type === 'sticky' ? (
                    <StickyNote className="w-4 h-4 text-[var(--oax-brass)]" />
                  ) : (
                    <FileText className="w-4 h-4 text-[var(--oax-muted)]" />
                  )}
                  <span className="truncate text-[var(--oax-ink)]">{f.name}</span>
                </div>
                <div className="text-xs text-[var(--oax-muted)] ml-6">
                  {new Date(f.modified).toLocaleDateString()} · {(f.size / 1024).toFixed(1)}KB
                </div>
              </button>
            ))}
          </div>

          {/* File preview */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedFile ? (
              <div>
                <h3 className="text-sm font-medium text-[var(--oax-ink)] mb-3">{selectedFile.name}</h3>
                <pre className="whitespace-pre-wrap text-sm text-[var(--oax-ink)] bg-[#f7f1e5] rounded-xl p-4 font-mono">
                  {selectedFile.content}
                </pre>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[var(--oax-muted)]">
                Select a file to preview
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-[var(--oax-edge)] bg-[#f1e8d9] p-3">
          {tab === 'desk' && (
            showStickyForm ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={stickyTitle}
                  onChange={e => setStickyTitle(e.target.value)}
                  placeholder="Sticky note title..."
                  className="w-full rounded-xl border border-[var(--oax-edge)] bg-[var(--oax-shell)] p-2 text-sm outline-none focus:ring-1 focus:ring-[var(--oax-basil)]"
                />
                <textarea
                  value={stickyContent}
                  onChange={e => setStickyContent(e.target.value)}
                  placeholder="Note content..."
                  className="w-full rounded-xl border border-[var(--oax-edge)] bg-[var(--oax-shell)] p-2 text-sm h-20 outline-none focus:ring-1 focus:ring-[var(--oax-basil)]"
                />
                <div className="flex gap-2">
                  <button onClick={createSticky} disabled={!stickyTitle.trim() || !stickyContent.trim()}
                    className="rounded-xl bg-[var(--oax-basil)] px-4 py-1.5 text-sm text-white disabled:opacity-40">Save</button>
                  <button onClick={() => setShowStickyForm(false)}
                    className="rounded-xl border border-[var(--oax-edge)] px-4 py-1.5 text-sm text-[var(--oax-muted)]">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowStickyForm(true)}
                className="flex items-center gap-2 rounded-xl border border-[var(--oax-edge)] bg-[var(--oax-shell)] px-3 py-2 text-sm text-[var(--oax-ink)] hover:bg-[rgba(47,107,79,0.08)]">
                <StickyNote className="w-4 h-4" /> New Sticky Note
              </button>
            )
          )}
          {tab === 'files' && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 rounded-xl border border-[var(--oax-edge)] bg-[var(--oax-shell)] px-3 py-2 text-sm text-[var(--oax-ink)] cursor-pointer hover:bg-[rgba(47,107,79,0.08)]">
                <Upload className="w-4 h-4" /> Upload File
                <input type="file" className="hidden" onChange={handleFileUpload} />
              </label>
              {uploadName && (
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-[var(--oax-muted)] truncate">{uploadName}</span>
                  <button onClick={uploadFile}
                    className="rounded-xl bg-[var(--oax-basil)] px-4 py-1.5 text-sm text-white">Save</button>
                </div>
              )}
            </div>
          )}
          {tab === 'generated' && (
            <div className="text-xs text-[var(--oax-muted)]">
              Generated files are created by Alfredo automatically (plans, drafts, outputs).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
