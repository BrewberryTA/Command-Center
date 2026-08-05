// src/components/NewGCalEvent.jsx
// Quick "create event in Google Calendar" button.
// Opens Google Calendar's new event form pre-filled with title, date, and time.

import { useState } from 'react';

function toGCalDate(dateStr, timeStr) {
  // Returns a date string in Google Calendar URL format: YYYYMMDDTHHMMSS
  if (!dateStr) return '';
  const date = dateStr.replace(/-/g, '');
  if (!timeStr) return date;
  const time = timeStr.replace(/:/g, '') + '00';
  return `${date}T${time}`;
}

function addOneHour(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const end = new Date(2000, 0, 1, h + 1, m);
  return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
}

export function NewGCalEvent({ linkedAccounts = [] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [account, setAccount] = useState(linkedAccounts[0] || '');

  const handleOpen = () => {
    // Reset end time to 1hr after start
    setEndTime(addOneHour(startTime));
    setOpen(true);
  };

  const handleStartTimeChange = (val) => {
    setStartTime(val);
    setEndTime(addOneHour(val));
  };

  const handleCreate = () => {
    const start = toGCalDate(date, startTime);
    const end = toGCalDate(date, endTime);
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title || 'New Event',
      dates: `${start}/${end}`,
    });
    if (account) params.set('src', account);
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
    setOpen(false);
    setTitle('');
  };

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        style={{
          background: 'var(--accent)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '6px 14px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'opacity 150ms ease',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        + New Event
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '12px',
          padding: '24px', width: '380px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            📅 New Calendar Event
          </h3>
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px' }}>✕</button>
        </div>

        {/* Title */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
            Event Title
          </label>
          <input
            autoFocus
            className="input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="e.g. Team meeting, Dentist, Call with client..."
            style={{ width: '100%' }}
          />
        </div>

        {/* Date */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
            Date
          </label>
          <input
            type="date"
            className="input"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
              Start Time
            </label>
            <input
              type="time"
              className="input"
              value={startTime}
              onChange={e => handleStartTimeChange(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
              End Time
            </label>
            <input
              type="time"
              className="input"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Calendar account */}
        {linkedAccounts.length > 1 && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
              Calendar Account
            </label>
            <select
              className="input"
              value={account}
              onChange={e => setAccount(e.target.value)}
              style={{ width: '100%' }}
            >
              {linkedAccounts.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px', padding: '8px 10px', background: 'var(--bg-primary)', borderRadius: '6px' }}>
          💡 Opens Google Calendar with this event pre-filled — you can add guests, location, and notes before saving.
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={() => setOpen(false)} className="btn btn-secondary">Cancel</button>
          <button onClick={handleCreate} className="btn btn-primary">Open in Google Calendar →</button>
        </div>
      </div>
    </div>
  );
}
