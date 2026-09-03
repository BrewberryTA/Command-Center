import { useState } from 'react';
// src/components/BriefMe.jsx
// One-click daily brief. Assembles the whole board into a text dump,
// prepends a fixed prompt, copies it to the clipboard and opens claude.ai.
// No API key, no cost — uses your existing Claude subscription.

const BRIEF_PROMPT = `You have my full Command Center dump below: every open task with priority,
status, days on board, activity timestamps, notes, today's calendar, and my
food log.

Do TWO things, in this order.

═══════════════════════════════════════════════════════════════
PART 1 — THE BRIEF (in chat, short)
═══════════════════════════════════════════════════════════════

A. THE ORDER
A specific sequence for today, not a ranked list of importance. What I open
first, what comes after it, what waits until afternoon. Work around meetings
already on the calendar and put anything needing real focus before the first
one. Estimate how far down I'll realistically get. If the day doesn't fit,
name what falls off instead of pretending it compresses.

SCOPE FOR THE ORDER: draw only from items that are OVERDUE, due today, due
within about 7 days, or that you can tell are blocking something else on the
board. An item due in 2+ months does NOT belong in today's sequence just
because it has been sitting on the board a long time — age and urgency are
different things. Everything else stays out of Part 1 and shows up in Part 2
instead, where full coverage is the point.

B. THE ONE I'M AVOIDING
The single task I'm most likely dodging. Say what you think the real blocker
is and give me one action under fifteen minutes that breaks the seal.

C. WHAT I'M NOT SEEING
Any pattern the board reveals: work I'm generating faster than closing, a
category piling up, several items stalled on the same missing thing.

Keep Part 1 short enough to read standing up. Be blunt, skip encouragement,
cite specific task titles and day counts.

═══════════════════════════════════════════════════════════════
PART 2 — THE FULL BOARD REVIEW (as a printable artifact)
═══════════════════════════════════════════════════════════════

Produce this as an HTML artifact — not a generated PDF file, and not chat
text. Write it as a self-contained HTML document with embedded CSS. Do not
use a PDF-generation tool or skill for this; the artifact itself must be
HTML.

PRINT LAYOUT: include an @page rule set to landscape orientation, and size
the table/columns to use the full landscape width so it prints as one clean
page-per-section rather than a narrow portrait column. This is read on paper
and needs to look intentional when printed, not like a webpage that happened
to print.

COVERAGE IS MANDATORY AND IS THE POINT OF PART 2.
Before you write anything, count every open item in the dump — rolled over,
due today, events, recurring, and the entire backlog. State that number at
the top of the document. Every single one of those items must appear below.
Do not summarize, do not sample, do not drop an item because it looks
routine or low priority. If the count of rows in your document does not
match the count you stated, you have made an error — go back and add the
missing ones.

TABLE STRUCTURE: group the table under the same section headers used in
the dump (Rolled Over, Open Tasks Due Today, Events, Daily Recurring, Weekly
Recurring, Monthly Recurring, Backlog) — a short header row or label above
each group, then that group's rows.

ORDER WITHIN EACH SECTION: within every section, sort rows by priority —
High first, then Med, then Low. Within the same priority, put OVERDUE and
due-soon items above items due later or with no due date. Priority decides
the order, not which section the item happened to land in — a Low-priority
item (a weekly calendar reminder, for example) must sort below the
High-priority items in its own section, not appear first just because
recurring items are dumped early in the raw data.

For EVERY open item, give me a row with:

  ITEM          — the task title, exactly as written
  STATUS        — priority, status, days on board
  BLOCKER       — what is actually stopping this from progressing
  NEEDS         — the specific next deliverable required to move it
  ACTION        — the single next step, phrased as an instruction
  WAITING ON    — me, or a named third party, or unknown
  NOTES         — leave this cell EMPTY. Do not fill it with anything —
                  no summary, no repeated content, no placeholder text,
                  not even a dash. It's blank space for me to write on
                  by hand after this is printed. Give it real width, at
                  least as wide as the ACTION column, so there's room to
                  actually write in it.

READ EVERY NOTE ON EVERY TASK, not just the newest one. Notes are where the
real blockers live and they are the highest-value field in this dump.

CRITICAL: when a note names a required document, study, permit, inspection,
certificate, report, approval, or signature, that IS the NEEDS value and you
must surface it verbatim. Examples of the pattern I care about: a note
reading "needs a cultural resource study done" means NEEDS = "Cultural
Resource Study." A note reading "needs a final grading cert" means NEEDS =
"Final Grading Certificate." These are exactly the items I keep losing track
of, and missing one makes this whole document worthless to me.

Never write "no blocker" or "none" for NEEDS unless the notes genuinely
contain no requirement. If a task has no notes at all, write "unknown — no
notes on file" rather than inventing something.

After the full table, add two short sections:

  STALLED — items where the notes show a requirement that has been sitting
  unfilled. Order by a mix of days on board AND due-date urgency, not age
  alone — a task on the board 60 days but not due for 2 months is lower
  priority than one on the board 10 days and due this week. For each, take
  a position: do it today, hand it off, schedule it with a real date, or
  kill it. Do not hedge with "you may want to consider."

  OUTSTANDING DELIVERABLES — a plain checklist of every distinct document,
  study, permit, certificate, or approval named anywhere in the notes, with
  which item it belongs to. This is the list I want to work from.

Format the artifact so it prints cleanly on paper: clear headings, real
tables, no emoji, no decorative characters.

═══════════════════════════════════════════════════════════════

NOTE ON DATA: the activity timestamps (last edited, status changed, priority
changed) only began recording on 2026-09-01. Anything reading "not tracked
yet" predates that — treat it as unknown, not as stale, and lean on days on
board and note dates instead when judging whether something has stalled.

────────────────────────────────────────────────────────────────
`;

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
  if (task.dueDate) {
    const dd = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
    const startOfDay = (x) => { const y = new Date(x); y.setHours(0, 0, 0, 0); return y; };
    const diffDays = Math.round((startOfDay(dd) - startOfDay(new Date())) / 86400000);
    const urgency = diffDays < 0 ? `OVERDUE by ${Math.abs(diffDays)}d`
      : diffDays === 0 ? 'due today'
      : diffDays === 1 ? 'due tomorrow'
      : `due in ${diffDays}d`;
    meta.push(`due: ${fmtDate(task.dueDate)} (${urgency})`);
  } else {
    meta.push('due: none');
  }
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
    bits.push(`    notes (${notes.length}, newest first):`);
    [...notes].reverse().forEach((n) => {
      const when = daysSince(n.timestamp);
      const whenLabel = when === null ? 'undated' : when === 0 ? 'today' : `${when}d ago`;
      let text = (n.text || '').replace(/\s+/g, ' ').trim();
      if (text.length > 600) text = `${text.slice(0, 600)}…[truncated]`;
      bits.push(`      · (${whenLabel}) ${text}`);
    });
  } else {
    bits.push('    notes: none');
  }

  return bits.join('\n');
}

