// src/components/QuickStrip.jsx
// Horizontal scrollable strip of configurable quick-action buttons.
// Two types:
//   "email"   — opens Gmail compose window pre-addressed from a specific account
//   "website" — opens a URL in a new tab
//
// Buttons are stored in Firestore (users/{uid}/quickButtons) and fully
// manageable inside the app — add, edit, reorder, delete.

import { useState, useEffect, useCallback } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, Timestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase.js';

// ── Firestore hook ────────────────────────────────────────────
function useQuickButtons(uid) {
  const [buttons, setButtons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setButtons([]); setLoading(false); return; }
    const ref = collection(db, 'users', uid, 'quickButtons');
    const q = query(ref, orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setButtons(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  const addButton = useCallback(async (data) => {
    if (!uid) return;
    const ref = collection(db, 'users', uid, 'quickButtons');
    await addDoc(ref, { ...data, order: Date.now(), createdAt: Timestamp.now() });
  }, [uid]);

  const updateButton = useCallback(async (id, data) => {
    if (!uid) return;
    await updateDoc(doc(db, 'users', uid, 'quickButtons', id), data);
  }, [uid]);

  const deleteButton = useCallback(async (id) => {
    if (!uid) return;
    await deleteDoc(doc(db, 'users', uid, 'quickButtons', id));
  }, [uid]);

  return { buttons, loading, addButton, updateButton, deleteButton };
}

// ── Gmail compose URL builder ─────────────────────────────────
// Opens Gmail in compose mode logged into the specified account.
// authuser index: 0 = first signed-in Google account, 1 = second, etc.
// Since we can't guarantee which index a given address is, we use the
// "from" account's email directly via the ?authuser= param with the email.
function buildGmailUrl(fromEmail, toEmail = '', subject = '', body = '') {
  const base = `https://mail.google.com/mail/u/${encodeURIComponent(fromEmail)}/#compose`;
  const params = new URLSearchParams();
  if (toEmail) params.set('to', toEmail);
  if (subject) params.set('su', subject);
  if (body) params.set('body', body);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

// ── Button Action ─────────────────────────────────────────────
function handleButtonClick(btn) {
  if (btn.type === 'email') {
    // Build mailto: link — opens Mac Mail app (or default mail client)
    const params = new URLSearchParams();
    if (btn.toEmail) params.set('to', btn.toEmail);
    if (btn.subject) params.set('subject', btn.subject);
    if (btn.bodyTemplate) params.set('body', btn.bodyTemplate);
    // from: is not supported by mailto: spec but we show it in the label
    const qs = params.toString();
    const url = `mailto:${btn.toEmail || ''}${qs ? '?' + qs : ''}`;
    window.location.href = url;
  } else if (btn.type === 'website') {
    const url = btn.url.startsWith('http') ? btn.url : `https://${btn.url}`;
    window.open(url, '_blank');
  }
}

// ── Button icon/label helpers ─────────────────────────────────
function ButtonIcon({ btn }) {
  if (btn.type === 'email') {
    return (
      <span style={{
        width: '20px', height: '20px', borderRadius: '4px',
        background: '#fbbf24', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '11px', flexShrink: 0,
      }}>✉</span>
    );
  }
  // Website: try favicon
  if (btn.favicon) {
    return (
      <img src={btn.favicon} alt="" width={18} height={18}
        style={{ borderRadius: '3px', objectFit: 'contain', flexShrink: 0 }}
        onError={(e) => { e.target.style.display = 'none'; }} />
    );
  }
  return <span style={{ fontSize: '16px', flexShrink: 0 }}>🔗</span>;
}

// ── Edit Modal ────────────────────────────────────────────────
function EditModal({ existing, onSave, onClose }) {
  const isNew = !existing;
  const [type, setType] = useState(existing?.type || 'email');
  const [label, setLabel] = useState(existing?.label || '');
  const [fromEmail, setFromEmail] = useState(existing?.fromEmail || '');
  const [toEmail, setToEmail] = useState(existing?.toEmail || '');
  const [subject, setSubject] = useState(existing?.subject || '');
  const [bodyTemplate, setBodyTemplate] = useState(existing?.bodyTemplate || '');
  const [url, setUrl] = useState(existing?.url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSave = async () => {
    if (!label.trim()) { setError('Label is required'); return; }
    if (type === 'website' && !url.trim()) { setError('URL is required'); return; }
    setSaving(true);
    setError(null);
    try {
      let favicon = null;
      if (type === 'website') {
        try {
          const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
          favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch {}
      }
      const data = {
        type, label: label.trim(),
        ...(type === 'email' ? { fromEmail: fromEmail.trim(), toEmail: toEmail.trim(), subject: subject.trim(), bodyTemplate: bodyTemplate.trim() } : {}),
        ...(type === 'website' ? { url: url.startsWith('http') ? url.trim() : `https://${url.trim()}`, favicon } : {}),
      };
      await onSave(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{isNew ? 'Add Quick Button' : 'Edit Quick Button'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
        </div>

        {/* Type selector */}
        <div style={{ marginBottom: '16px' }}>
          <label>Button Type</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'email', label: '✉ Send Email', desc: 'Opens your Mail app' },
              { id: 'website', label: '🔗 Open Website', desc: 'Open URL in new tab' },
            ].map((t) => (
              <button key={t.id} onClick={() => setType(t.id)}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  border: `2px solid ${type === t.id ? 'var(--accent)' : 'var(--border)'}`,
                  background: type === t.id ? 'var(--accent-light)' : 'white',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 150ms ease',
                }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: type === t.id ? 'var(--accent)' : 'var(--text-primary)' }}>{t.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Label */}
        <div style={{ marginBottom: '14px' }}>
          <label>Button Label *</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder={type === 'email' ? 'e.g. Work Gmail' : 'e.g. GitHub'} autoFocus />
        </div>

        {/* Email fields */}
        {type === 'email' && (
          <>
            <div style={{ marginBottom: '14px' }}>
              <label>Default To Address (optional — leave blank to pick recipient each time)</label>
              <input className="input" type="email" value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="recipient@example.com" />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label>Default Subject (optional)</label>
              <input className="input" value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Following up..." />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label>Default Body (optional)</label>
              <textarea className="input" value={bodyTemplate}
                onChange={(e) => setBodyTemplate(e.target.value)}
                placeholder="Hi, I wanted to reach out about..."
                rows={3} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', marginBottom: '14px' }}>
              💡 Clicking this button will open your Mac Mail app with a new compose window.
            </div>
          </>
        )}

        {/* Website fields */}
        {type === 'website' && (
          <div style={{ marginBottom: '14px' }}>
            <label>URL *</label>
            <input className="input" value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }} />
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--red)', fontSize: '12px', marginBottom: '12px', padding: '8px 12px', background: 'var(--red-light)', borderRadius: 'var(--radius-sm)' }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isNew ? 'Add Button' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main QuickStrip Component ─────────────────────────────────
export function QuickStrip({ uid }) {
  const { buttons, loading, addButton, updateButton, deleteButton } = useQuickButtons(uid);
  const [showModal, setShowModal] = useState(false);
  const [editingBtn, setEditingBtn] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleSave = async (data) => {
    if (editingBtn) {
      await updateButton(editingBtn.id, data);
    } else {
      await addButton(data);
    }
  };

  const handleDeleteClick = (e, id) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      deleteButton(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      // Auto-cancel after 3 seconds
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  return (
    <>
      <div className="quick-strip" aria-label="Quick actions">
        {/* Strip label */}
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0, paddingRight: '4px' }}>
          Quick Actions
        </span>
        <div style={{ width: '1px', height: '20px', background: 'var(--border)', flexShrink: 0 }} />

        {/* Buttons */}
        {loading ? (
          <div style={{ height: '34px', width: '120px', borderRadius: 'var(--radius-sm)' }} className="skeleton" />
        ) : (
          buttons.map((btn) => (
            <div key={btn.id} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              {/* The action button itself */}
              <button
                className={`quick-btn ${btn.type}`}
                onClick={() => handleButtonClick(btn)}
                title={btn.type === 'email' ? `Send from ${btn.fromEmail}` : btn.url}
              >
                <ButtonIcon btn={btn} />
                <span>{btn.label}</span>
              </button>

              {/* Edit / Delete controls — always visible as tiny icons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingBtn(btn); setShowModal(true); }}
                  title="Edit"
                  style={{
                    width: '16px', height: '16px', border: '1px solid var(--border)',
                    borderRadius: '3px', background: 'white', cursor: 'pointer',
                    fontSize: '9px', color: 'var(--text-muted)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: 0,
                  }}
                >✎</button>
                <button
                  onClick={(e) => handleDeleteClick(e, btn.id)}
                  title={confirmDeleteId === btn.id ? 'Click again to confirm' : 'Delete'}
                  style={{
                    width: '16px', height: '16px',
                    border: `1px solid ${confirmDeleteId === btn.id ? 'var(--red)' : 'var(--border)'}`,
                    borderRadius: '3px',
                    background: confirmDeleteId === btn.id ? 'var(--red-light)' : 'white',
                    cursor: 'pointer', fontSize: '9px',
                    color: confirmDeleteId === btn.id ? 'var(--red)' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                  }}
                >{confirmDeleteId === btn.id ? '✓' : '✕'}</button>
              </div>
            </div>
          ))
        )}

        {/* Add new button */}
        <button
          className="quick-btn add-new"
          onClick={() => { setEditingBtn(null); setShowModal(true); }}
        >
          + Add Button
        </button>
      </div>

      {/* Edit/Add Modal */}
      {showModal && (
        <EditModal
          existing={editingBtn}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingBtn(null); }}
        />
      )}
    </>
  );
}
