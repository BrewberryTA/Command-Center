// src/components/TaskModal.jsx
import { useState, useEffect, useRef } from 'react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const defaultTask = {
  type: 'open',
  title: '',
  priority: 'Med',
  status: 'No progress',
  duration: 30,
  dueDate: '',
  recurringDay: 'Monday',
  recurringTime: '09:00',
  recurringDayOfMonth: 1,
  weekdaysOnly: false,
};

export function TaskModal({ onClose, onSave }) {
  const [form, setForm] = useState(defaultTask);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const firstInputRef = useRef();

  // Focus trap
  useEffect(() => {
    firstInputRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Set default dueDate to today on open tasks
  useEffect(() => {
    if (form.type === 'open' || form.type === 'event') {
      const today = new Date().toISOString().slice(0, 10);
      setForm((f) => ({ ...f, dueDate: f.dueDate || today }));
    }
  }, [form.type]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form };
      // Convert dueDate string to Date
      if (payload.dueDate) {
        payload.dueDate = new Date(payload.dueDate + 'T00:00:00');
      } else {
        payload.dueDate = null;
      }
      payload.duration = parseInt(payload.duration) || 30;
      payload.recurringDayOfMonth = parseInt(payload.recurringDayOfMonth) || 1;
      await onSave(payload);
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
      aria-label="New Task"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-box" style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', letterSpacing: '0.1em', color: 'var(--cyan)' }}>
            + NEW TASK
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Task Type Selector */}
        <div style={{ marginBottom: '16px' }}>
          <label>Task Type</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['open', 'event', 'daily', 'weekly', 'monthly'].map((t) => (
              <button
                key={t}
                onClick={() => set('type', t)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${form.type === t ? 'var(--cyan)' : 'var(--border)'}`,
                  background: form.type === t ? 'var(--cyan)' : 'transparent',
                  color: form.type === t ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  transition: 'all 200ms ease',
                  boxShadow: form.type === t ? 'var(--glow-cyan)' : 'none',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: '14px' }}>
          <label>Title *</label>
          <input
            ref={firstInputRef}
            className="input"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Task title..."
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          />
        </div>

        {/* Duration */}
        <div style={{ marginBottom: '14px' }}>
          <label>Duration (minutes)</label>
          <input
            className="input"
            type="number"
            min={1}
            value={form.duration}
            onChange={(e) => set('duration', e.target.value)}
            placeholder="30"
          />
        </div>

        {/* Open Task fields */}
        {form.type === 'open' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label>Priority</label>
                <select className="input" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                  <option>High</option>
                  <option>Med</option>
                  <option>Low</option>
                </select>
              </div>
              <div>
                <label>Status</label>
                <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                  <option>Working on it</option>
                  <option>No progress</option>
                  <option>Stuck</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label>Due Date</label>
              <input
                className="input"
                type="date"
                value={form.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
              />
            </div>
          </>
        )}

        {/* Event fields */}
        {form.type === 'event' && (
          <div style={{ marginBottom: '14px' }}>
            <label>Date & Time</label>
            <input
              className="input"
              type="datetime-local"
              value={form.dueDate}
              onChange={(e) => set('dueDate', e.target.value)}
            />
          </div>
        )}

        {/* Daily fields */}
        {form.type === 'daily' && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.weekdaysOnly || false}
                onChange={(e) => set('weekdaysOnly', e.target.checked)}
              />
              Weekdays only (Mon–Fri)
            </label>
          </div>
        )}

        {/* Weekly fields */}
        {form.type === 'weekly' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label>Day of Week</label>
              <select className="input" value={form.recurringDay} onChange={(e) => set('recurringDay', e.target.value)}>
                {DAYS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label>Time</label>
              <input className="input" type="time" value={form.recurringTime} onChange={(e) => set('recurringTime', e.target.value)} />
            </div>
          </div>
        )}

        {/* Monthly fields */}
        {form.type === 'monthly' && (
          <div style={{ marginBottom: '14px' }}>
            <label>Day of Month (1–31)</label>
            <input
              className="input"
              type="number"
              min={1}
              max={31}
              value={form.recurringDayOfMonth}
              onChange={(e) => set('recurringDayOfMonth', e.target.value)}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ color: 'var(--red)', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '12px' }}>
            ⚠ {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            CANCEL
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'SAVING...' : 'CREATE TASK'}
          </button>
        </div>
      </div>
    </div>
  );
}
