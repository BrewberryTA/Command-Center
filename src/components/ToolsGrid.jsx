// src/components/ToolsGrid.jsx
import { useState } from 'react';

function ToolModal({ tool, onClose, onSave }) {
  const [name, setName] = useState(tool?.name || '');
  const [url, setUrl] = useState(tool?.url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!url.trim()) { setError('URL is required'); return; }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), url: url.trim() });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Tool"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-box" style={{ padding: '24px', maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              color: 'var(--cyan)',
              letterSpacing: '0.1em',
            }}
          >
            {tool ? 'EDIT TOOL' : '+ ADD TOOL'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '16px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label>Name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. GitHub"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>URL</label>
          <input
            className="input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
          />
        </div>

        {error && (
          <div style={{ color: 'var(--red)', fontSize: '11px', fontFamily: 'var(--font-mono)', marginBottom: '12px' }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'SAVING...' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolCard({ tool, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    } else {
      onDelete(tool.id);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '16px',
        transition: 'all 200ms ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--cyan)';
        e.currentTarget.style.boxShadow = 'var(--glow-cyan)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Action buttons (top-right) */}
      <div
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          display: 'flex',
          gap: '3px',
          opacity: 0,
          transition: 'opacity 200ms ease',
        }}
        className="tool-actions"
      >
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(tool); }}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 5px',
            fontSize: '9px',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
          }}
        >
          ✎
        </button>
        {confirmDelete ? (
          <button
            onClick={handleDelete}
            style={{
              background: 'var(--red)',
              border: '1px solid var(--red)',
              color: '#fff',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 5px',
              fontSize: '9px',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
            }}
          >
            CONFIRM
          </button>
        ) : (
          <button
            onClick={handleDelete}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--red)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 5px',
              fontSize: '9px',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
            }}
          >
            🗑
          </button>
        )}
      </div>

      {/* Favicon */}
      <a
        href={tool.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'contents', color: 'inherit', textDecoration: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {tool.favicon ? (
            <img
              src={tool.favicon}
              alt=""
              width={32}
              height={32}
              style={{ borderRadius: '4px', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            style={{
              display: tool.favicon ? 'none' : 'flex',
              width: '32px',
              height: '32px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              color: 'var(--text-muted)',
            }}
          >
            🔗
          </div>
        </div>

        {/* Name */}
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            textAlign: 'center',
            wordBreak: 'break-word',
            lineHeight: 1.3,
          }}
        >
          {tool.name}
        </div>

        {/* URL preview */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}
        >
          {(() => {
            try { return new URL(tool.url).hostname; } catch { return tool.url; }
          })()}
        </div>
      </a>
    </div>
  );
}

export function ToolsGrid({ tools, loading, onAdd, onUpdate, onDelete }) {
  const [showModal, setShowModal] = useState(false);
  const [editingTool, setEditingTool] = useState(null);

  const handleSave = async (data) => {
    if (editingTool) {
      await onUpdate(editingTool.id, data);
    } else {
      await onAdd(data);
    }
    setEditingTool(null);
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
            }}
          >
            {tools.length} TOOL{tools.length !== 1 ? 'S' : ''} CONFIGURED
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setEditingTool(null); setShowModal(true); }}
          style={{ boxShadow: 'var(--glow-cyan)' }}
        >
          + ADD TOOL
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '12px',
          }}
        >
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '110px', borderRadius: 'var(--radius)' }} />
          ))}
        </div>
      ) : tools.length === 0 ? (
        <div className="empty-state">
          <span className="icon">🔗</span>
          No tools yet. Add your first hotlink!
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '12px',
          }}
          // Show action buttons on hover via CSS — inject style rule
          onMouseOver={(e) => {
            const actions = e.target.closest('[data-tool-card]')?.querySelector('.tool-actions');
            if (actions) actions.style.opacity = '1';
          }}
        >
          {tools.map((tool) => (
            <div
              key={tool.id}
              data-tool-card
              style={{ position: 'relative' }}
              onMouseEnter={(e) => {
                const actions = e.currentTarget.querySelector('.tool-actions');
                if (actions) actions.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                const actions = e.currentTarget.querySelector('.tool-actions');
                if (actions) actions.style.opacity = '0';
              }}
            >
              <ToolCard
                tool={tool}
                onEdit={(t) => { setEditingTool(t); setShowModal(true); }}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ToolModal
          tool={editingTool}
          onClose={() => { setShowModal(false); setEditingTool(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
