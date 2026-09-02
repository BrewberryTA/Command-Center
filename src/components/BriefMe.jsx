import { useState } from 'react';
// src/components/BriefMe.jsx
// One-click daily brief. Assembles the whole board into a text dump,
// prepends a fixed prompt, copies it to the clipboard and opens claude.ai.
// No API key, no cost — uses your existing Claude subscription.

// ── The prompt ────────────────────────────────────────────────
// Edit this block to change what the brief asks for.
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

Produce this as a downloadable/printable artifact, not as chat text.

COVERAGE IS MANDATORY AND IS THE POINT OF PART 2.
Before you write anything, count every open item in the dump — rolled over,
due today, events, recurring, and the entire backlog. State that number at
the top of the document. Every single one of those items must appear below.
Do not summarize, do not sample, do not drop an item because it looks
routine or low priority. If the count of rows in your document does not
match the count you stated, you have made an error — go back and add the
missing ones.

For EVERY open item, give me a row with:

  ITEM          — the task title, exactly as written
  STATUS        — priority, status, days on board
  BLOCKER       — what is actually stopping this from progressing
  NEEDS         — the specific next deliverable required to move it
  ACTION        — the single next step, phrased as an instruction
  WAITING ON    — me, or a named third party, or unknown

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
  unfilled. Order by days on board, longest first. For each, take a
  position: do it today, hand it off, schedule it with a real date, or kill
  it. Do not hedge with "you may want to consider."

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

  // Send EVERY note, newest first. Blockers ("needs a cultural resource
  // study", "needs a final grading cert") live in here and are the single
  // highest-value field in the dump — sending only the latest one silently
  // hides requirements logged earlier.
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

// ── Dump builder ──────────────────────────────────────────────

export function buildBrief({ allTasks = [], todayTasks = {}, calendarEvents = [] }) {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Tasks marked status "Done" are excluded from the dump entirely. Filtering
  // here rather than telling the model to skip them means there is no chance
  // of them leaking into the review — they are simply not in the paste.
  const isDone = (t) => t.status === 'Done';

  // Also drop anything already ticked off. getTodaysTasks() filters the
  // today-sections by date and type only, so completed items were still
  // landing in the dump as if they were outstanding work.
  const live = (arr) => (arr || []).filter((t) => !isDone(t) && !t.completed);

  const open = live(todayTasks.open);
  const events = live(todayTasks.events);
  const daily = live(todayTasks.daily);
  const weekly = live(todayTasks.weekly);
  const monthly = live(todayTasks.monthly);
  const rolledOver = live(todayTasks.rolledOver);

  // IDs already shown in a today-section, so the backlog block doesn't repeat them
  const shown = new Set(
    [...open, ...events, ...daily, ...weekly, ...monthly, ...rolledOver].map((t) => t.id)
  );

  const backlog = allTasks.filter((t) => !t.completed && !isDone(t) && !shown.has(t.id));

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

  // Explicit total so the model can verify its own coverage in Part 2
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
