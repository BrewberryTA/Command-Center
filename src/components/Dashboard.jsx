// src/components/Dashboard.jsx
import { useState } from 'react';
import { TaskCard } from './TaskCard.jsx';
import { exportTodayToPDF } from '../lib/pdfExport.js';
import { ClaudeAssist } from './ClaudeAssist.jsx';
import { BriefMe } from './BriefMe.jsx';

function SectionHeader({ title, color, count }) {
  return (
    <div className="section-header" style={{ color: color || 'var(--text-secondary)' }}>
      <span>{title}</span>
      <span className="count">{count}</span>
    </div>
  );
}

function EmptySection({ message }) {
  return (
    <div className="empty-state">
      <span className="icon">◌</span>
      {message}
    </div>
  );
}

function SkeletonCard() {
  return <div className="skeleton" style={{ height: '62px', marginBottom: '8px', borderRadius: 'var(--radius)' }} />;
}

function GCalEventCard({ evt, isComplete, onToggle }) {
  const time = evt.startDate
    ? new Date(evt.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const evtDate = evt.startDate ? new Date(evt.startDate) : null;
  const isPast = evtDate && evtDate < today;

  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${isComplete ? 'var(--green)' : (evt._color || 'var(--accent)')}`,
      borderRadius: 'var(--radius)',
      padding: '10px 14px',
      marginBottom: '8px',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      opacity: isComplete ? 0.6 : 1,
      transition: 'all 200ms ease',
    }}>
      <div
        onClick={() => onToggle(evt.id, evt.title, isComplete)}
        style={{
          width: '18px', height: '18px', minWidth: '18px',
          border: `2px solid ${isComplete ? 'var(--green)' : 'var(--border-active)'}`,
          borderRadius: '4px',
          background: isComplete ? 'var(--green)' : 'white',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', color: 'white', fontWeight: 'bold',
          transition: 'all 150ms ease', flexShrink: 0,
        }}
      >
        {isComplete ? '✓' : ''}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontWeight: 600, fontSize: '13px',
            color: isComplete ? 'var(--text-muted)' : 'var(--text-primary)',
            textDecoration: isComplete ? 'line-through' : 'none',
          }}>
            {evt.title}
          </span>
          <span className="badge badge-blue" style={{ fontSize: '10px' }}>GCal</span>
          {isPast && !isComplete && (
            <span className="badge badge-amber" style={{ fontSize: '10px' }}>↩ From {evtDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          )}
          {time && (
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>@ {time}</span>
          )}
          {evt.duration && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>⏱ {evt.duration}m</span>
          )}
        </div>
        {evt._accountEmail && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {evt._accountEmail}
          </div>
        )}
      </div>
      <ClaudeAssist task={{ title: evt.title, type: 'calendar event', notes: [] }} />
    </div>
  );
}

export function Dashboard({
  todayTasks,
  allTasks = [],
  calendarEvents = [],
  gcalCompletions = {},
  onGCalToggle,
  loading,
  uid,
  onUpdate,
  onToggleComplete,
  onAddNote,
  onAddAttachment,
  onDelete,
  authorName,
}) {
  const { open = [], events = [], daily = [], weekly = [], monthly = [], rolledOver = [] } = todayTasks || {};

  const [taskSort, setTaskSort] = useState('priority');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const seen = new Set();
  const relevantGCalEvents = calendarEvents.filter((e) => {
    if (!e.startDate) return false;
    if (!e.title || e.title === '(No title)') return false;
    const d = new Date(e.startDate);
    const isToday = d >= today && d < tomorrow;
    const isPastAndIncomplete = d < today && !gcalCompletions[e.id];
    if (!isToday && !isPastAndIncomplete) return false;
    const uniqueKey = `${e.title}__${d.toISOString()}`;
    if (seen.has(uniqueKey)) return false;
    seen.add(uniqueKey);
    return true;
  }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  const sortByPriority = (tasks) => {
    const order = { High: 0, Med: 1, Low: 2 };
    return [...tasks].sort((a, b) => (order[a.priority] ?? 1) - (order[b.priority] ?? 1));
  };

  const sortByDateAdded = (tasks) => {
    return [...tasks].sort((a, b) => {
      const ca = a.createdAt ? new Date(a.createdAt) : new Date(8640000000000000);
      const cb = b.createdAt ? new Date(b.createdAt) : new Date(8640000000000000);
      return ca - cb;
    });
  };

  // Open Tasks now includes future-dated and no-due-date items alongside
  // today's, so a due-date sort is what actually surfaces "what's next"
  // once today's list is cleared. No due date sorts to the end.
  const sortByDueDate = (tasks) => {
    const far = new Date(8640000000000000);
    return [...tasks].sort((a, b) => {
      const da = a.dueDate ? new Date(a.dueDate) : far;
      const db = b.dueDate ? new Date(b.dueDate) : far;
      return da - db;
    });
  };

  const sortByTime = (tasks) => {
    return [...tasks].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  };

  const sortTasksColumn = (tasks) => {
    if (taskSort === 'dateAdded') return sortByDateAdded(tasks);
    if (taskSort === 'dueDate') return sortByDueDate(tasks);
    return sortByPriority(tasks);
  };

  const handleExportPDF = async () => {
    try {
      await exportTodayToPDF({
        rolledOver, openTasks: sortByPriority(open),
        events: sortByTime(events), dailyItems: daily,
        weeklyItems: weekly, monthlyItems: monthly,
      });
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  const taskCardProps = (task) => ({
    key: task.id, task, uid, onUpdate, onToggleComplete,
    onAddNote, onAddAttachment, onDelete, authorName,
  });

  if (loading) {
    return <div>{[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}</div>;
  }

  const gcalEventCount = relevantGCalEvents.filter(e => !gcalCompletions[e.id]).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={handleExportPDF}>📄 EXPORT TO PDF</button>
        <BriefMe allTasks={allTasks} todayTasks={todayTasks} calendarEvents={calendarEvents} />
      </div>

      <div className="dashboard-swipe-hint">
        <span>← swipe between Tasks / Recurring / Calendar →</span>
      </div>

      <div className="dashboard-columns">
        <div className="dashboard-column">
          <div
            className="dashboard-column-title"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
          >
            <span>Tasks</span>
            <select
              className="input"
              value={taskSort}
              onChange={(e) => setTaskSort(e.target.value)}
              title="Sort Open Tasks & Rolled Over"
              style={{
                fontSize: '10px',
                padding: '3px 6px',
                minWidth: 0,
                width: 'auto',
                fontFamily: 'var(--font-mono)',
                textTransform: 'none',
              }}
            >
              <option value="priority">Sort: Priority</option>
              <option value="dueDate">Sort: Due Date</option>
              <option value="dateAdded">Sort: Date Added</option>
            </select>
          </div>

          {rolledOver.length > 0 && (
            <section style={{ marginBottom: '24px' }}>
              <SectionHeader title="↩ Rolled Over" color="var(--amber)" count={rolledOver.length} />
              {sortTasksColumn(rolledOver).map((task) => <TaskCard {...taskCardProps(task)} />)}
            </section>
          )}

          <section style={{ marginBottom: '24px' }}>
            <SectionHeader title="Open Tasks" count={open.length} />
            {open.length === 0
              ? <EmptySection message="No open tasks today" />
              : sortTasksColumn(open).map((task) => <TaskCard {...taskCardProps(task)} />)
            }
          </section>
        </div>

        <div className="dashboard-column">
          <div className="dashboard-column-title">Recurring</div>

          <section style={{ marginBottom: '24px' }}>
            <SectionHeader title="Daily Items" color="var(--green)" count={daily.length} />
            {daily.length === 0
              ? <EmptySection message="No daily items configured — add them in the Tasks tab" />
              : daily.map((task) => <TaskCard {...taskCardProps(task)} />)
            }
          </section>

          <section style={{ marginBottom: '24px' }}>
            <SectionHeader title="Weekly Items" color="var(--accent-2)" count={weekly.length} />
            {weekly.length === 0
              ? <EmptySection message="No weekly items for today — add them in the Tasks tab" />
              : weekly.map((task) => <TaskCard {...taskCardProps(task)} />)
            }
          </section>

          <section style={{ marginBottom: '24px' }}>
            <SectionHeader title="Monthly Items" color="var(--amber)" count={monthly.length} />
            {monthly.length === 0
              ? <EmptySection message="No monthly items for today — add them in the Tasks tab" />
              : monthly.map((task) => <TaskCard {...taskCardProps(task)} />)
            }
          </section>
        </div>

        <div className="dashboard-column">
          <div className="dashboard-column-title">Calendar</div>

          <section style={{ marginBottom: '24px' }}>
            <SectionHeader
              title="Calendar Events"
              color="var(--accent)"
              count={events.length + gcalEventCount}
            />
            {events.length === 0 && relevantGCalEvents.length === 0 ? (
              <EmptySection message="No events scheduled today" />
            ) : (
              <>
                {sortByTime(events).map((task) => <TaskCard {...taskCardProps(task)} />)}
                {relevantGCalEvents
                  .filter((evt) => !gcalCompletions[evt.id])
                  .map((evt) => (
                    <GCalEventCard
                      key={`${evt._accountEmail}__${evt.id}`}
                      evt={evt}
                      isComplete={false}
                      onToggle={onGCalToggle}
                    />
                  ))}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
