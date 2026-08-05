// src/components/NotesLog.jsx
import { useState } from 'react';

function formatTimestamp(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function openInClaude(task, noteText) {
  const lines = [];
  if (task?.title) lines.push(`Task: ${task.title}`);
  if (task?.type) lines.push(`Type: ${task.type}`);
  if (task?.priority) lines.push(`Priority: ${task.priority}`);
  const context = lines.join('\n');
  const request = noteText?.trim() || 'Help me with this task.';
  const prompt = context ? `${context}\n\n${request}` : request;
  window.open(`https://claude.ai/new?q=${encodeURIComponent(prompt)}`, '_blank');
}

export function NotesLog({ notes = [], onAddNote, authorName, task }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await onAddNote(text, authorName);
      setText('');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleAdd();
    }
  };

  const handleAskClaude = () => {
    openInClaude(task, text);
  };

  const sorted = [...notes].sort((a, b) => {
    const ta = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
    const tb = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
    return tb - ta;
  });

  return (
    <div style={{ marginTop: '12px' }}>
      {/* Add Note */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note or type a request for Claude... (Ctrl+Enter to submit)"
          className="input"
          rows={2}
          style={{ resize: 'vertical', minHeight: '60px', flex: 1 }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignSelf: 'flex-end' }}>
          <button
            onClick={handleAdd}
            disabled={!text.trim() || saving}
            className="btn btn-primary"
            style={{ opacity: (!text.trim() || saving) ? 0.5 : 1 }}
          >
            {saving ? '...' : 'ADD'}
          </button>
          <button
            onClick={handleAskClaude}
            title="Open in Claude — sends task context + your note as the prompt"
            style={{
              background: 'none',
              border: '1px solid #e0d9f7',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11px',
              color: '#7c3aed',
              cursor: 'pointer',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f5f0ff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            ✦ Ask Claude
          </button>
        </div>
      </div>

      {/* Notes List */}
      {sorted.length === 0 ? (
        <div className="empty-state" style={{ padding: '16px', fontSize: '11px' }}>
          No notes yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sorted.map((note, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--cyan)',
                  }}
                >
                  {note.author || 'User'}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                  }}
                >
                  {formatTimestamp(note.timestamp)}
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {note.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
