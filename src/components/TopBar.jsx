// src/components/TopBar.jsx
import { useState, useEffect } from 'react';

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function TopBar({ todayTasks, user, onSignOut }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalMinutes = todayTasks
    ? [
        ...(todayTasks.open || []),
        ...(todayTasks.events || []),
        ...(todayTasks.daily || []),
        ...(todayTasks.weekly || []),
        ...(todayTasks.monthly || []),
      ].reduce((sum, t) => sum + (t.duration || 0), 0)
    : 0;

  const overloaded = totalMinutes > 480;

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'white',
      borderBottom: '1px solid var(--border)',
      height: '56px',
      display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: '16px',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'var(--accent)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'white', fontSize: '16px', fontWeight: 700,
        }}>⌘</div>
        <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Command Center
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '24px', background: 'var(--border)', flexShrink: 0 }} />

      {/* Clock + Date */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
          {formatTime(now)}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          {formatDate(now)}
        </div>
      </div>

      {/* Workload + User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        {/* Workload badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 12px', borderRadius: '100px',
          background: overloaded ? 'var(--red-light)' : 'var(--green-light)',
          border: `1px solid ${overloaded ? '#fca5a5' : '#6ee7b7'}`,
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Today:</span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600,
            color: overloaded ? 'var(--red)' : 'var(--green)',
          }}>
            {formatDuration(totalMinutes)}
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />

        {/* User */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName}
                style={{ width: '30px', height: '30px', borderRadius: '50%', border: '2px solid var(--border)' }} />
            ) : (
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'var(--accent-light)', border: '2px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 600, color: 'var(--accent)',
              }}>
                {user.displayName?.[0] || 'U'}
              </div>
            )}
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user.displayName?.split(' ')[0]}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onSignOut} style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
