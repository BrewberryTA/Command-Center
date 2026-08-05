import { useState } from 'react';
// src/components/ClaudeAssist.jsx
// Opens a new Claude.ai chat with task context pre-filled.
// No API key needed — uses your existing Claude subscription.

const SUGGESTIONS = [
  'Draft an email about this',
  'Break this into action steps',
  'Help me prepare for this',
  'Write a follow-up message',
  'Summarize what I need to do',
];

function buildPrompt(task, customPrompt) {
  const lines = [];
  if (task.title) lines.push(`Task: ${task.title}`);
  if (task.type) lines.push(`Type: ${task.type}`);
  if (task.priority) lines.push(`Priority: ${task.priority}`);
  if (task.notes && task.notes.length > 0) {
    const noteText = task.notes.map(n => n.text || n).filter(Boolean).join('; ');
    if (noteText) lines.push(`Notes: ${noteText}`);
  }
  const context = lines.join('\n');
  const request = customPrompt || 'Help me with this task.';
  return `${context}\n\n${request}`;
}

export function ClaudeAssist({ task }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');

  const openClaude = (customPrompt) => {
    const fullPrompt = buildPrompt(task, customPrompt);
    const encoded = encodeURIComponent(fullPrompt);
    window.open(`https://claude.ai/new?q=${encoded}`, '_blank');
  };

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    openClaude(prompt);
    setPrompt('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        style={{
          background: 'none',
          border: '1px solid #e0d9f7',
          borderRadius: '6px',
          padding: '3px 8px',
          fontSize: '11px',
          color: '#7c3aed',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
          fontWeight: 500,
          transition: 'all 150ms ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#f5f0ff'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        title="Ask Claude for help with this task"
      >
        ✦ Ask Claude
      </button>
    );
  }

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        marginTop: '10px',
        border: '1px solid #e0d9f7',
        borderRadius: '8px',
        background: '#faf8ff',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        background: 'linear-gradient(135deg, #7c3aed11, #a855f711)',
        borderBottom: '1px solid #e0d9f7',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#7c3aed' }}>
          ✦ Ask Claude — opens in claude.ai
        </span>
        <button
          onClick={() => { setOpen(false); setPrompt(''); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '14px' }}
        >✕</button>
      </div>

      {/* Quick suggestions */}
      <div style={{ padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => openClaude(s)}
            style={{
              background: 'white',
              border: '1px solid #e0d9f7',
              borderRadius: '20px',
              padding: '3px 10px',
              fontSize: '11px',
              color: '#7c3aed',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f5f0ff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Custom prompt */}
      <div style={{ padding: '0 12px 10px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          placeholder="Or type a custom request and hit Send..."
          rows={2}
          autoFocus
          style={{
            flex: 1,
            border: '1px solid #e0d9f7',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            resize: 'none',
            fontFamily: 'inherit',
            outline: 'none',
            background: 'white',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim()}
          style={{
            background: prompt.trim() ? '#7c3aed' : '#e0d9f7',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '12px',
            cursor: prompt.trim() ? 'pointer' : 'default',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Open in Claude
        </button>
      </div>
    </div>
  );
}
