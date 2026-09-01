import { useState } from 'react';
// src/components/BriefMe.jsx
// One-click daily brief. Assembles the whole board into a text dump,
// prepends a fixed prompt, copies it to the clipboard and opens claude.ai.
// No API key, no cost — uses your existing Claude subscription.

// ── The prompt ────────────────────────────────────────────────
// Edit this block to change what the brief asks for.
const BRIEF_PROMPT = `You have my full Command Center dump below: open tasks with priority,
status, days on board, days since last edit, days since last status change,
notes, today's calendar, and today's food log.

Your job is to get me moving, not to summarize my list back to me. I can
already see my list.

1. THE ORDER
Give me a specific sequence for today, not a ranked list of importance.
Actual order of operations: what I open first, what comes after it, what
waits until afternoon. Account for meetings already on the calendar, and
put anything requiring real focus before the first one. Estimate how far
down the list I'll realistically get. If the day doesn't fit, say which
items fall off rather than pretending they compress.

2. NOISE OR SIGNAL
For every task where priority AND status have gone unchanged for 5+ days,
ask me directly: is this noise or signal? Then take a position. If it's
been sitting untouched at Med with no notes for two weeks, it's noise and
you should tell me to delete it. If it's High and Stuck and I keep not
touching it, that's avoidance and you should name it. Don't hedge with
"you may want to consider." Pick one: do it today, hand it off, schedule
it with a real date, or kill it.

3. THE ONE I'M AVOIDING
Identify the single task I'm most likely dodging. Stuck longer than the
others, high priority, low activity, or notes that read like excuses. Say
what you think the actual blocker is, and give me the smallest possible
first action — something under fifteen minutes that breaks the seal.

4. WHAT I'M NOT SEEING
Anything the list itself reveals: work I'm generating faster than
finishing, a category piling up, a pattern across dates.

RULES
Be blunt. Skip preamble and encouragement. No "great job staying
organized." If my board is a mess, say so. If I'm busy but not productive,
say that. Cite specific task titles and day counts — never speak in
generalities. Keep the whole thing short enough to read standing up.

NOTE ON DATA: activity tracking started 2026-09-01. Any task showing
"not tracked yet" for last-edit or status-change simply predates that,
so treat it as unknown rather than stale.

────────────────────────────────────────────────────────────────
`;

// ── Helpers ───────────────────────────────────────────────────

function daysSince(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today - start) / 86400000);
}

function ageLabel(date, label) {
  const n = daysSince(date);
  if (n === null) return `${label}: not tracked yet`;
  if (n === 0) return `${label}: today`;
  if (n === 1) return `${label}: 1 day ago`;
  return `${label}: ${n} days ago`;
}

