// src/components/CalendarView.jsx
// Multi-account Google Calendar view.
// Each Google account is added separately via OAuth popup.
// All calendars from all accounts appear on the same grid.

import { useState } from 'react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isSameDay(a, b) {
  if (!a || !b) return false;
  const da = a instanceof Date ? a : new Date(a);
  const db = b instanceof Date ? b : new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

function formatTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function CalendarView({
  tasks = [],
  linkedCalendars = [],
  linkedAccounts = [],
  accountTokens = {},
  events: calEvents = [],
  currentMonth,
  onPrevMonth,
  onNextMonth,
  onAddAccount,
  onRemoveAccount,
  onToggleCalendar,
  onRefreshToken,
  loading,
  error,
}) {
  const [selectedDay, setSelectedDay] = useState(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date();

  // Native app tasks that are events
  const nativeEvents = tasks
    .filter((t) => t.type === 'event')
    .map((t) => ({ ...t, startDate: t.dueDate, _color: 'var(--accent-2)', _source: 'native' }));

  const allEvents = [...nativeEvents, ...calEvents];

  const getEventsForDay = (day) => {
    const date = new Date(year, month, day);
    return allEvents.filter((e) => isSameDay(e.startDate, date));
  };

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  // Build calendar cells
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const d = i - firstDay + 1;
    return d > 0 && d <= daysInMonth ? d : null;
  });

  // Group linked calendars by account
  const calsByAccount = {};
  linkedCalendars.forEach((cal) => {
    const acct = cal.accountEmail || 'unknown';
    if (!calsByAccount[acct]) calsByAccount[acct] = [];
    calsByAccount[acct].push(cal);
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
      {/* LEFT: Calendar Grid */}
      <div>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button className="btn btn-secondary" onClick={onPrevMonth}>◀</button>
          <span style={{ fontWeight: 600, fontSize: '15px', letterSpacing: '-0.01em' }}>
            {monthName.toUpperCase()}
          </span>
          <button className="btn btn-secondary" onClick={onNextMonth}>▶</button>
        </div>

        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
          {WEEKDAYS.map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} style={{ minHeight: '70px' }} />;
            const dayEvents = getEventsForDay(day);
            const isToday = isSameDay(new Date(year, month, day), today);
            const isSelected = selectedDay === day;
            return (
              <div
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                style={{
                  minHeight: '70px', padding: '6px',
                  background: isSelected ? 'var(--accent-light)' : isToday ? '#f0f9ff' : 'white',
                  border: `1px solid ${isSelected ? 'var(--accent)' : isToday ? '#93c5fd' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  transition: 'all 150ms ease',
                  boxShadow: isSelected ? '0 0 0 2px var(--accent)22' : 'none',
                }}
              >
                <div style={{
                  fontSize: '12px', fontWeight: isToday ? 700 : 400,
                  color: isToday ? 'var(--accent)' : 'var(--text-secondary)',
                  marginBottom: '4px',
                  background: isToday ? 'var(--accent)' : 'transparent',
                  color: isToday ? 'white' : 'var(--text-secondary)',
                  width: isToday ? '22px' : 'auto', height: isToday ? '22px' : 'auto',
                  borderRadius: isToday ? '50%' : '0',
                  display: 'flex', alignItems: 'center', justifyContent: isToday ? 'center' : 'flex-start',
                }}>
                  {day}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                  {dayEvents.slice(0, 4).map((e, i) => (
                    <div key={i} style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: e._color || 'var(--accent)', flexShrink: 0,
                    }} />
                  ))}
                  {dayEvents.length > 4 && (
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>+{dayEvents.length - 4}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{ marginTop: '12px', color: 'var(--red)', fontSize: '12px', padding: '8px 12px', background: 'var(--red-light)', borderRadius: 'var(--radius-sm)' }}>
            ⚠ {error}
          </div>
        )}
      </div>

      {/* RIGHT: Side panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Google Accounts Panel */}
        <div className="card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Google Calendars
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={onAddAccount}
              disabled={loading}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              {loading ? '...' : '+ Add Account'}
            </button>
          </div>

          {linkedAccounts.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
              No accounts linked yet.<br />
              Click "+ Add Account" to connect a Google account.
            </div>
          ) : (
            linkedAccounts.map((accountEmail) => {
              const acctCals = calsByAccount[accountEmail] || [];
              const hasToken = !!accountTokens[accountEmail];
              return (
                <div key={accountEmail} style={{ marginBottom: '12px' }}>
                  {/* Account header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', padding: '6px 8px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: 'var(--accent)', flexShrink: 0 }}>
                      {accountEmail[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {accountEmail}
                      </div>
                      {!hasToken && (
                        <div style={{ fontSize: '10px', color: 'var(--amber)' }}>
                          Session expired —{' '}
                          <button onClick={() => onRefreshToken(accountEmail)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '10px', padding: 0 }}>
                            Reconnect
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onRemoveAccount(accountEmail)}
                      title="Remove this account"
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '0 2px' }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Calendars for this account */}
                  {acctCals.map((cal) => (
                    <div key={cal.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px 5px 14px', marginBottom: '3px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cal.backgroundColor || '#4285f4', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: '11px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cal.summary}
                      </span>
                      <input
                        type="checkbox"
                        checked={cal.enabled !== false}
                        onChange={(e) => onToggleCalendar(cal.id, e.target.checked)}
                        className="checkbox-custom"
                        style={{ width: '14px', height: '14px', minWidth: '14px' }}
                      />
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>

        {/* Day Events Panel */}
        <div className="card" style={{ padding: '14px', flex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            {selectedDay ? `${currentMonth.toLocaleDateString('en-US', { month: 'long' })} ${selectedDay}` : 'Select a day'}
          </div>

          {!selectedDay ? (
            <div className="empty-state" style={{ padding: '24px 12px' }}>
              <span className="icon">📅</span>
              Click a day to see events
            </div>
          ) : selectedDayEvents.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 12px' }}>
              <span className="icon">◌</span>
              No events on this day
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedDayEvents
                .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                .map((evt, idx) => (
                  <div key={idx} style={{
                    padding: '8px 10px', background: 'var(--bg-primary)',
                    borderLeft: `3px solid ${evt._color || 'var(--accent)'}`,
                    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {evt.title}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {evt.startDate && (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {formatTime(evt.startDate)}
                        </span>
                      )}
                      {evt.duration && (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>⏱ {evt.duration}m</span>
                      )}
                      {evt._accountEmail && (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>
                          {evt._accountEmail}
                        </span>
                      )}
                    </div>
                    {evt.htmlLink && (
                      <a href={evt.htmlLink} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '10px', color: 'var(--accent)', textDecoration: 'none', display: 'block', marginTop: '4px' }}>
                        Open in Google Calendar ↗
                      </a>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
