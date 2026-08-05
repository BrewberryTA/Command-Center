// src/components/TaskCard.jsx
import { useState } from 'react';
import { NotesLog } from './NotesLog.jsx';
import { FileUpload } from './FileUpload.jsx';
import { ClaudeAssist } from './ClaudeAssist.jsx';

const PRIORITY_COLORS = { High: 'red', Med: 'amber', Low: 'green' };
const STATUS_COLORS = {
  'Working on it': 'cyan',
  'No progress': 'muted',
  Stuck: 'red',
};
const TYPE_COLORS = {
  open: 'purple',
  event: 'cyan',
  daily: 'green',
  weekly: 'magenta',
  monthly: 'amber',
};

function formatTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(min) {
  if (!min) return '–';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function TaskCard({
  task,
  uid,
  onUpdate,
  onToggleComplete,
  onAddNote,
  onAddAttachment,
  onDelete,
  authorName,
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editField, setEditField] = useState(null); // which field is being edited inline
  const [editValue, setEditValue] = useState('');

  const handleFieldEdit = (field, currentValue) => {
    setEditField(field);
    setEditValue(currentValue ?? '');
  };

  const handleFieldSave = async () => {
    if (editField === null) return;
    await onUpdate(task.id, { [editField]: editField === 'duration' ? parseInt(editValue) || 0 : editValue });
    setEditField(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    await onDelete(task.id);
  };

  const noteCount = task.notes?.length || 0;
  const attachCount = task.attachments?.length || 0;

  return (
    <div
      className={`card ${task.rolledOver ? 'rolled-over-card' : ''}`}
      style={{
        marginBottom: '8px',
        opacity: task.completed ? 0.55 : 1,
        transition: 'opacity 200ms ease',
      }}
    >
      {/* Card Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '12px 14px',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Checkbox (for completable types) */}
        <div
          onClick={(e) => { e.stopPropagation(); onToggleComplete(task.id, task.completed); }}
          style={{
            width: '16px',
            height: '16px',
            minWidth: '16px',
            border: `1px solid ${task.completed ? 'var(--green)' : 'var(--border-active)'}`,
            borderRadius: 'var(--radius-sm)',
            background: task.completed ? 'var(--green)' : 'var(--bg-input)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: 'var(--bg-primary)',
            fontWeight: 'bold',
            marginTop: '1px',
            transition: 'all 200ms ease',
            flexShrink: 0,
          }}
        >
          {task.completed ? '✓' : ''}
        </div>

        {/* Title + badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
            <span
              style={{
                fontWeight: 600,
                fontSize: '13px',
                color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                textDecoration: task.completed ? 'line-through' : 'none',
                wordBreak: 'break-word',
              }}
            >
              {task.title}
            </span>
            {task.rolledOver && (
              <span className="badge badge-amber">↩ Rolled</span>
            )}
          </div>

          {/* Meta badges row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
            <span className={`badge badge-${TYPE_COLORS[task.type] || 'muted'}`}>
              {task.type}
            </span>
            {task.priority && (
              <span className={`badge badge-${PRIORITY_COLORS[task.priority] || 'muted'}`}>
                {task.priority}
              </span>
            )}
            {task.status && (
              <span className={`badge badge-${STATUS_COLORS[task.status] || 'muted'}`}>
                {task.status}
              </span>
            )}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-muted)',
                marginLeft: '2px',
              }}
            >
              ⏱ {formatDuration(task.duration)}
            </span>
            {task.dueDate && task.type === 'event' && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)' }}>
                @ {formatTime(task.dueDate)}
              </span>
            )}
            {noteCount > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                💬 {noteCount}
              </span>
            )}
            {attachCount > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                📎 {attachCount}
              </span>
            )}
          </div>
        </div>

        {/* Expand indicator */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--text-muted)',
            paddingTop: '2px',
            flexShrink: 0,
          }}
        >
          {expanded ? '▲' : '▼'}
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Editable Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {/* Title */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label>Title</label>
              {editField === 'title' ? (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    className="input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleFieldSave(); if (e.key === 'Escape') setEditField(null); }}
                    autoFocus
                  />
                  <button className="btn btn-primary" onClick={handleFieldSave}>OK</button>
                </div>
              ) : (
                <div
                  style={{ cursor: 'text', padding: '8px 0', color: 'var(--text-primary)', fontSize: '13px' }}
                  onClick={() => handleFieldEdit('title', task.title)}
                  title="Click to edit"
                >
                  {task.title} <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>✎</span>
                </div>
              )}
            </div>

            {/* Duration */}
            <div>
              <label>Duration (min)</label>
              {editField === 'duration' ? (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    className="input"
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleFieldSave(); if (e.key === 'Escape') setEditField(null); }}
                    autoFocus
                    min={1}
                  />
                  <button className="btn btn-primary" onClick={handleFieldSave}>OK</button>
                </div>
              ) : (
                <div
                  style={{ cursor: 'text', padding: '8px 0', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}
                  onClick={() => handleFieldEdit('duration', task.duration)}
                  title="Click to edit"
                >
                  {task.duration || 0} min <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>✎</span>
                </div>
              )}
            </div>

            {/* Priority (open tasks) */}
            {task.type === 'open' && (
              <div>
                <label>Priority</label>
                <select
                  className="input"
                  value={task.priority || 'Med'}
                  onChange={(e) => onUpdate(task.id, { priority: e.target.value })}
                >
                  <option>High</option>
                  <option>Med</option>
                  <option>Low</option>
                </select>
              </div>
            )}

            {/* Status (open tasks) */}
            {task.type === 'open' && (
              <div>
                <label>Status</label>
                <select
                  className="input"
                  value={task.status || 'No progress'}
                  onChange={(e) => onUpdate(task.id, { status: e.target.value })}
                >
                  <option>Working on it</option>
                  <option>No progress</option>
                  <option>Stuck</option>
                </select>
              </div>
            )}

            {/* Recurring day (weekly) */}
            {task.type === 'weekly' && (
              <div>
                <label>Day</label>
                <select
                  className="input"
                  value={task.recurringDay || 'Monday'}
                  onChange={(e) => onUpdate(task.id, { recurringDay: e.target.value })}
                >
                  {['Monday','Tuesday','Wednesday','Thursday','Friday'].map(d => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Recurring time (weekly) */}
            {task.type === 'weekly' && (
              <div>
                <label>Time</label>
                <input
                  className="input"
                  type="time"
                  value={task.recurringTime || '09:00'}
                  onChange={(e) => onUpdate(task.id, { recurringTime: e.target.value })}
                />
              </div>
            )}

            {/* Day of month (monthly) */}
            {task.type === 'monthly' && (
              <div>
                <label>Day of Month</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={31}
                  value={task.recurringDayOfMonth || 1}
                  onChange={(e) => onUpdate(task.id, { recurringDayOfMonth: parseInt(e.target.value) })}
                />
              </div>
            )}
          </div>

          {/* Claude Assistant */}
          <ClaudeAssist task={task} />

          {/* Notes Log */}
          <div>
            <div className="section-header" style={{ marginBottom: '8px' }}>
              💬 Notes
              <span className="count">{noteCount}</span>
            </div>
            <NotesLog
              task={task}
              notes={task.notes || []}
              onAddNote={(text, author) => onAddNote(task.id, text, author)}
              authorName={authorName}
            />
          </div>

          {/* File Attachments */}
          <div>
            <div className="section-header" style={{ marginBottom: '8px' }}>
              📎 Attachments
              <span className="count">{attachCount}</span>
            </div>
            <FileUpload
              uid={uid}
              taskId={task.id}
              attachments={task.attachments || []}
              onAttachmentAdded={(att) => onAddAttachment(task.id, att)}
            />
          </div>

          {/* Delete */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {confirmDelete ? (
              <div className="confirm-delete">
                <span>Delete this task?</span>
                <button
                  className="btn btn-danger"
                  style={{ padding: '2px 8px', fontSize: '10px' }}
                  onClick={handleDelete}
                >
                  YES, DELETE
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '2px 8px', fontSize: '10px' }}
                  onClick={() => setConfirmDelete(false)}
                >
                  CANCEL
                </button>
              </div>
            ) : (
              <button className="btn btn-danger" onClick={handleDelete}>
                🗑 DELETE
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