function fmtDate(date) {
  if (!date) return 'none';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return 'none';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function describeTask(task) {
  const bits = [];
  bits.push(`- ${task.title || '(untitled)'}`);

  const meta = [
    `type: ${task.type || 'open'}`,
    `priority: ${task.priority || 'Med'}`,
    `status: ${task.status || 'No progress'}`,
  ];
  if (task.duration) meta.push(`est: ${task.duration}m`);
  if (task.dueDate) meta.push(`due: ${fmtDate(task.dueDate)}`);
  if (task.rolledOver) meta.push('ROLLED OVER');
  bits.push(`    ${meta.join(' | ')}`);

  const onBoard = daysSince(task.createdAt);
  const activity = [
    onBoard === null ? 'on board: unknown' : `on board: ${onBoard} days`,
    ageLabel(task.lastTouchedAt, 'last edited'),
    ageLabel(task.statusChangedAt, 'status changed'),
    ageLabel(task.priorityChangedAt, 'priority changed'),
  ];
  bits.push(`    ${activity.join(' | ')}`);

  const notes = task.notes || [];
  if (notes.length > 0) {
    const last = notes[notes.length - 1];
    const when = daysSince(last.timestamp);
    const whenLabel = when === null ? '' : when === 0 ? 'today' : `${when}d ago`;
    const text = (last.text || '').replace(/\s+/g, ' ').trim();
    bits.push(`    notes: ${notes.length} | latest (${whenLabel}): "${text}"`);
  } else {
    bits.push('    notes: none');
  }

  return bits.join('\n');
}

function section(title, tasks) {
  if (!tasks || tasks.length === 0) return `${title}: none\n`;
  return `${title} (${tasks.length}):\n${tasks.map(describeTask).join('\n')}\n`;
}

// ── Dump builder ──────────────────────────────────────────────

export function buildBrief({ allTasks = [], todayTasks = {}, calendarEvents = [] }) {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const {
    open = [], events = [], daily = [], weekly = [], monthly = [], rolledOver = [],
  } = todayTasks;

  // IDs already shown in a today-section, so the backlog block doesn't repeat them
  const shown = new Set(
    [...open, ...events, ...daily, ...weekly, ...monthly, ...rolledOver].map((t) => t.id)
  );

  const backlog = allTasks.filter((t) => !t.completed && !shown.has(t.id));

  // Completed in the last 7 days — shows momentum vs. what just sits
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentlyDone = allTasks.filter(
    (t) => t.completed && t.completedDate && new Date(t.completedDate) >= weekAgo
  );

  const gcalToday = calendarEvents
    .filter((e) => {
      if (!e.startDate || !e.title || e.title === '(No title)') return false;
      const d = new Date(e.startDate);
      return d >= today && d < tomorrow;
    })
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  const lines = [];

  lines.push(`DATE: ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`);
  lines.push(`TIME OF REQUEST: ${fmtTime(now)}`);
  lines.push('');

  lines.push('══ TODAY ══');
  lines.push('');
  lines.push(section('ROLLED OVER (past due, still open)', rolledOver));
  lines.push(section('OPEN TASKS DUE TODAY', open));
  lines.push(section('EVENTS (in-app)', events));
  lines.push(section('DAILY RECURRING', daily));
  lines.push(section('WEEKLY RECURRING', weekly));
  lines.push(section('MONTHLY RECURRING', monthly));

  lines.push('══ GOOGLE CALENDAR TODAY ══');
  if (gcalToday.length === 0) {
    lines.push('none\n');
  } else {
    gcalToday.forEach((e) => {
      const t = fmtTime(e.startDate);
      const dur = e.duration ? ` (${e.duration}m)` : '';
      lines.push(`- ${t}${dur} — ${e.title}`);
    });
    lines.push('');
  }

  lines.push('══ REST OF THE BOARD (open, not scheduled for today) ══');
  lines.push(section('BACKLOG', backlog));

  lines.push('══ COMPLETED IN LAST 7 DAYS ══');
  if (recentlyDone.length === 0) {
    lines.push('none\n');
  } else {
    recentlyDone.forEach((t) => {
      lines.push(`- ${t.title || '(untitled)'} — closed ${fmtDate(t.completedDate)}`);
    });
    lines.push('');
  }

  lines.push('══ FOOD LOG TODAY ══');
  lines.push('not yet tracked — food panel not built\n');

  const counts = {
    openTotal: allTasks.filter((t) => !t.completed).length,
    doneWeek: recentlyDone.length,
  };
  lines.push('══ COUNTS ══');
  lines.push(`open tasks total: ${counts.openTotal} | closed last 7 days: ${counts.doneWeek}`);

  return `${BRIEF_PROMPT}\n${lines.join('\n')}`;
}

// ── Component ─────────────────────────────────────────────────

// Synchronous clipboard write. Must run BEFORE window.open() — opening a tab
// removes focus from this document, and navigator.clipboard.writeText refuses
// to run on an unfocused document. execCommand is deprecated but it is
// synchronous and has no focus requirement, which is exactly what we need here.
function copySync(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.width = '1px';
    ta.style.height = '1px';
    ta.style.padding = '0';
    ta.style.border = 'none';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (err) {
    console.error('[BriefMe] copySync failed:', err);
    return false;
  }
}

export function BriefMe({ allTasks = [], todayTasks = {}, calendarEvents = [] }) {
  const [state, setState] = useState('idle'); // idle | copied | failed
  const [fallbackText, setFallbackText] = useState('');

  const handleClick = () => {
    let text;
    try {
      text = buildBrief({ allTasks, todayTasks, calendarEvents });
    } catch (err) {
      console.error('[BriefMe] Failed to build brief:', err);
      setFallbackText('Could not assemble the brief. Check the browser console.');
      setState('failed');
      return;
    }

    // 1. Copy first, while this tab still has focus.
    const ok = copySync(text);

    // 2. Belt and braces — also try the modern API. Harmless if it fails.
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }

    if (ok) {
      setState('copied');
      // 3. Only open Claude once we know the text is on the clipboard.
      window.open('https://claude.ai/new', '_blank', 'noopener');
      setTimeout(() => setState('idle'), 15000);
    } else {
      // Copy failed — stay on this tab so the manual fallback is visible
      // instead of hiding behind a tab the user was just sent to.
      setFallbackText(text);
      setState('failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
      <button
        onClick={handleClick}
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '7px 14px',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 3px rgba(124,58,237,0.35)',
        }}
        title="Copy the whole board + prompt to your clipboard and open Claude"
      >
        ⚡ BRIEF ME
      </button>

      {state === 'copied' && (
        <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 600 }}>
          Copied — paste into the Claude tab (Ctrl+V) and hit enter
        </span>
      )}

      {state === 'failed' && (
        <div style={{ width: '100%', maxWidth: '520px' }}>
          <div style={{ fontSize: '11px', color: 'var(--amber, #b45309)', marginBottom: '4px' }}>
            Clipboard blocked — select all below, copy, then open Claude:
          </div>
          <textarea
            readOnly
            value={fallbackText}
            onFocus={(e) => e.target.select()}
            rows={6}
            style={{
              width: '100%',
              fontSize: '10px',
              fontFamily: 'monospace',
              border: '1px solid #e0d9f7',
              borderRadius: '6px',
              padding: '6px',
            }}
          />
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '2px' }}>
            <a
              href="https://claude.ai/new"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 600 }}
            >
              open claude.ai →
            </a>
            <button
              onClick={() => { setState('idle'); setFallbackText(''); }}
              style={{
                background: 'none', border: 'none', color: '#9ca3af',
                fontSize: '11px', cursor: 'pointer',
              }}
            >
              dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