function section(title, tasks) {
  if (!tasks || tasks.length === 0) return `${title}: none\n`;
  return `${title} (${tasks.length}):\n${tasks.map(describeTask).join('\n')}\n`;
}

export function buildBrief({ allTasks = [], todayTasks = {}, calendarEvents = [] }) {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isDone = (t) => t.status === 'Done';

  const live = (arr) => (arr || []).filter((t) => !isDone(t) && !t.completed);

  const open = live(todayTasks.open);
  const events = live(todayTasks.events);
  const daily = live(todayTasks.daily);
  const weekly = live(todayTasks.weekly);
  const monthly = live(todayTasks.monthly);
  const rolledOver = live(todayTasks.rolledOver);

  const shown = new Set(
    [...open, ...events, ...daily, ...weekly, ...monthly, ...rolledOver].map((t) => t.id)
  );

  const backlog = allTasks.filter((t) => !t.completed && !isDone(t) && !shown.has(t.id));

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

  const openTotal = allTasks.filter((t) => !t.completed && !isDone(t)).length;
  const doneCount = allTasks.filter((t) => !t.completed && isDone(t)).length;
  lines.push(`TOTAL OPEN ITEMS ON THE BOARD: ${openTotal}`);
  lines.push('Every one of these must appear in the printable review.');
  if (doneCount > 0) {
    lines.push(`(${doneCount} item(s) marked status "Done" were excluded — ignore them entirely.)`);
  }
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

  lines.push('══ COUNTS ══');
  lines.push(`open tasks total: ${openTotal} | closed last 7 days: ${recentlyDone.length}`);

  return `${BRIEF_PROMPT}\n${lines.join('\n')}`;
}

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
  const [state, setState] = useState('idle');
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

    const ok = copySync(text);

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }

    if (ok) {
      setState('copied');
      window.open('https://claude.ai/new', '_blank', 'noopener');
      setTimeout(() => setState('idle'), 15000);
    } else {
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
