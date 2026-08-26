// src/components/TasksTab.jsx
import { useState, useMemo } from 'react';
import { TaskCard } from './TaskCard.jsx';
import { TaskModal } from './TaskModal.jsx';

const TYPE_OPTIONS = ['all', 'open', 'event', 'daily', 'weekly', 'monthly'];
const PRIORITY_OPTIONS = ['all', 'High', 'Med', 'Low'];
const STATUS_OPTIONS = ['all', 'Working on it', 'No progress', 'Stuck'];
const COMPLETION_OPTIONS = ['all', 'incomplete', 'complete'];
const SORT_OPTIONS = ['priority', 'date', 'type', 'title', 'age'];

function FilterChip({ label, value, options, onChange }) {
  return (
    <div>
      <label>{label}</label>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ minWidth: '120px' }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === 'all' ? `All ${label}` : o}
          </option>
        ))}
      </select>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="skeleton" style={{ height: '62px', marginBottom: '8px', borderRadius: 'var(--radius)' }} />
  );
}

export function TasksTab({
  tasks,
  loading,
  uid,
  onAdd,
  onUpdate,
  onToggleComplete,
  onAddNote,
  onAddAttachment,
  onDelete,
  authorName,
}) {
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCompletion, setFilterCompletion] = useState('incomplete');
  const [sortBy, setSortBy] = useState('date');

  const filtered = useMemo(() => {
    let list = [...tasks];

    if (filterType !== 'all') list = list.filter((t) => t.type === filterType);
    if (filterPriority !== 'all') list = list.filter((t) => t.priority === filterPriority);
    if (filterStatus !== 'all') list = list.filter((t) => t.status === filterStatus);
    if (filterCompletion === 'incomplete') list = list.filter((t) => !t.completed);
    if (filterCompletion === 'complete') list = list.filter((t) => t.completed);

    // Sort
    const PRIORITY_ORDER = { High: 0, Med: 1, Low: 2, undefined: 3 };
    const TYPE_ORDER = { open: 0, event: 1, daily: 2, weekly: 3, monthly: 4 };
    list.sort((a, b) => {
      if (sortBy === 'priority') return (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
      if (sortBy === 'date') {
        const da = a.dueDate ? new Date(a.dueDate) : new Date(8640000000000000);
        const db = b.dueDate ? new Date(b.dueDate) : new Date(8640000000000000);
        return da - db;
      }
      if (sortBy === 'type') return (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9);
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'age') {
        // Oldest createdAt first — surfaces tasks that have been sitting longest.
        const ca = a.createdAt ? new Date(a.createdAt) : new Date(8640000000000000);
        const cb = b.createdAt ? new Date(b.createdAt) : new Date(8640000000000000);
        return ca - cb;
      }
      return 0;
    });

    return list;
  }, [tasks, filterType, filterPriority, filterStatus, filterCompletion, sortBy]);

  const handleAdd = async (taskData) => {
    await onAdd(taskData);
    setShowModal(false);
  };

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          marginBottom: '20px',
          padding: '16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
        }}
      >
        <FilterChip label="Type" value={filterType} options={TYPE_OPTIONS} onChange={setFilterType} />
        <FilterChip label="Priority" value={filterPriority} options={PRIORITY_OPTIONS} onChange={setFilterPriority} />
        <FilterChip label="Status" value={filterStatus} options={STATUS_OPTIONS} onChange={setFilterStatus} />
        <FilterChip label="Completion" value={filterCompletion} options={COMPLETION_OPTIONS} onChange={setFilterCompletion} />
        <FilterChip label="Sort By" value={sortBy} options={SORT_OPTIONS} onChange={setSortBy} />

        <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
            style={{ boxShadow: 'var(--glow-cyan)' }}
          >
            + ADD TASK
          </button>
        </div>
      </div>

      {/* Results count */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          marginBottom: '12px',
        }}
      >
        SHOWING {filtered.length} of {tasks.length} TASKS
      </div>

      {/* Task List */}
      {loading ? (
        [...Array(8)].map((_, i) => <SkeletonCard key={i} />)
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="icon">◌</span>
          No tasks match your filters
        </div>
      ) : (
        filtered.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            uid={uid}
            onUpdate={onUpdate}
            onToggleComplete={onToggleComplete}
            onAddNote={onAddNote}
            onAddAttachment={onAddAttachment}
            onDelete={onDelete}
            authorName={authorName}
          />
        ))
      )}

      {/* Add Task Modal */}
      {showModal && (
        <TaskModal
          onClose={() => setShowModal(false)}
          onSave={handleAdd}
        />
      )}
    </div>
  );
}
