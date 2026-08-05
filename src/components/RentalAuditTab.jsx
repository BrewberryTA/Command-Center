// src/components/RentalAuditTab.jsx
// Native, in-app monthly rental portfolio audit. Replaces the spreadsheet
// workflow — every property lives in Firestore and is edited directly here.

import { useState } from 'react';
import { useRentalAudit } from '../hooks/useRentalAudit.js';

const inputStyle = {
  width: '100%',
  padding: '6px 8px',
  fontSize: '12px',
  fontFamily: 'var(--font-mono)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
};

const thStyle = {
  textAlign: 'left',
  padding: '8px 10px',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
  position: 'sticky',
  top: 0,
  background: 'var(--bg-secondary)',
  zIndex: 1,
};

const tdStyle = {
  padding: '6px 10px',
  borderBottom: '1px solid var(--border)',
  verticalAlign: 'top',
};

function flagColor(flag) {
  if (flag === 'EXPIRED - RENEW NOW') return { color: 'var(--red)', fontWeight: 600 };
  if (flag === 'RENEWAL DUE SOON') return { color: 'var(--amber)', fontWeight: 600 };
  if (flag === 'OK') return { color: 'var(--green)' };
  return { color: 'var(--text-muted)' };
}

function SummaryCard({ label, value, tone }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '14px 16px', minWidth: '140px',
    }}>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: tone || 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function currentMonthLabel() {
  const d = new Date();
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function RentalAuditTab({ uid }) {
  const {
    properties, loading, error, updateProperty, addProperty, leaseFlag, daysUntil, summary,
    history, historyLoading, archiveMonth,
  } = useRentalAudit(uid);
  const [newName, setNewName] = useState('');
  const [view, setView] = useState('current'); // 'current' | 'history'
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await archiveMonth(currentMonthKey(), currentMonthLabel());
      setConfirming(false);
    } finally {
      setArchiving(false);
    }
  };

  const alreadyArchivedThisMonth = history.some((h) => h.month === currentMonthKey());

  // Local draft state so typing doesn't fire a Firestore write on every keystroke.
  const [drafts, setDrafts] = useState({});

  const getValue = (prop, field) => drafts[prop.id]?.[field] ?? prop[field] ?? '';

  const setDraft = (propId, field, value) => {
    setDrafts((d) => ({ ...d, [propId]: { ...d[propId], [field]: value } }));
  };

  const commit = (propId, field) => {
    const value = drafts[propId]?.[field];
    if (value === undefined) return;
    updateProperty(propId, { [field]: value });
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading rental portfolio...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ fontSize: '18px' }}>Monthly Rental Audit</h2>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <button
              onClick={() => setView('current')}
              style={{
                padding: '6px 12px', fontSize: '12px', border: 'none', cursor: 'pointer',
                background: view === 'current' ? 'var(--accent)' : 'white',
                color: view === 'current' ? 'white' : 'var(--text-secondary)',
              }}
            >
              This Month
            </button>
            <button
              onClick={() => { setView('history'); setSelectedMonth(null); }}
              style={{
                padding: '6px 12px', fontSize: '12px', border: 'none', cursor: 'pointer',
                background: view === 'history' ? 'var(--accent)' : 'white',
                color: view === 'history' ? 'white' : 'var(--text-secondary)',
              }}
            >
              Past Audits ({history.length})
            </button>
          </div>

          {view === 'current' && (
            confirming ? (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {alreadyArchivedThisMonth ? 'Re-archive & reset this month?' : 'Archive & reset monthly fields?'}
                </span>
                <button className="btn" style={{ background: 'var(--green)', color: 'white' }} disabled={archiving} onClick={handleArchive}>
                  {archiving ? 'Saving...' : 'Confirm'}
                </button>
                <button className="btn" onClick={() => setConfirming(false)} disabled={archiving}>Cancel</button>
              </div>
            ) : (
              <button className="btn" style={{ background: 'var(--accent)', color: 'white' }} onClick={() => setConfirming(true)}>
                ✓ Complete {currentMonthLabel()} Audit
              </button>
            )
          )}
        </div>
      </div>

      {view === 'current' && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Check each property against TurboTenant, fill in the row below, then click "Complete Audit" to save this month's snapshot to history and clear the fields for next month.
          {alreadyArchivedThisMonth && <span style={{ color: 'var(--amber)', marginLeft: '6px' }}>Already archived once this month.</span>}
        </div>
      )}

      {error && (
        <div style={{
          background: 'var(--red-light)', border: '1px solid #fca5a5', borderRadius: 'var(--radius)',
          padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: 'var(--red)',
        }}>
          ⚠ {error}
        </div>
      )}

      {view === 'history' ? (
        <HistoryView history={history} historyLoading={historyLoading} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
      ) : (
      <>
      {/* Summary strip */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <SummaryCard label="Total Properties" value={summary.total} />
        <SummaryCard label="Leases Due ≤60 Days" value={summary.expiringSoon} tone="var(--amber)" />
        <SummaryCard label="Leases Expired" value={summary.expired} tone="var(--red)" />
        <SummaryCard label="Rent Not Paid" value={summary.rentNotPaid} tone="var(--red)" />
        <SummaryCard label="Open Maintenance" value={summary.openMaintenance} />
        <SummaryCard label="Active Leads" value={summary.activeLeads} tone="var(--green)" />
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        overflow: 'auto', maxHeight: '65vh',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Property</th>
              <th style={thStyle}>Lease End Date</th>
              <th style={thStyle}>Flag</th>
              <th style={thStyle}>Rent Paid?</th>
              <th style={thStyle}>Due</th>
              <th style={thStyle}>Received</th>
              <th style={thStyle}>Maint. #</th>
              <th style={thStyle}>Maint. Notes</th>
              <th style={thStyle}>Leads #</th>
              <th style={thStyle}>Lead Notes</th>
              <th style={thStyle}>Last Checked</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((prop) => {
              const flag = leaseFlag(getValue(prop, 'leaseEndDate'));
              return (
                <tr key={prop.id}>
                  <td style={{ ...tdStyle, fontSize: '12px', fontWeight: 500 }}>{prop.name}</td>
                  <td style={tdStyle}>
                    <input
                      type="date"
                      style={inputStyle}
                      value={getValue(prop, 'leaseEndDate')}
                      onChange={(e) => setDraft(prop.id, 'leaseEndDate', e.target.value)}
                      onBlur={() => commit(prop.id, 'leaseEndDate')}
                    />
                  </td>
                  <td style={{ ...tdStyle, fontSize: '11px', ...flagColor(flag) }}>{flag || '—'}</td>
                  <td style={tdStyle}>
                    <select
                      style={inputStyle}
                      value={getValue(prop, 'rentPaid')}
                      onChange={(e) => { setDraft(prop.id, 'rentPaid', e.target.value); updateProperty(prop.id, { rentPaid: e.target.value }); }}
                    >
                      <option value="">—</option>
                      <option value="Y">Y</option>
                      <option value="N">N</option>
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="number" style={{ ...inputStyle, width: '80px' }}
                      value={getValue(prop, 'rentDue')}
                      onChange={(e) => setDraft(prop.id, 'rentDue', e.target.value)}
                      onBlur={() => commit(prop.id, 'rentDue')}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="number" style={{ ...inputStyle, width: '80px' }}
                      value={getValue(prop, 'rentReceived')}
                      onChange={(e) => setDraft(prop.id, 'rentReceived', e.target.value)}
                      onBlur={() => commit(prop.id, 'rentReceived')}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="number" style={{ ...inputStyle, width: '60px' }}
                      value={getValue(prop, 'maintenanceCount')}
                      onChange={(e) => setDraft(prop.id, 'maintenanceCount', e.target.value)}
                      onBlur={() => commit(prop.id, 'maintenanceCount')}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="text" style={{ ...inputStyle, minWidth: '160px' }}
                      value={getValue(prop, 'maintenanceNotes')}
                      onChange={(e) => setDraft(prop.id, 'maintenanceNotes', e.target.value)}
                      onBlur={() => commit(prop.id, 'maintenanceNotes')}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="number" style={{ ...inputStyle, width: '60px' }}
                      value={getValue(prop, 'leadsCount')}
                      onChange={(e) => setDraft(prop.id, 'leadsCount', e.target.value)}
                      onBlur={() => commit(prop.id, 'leadsCount')}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="text" style={{ ...inputStyle, minWidth: '160px' }}
                      value={getValue(prop, 'leadNotes')}
                      onChange={(e) => setDraft(prop.id, 'leadNotes', e.target.value)}
                      onBlur={() => commit(prop.id, 'leadNotes')}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="date" style={inputStyle}
                      value={getValue(prop, 'lastChecked')}
                      onChange={(e) => setDraft(prop.id, 'lastChecked', e.target.value)}
                      onBlur={() => commit(prop.id, 'lastChecked')}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add property */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <input
          type="text"
          placeholder="Add a new property/unit..."
          style={{ ...inputStyle, maxWidth: '320px' }}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          className="btn"
          style={{ background: 'var(--accent)', color: 'white' }}
          onClick={async () => { await addProperty(newName); setNewName(''); }}
        >
          + Add Property
        </button>
      </div>
      </>
      )}
    </div>
  );
}

// ── Past Audits view — pick a month, see exactly what was recorded ─────
function HistoryView({ history, historyLoading, selectedMonth, setSelectedMonth }) {
  if (historyLoading) {
    return <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading past audits...</div>;
  }

  if (history.length === 0) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        No completed audits yet. Once you click "Complete Audit" on the current month, it'll show up here.
      </div>
    );
  }

  const selected = history.find((h) => h.month === selectedMonth) || history[0];

  return (
    <div style={{ display: 'flex', gap: '16px' }}>
      {/* Month list */}
      <div style={{ minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {history.map((h) => (
          <button
            key={h.month}
            onClick={() => setSelectedMonth(h.month)}
            style={{
              textAlign: 'left', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', cursor: 'pointer', fontSize: '12px',
              background: (selected?.month === h.month) ? 'var(--accent-light)' : 'white',
              color: (selected?.month === h.month) ? 'var(--accent)' : 'var(--text-primary)',
              fontWeight: (selected?.month === h.month) ? 600 : 400,
            }}
          >
            {h.monthLabel || h.month}
          </button>
        ))}
      </div>

      {/* Selected month's snapshot */}
      <div style={{
        flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', overflow: 'auto', maxHeight: '65vh',
      }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: '13px', fontWeight: 600 }}>
          {selected.monthLabel || selected.month} — archived {selected.archivedAt?.toDate?.().toLocaleDateString?.() || ''}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Property</th>
              <th style={thStyle}>Lease End Date</th>
              <th style={thStyle}>Flag</th>
              <th style={thStyle}>Rent Paid?</th>
              <th style={thStyle}>Due</th>
              <th style={thStyle}>Received</th>
              <th style={thStyle}>Maint. #</th>
              <th style={thStyle}>Maint. Notes</th>
              <th style={thStyle}>Leads #</th>
              <th style={thStyle}>Lead Notes</th>
            </tr>
          </thead>
          <tbody>
            {(selected.properties || []).map((p, idx) => (
              <tr key={idx}>
                <td style={{ ...tdStyle, fontSize: '12px', fontWeight: 500 }}>{p.name}</td>
                <td style={{ ...tdStyle, fontSize: '12px' }}>{p.leaseEndDate || '—'}</td>
                <td style={{ ...tdStyle, fontSize: '11px', ...flagColor(p.leaseFlagAtArchive) }}>{p.leaseFlagAtArchive || '—'}</td>
                <td style={{ ...tdStyle, fontSize: '12px' }}>{p.rentPaid || '—'}</td>
                <td style={{ ...tdStyle, fontSize: '12px' }}>{p.rentDue || '—'}</td>
                <td style={{ ...tdStyle, fontSize: '12px' }}>{p.rentReceived || '—'}</td>
                <td style={{ ...tdStyle, fontSize: '12px' }}>{p.maintenanceCount || '—'}</td>
                <td style={{ ...tdStyle, fontSize: '12px' }}>{p.maintenanceNotes || '—'}</td>
                <td style={{ ...tdStyle, fontSize: '12px' }}>{p.leadsCount || '—'}</td>
                <td style={{ ...tdStyle, fontSize: '12px' }}>{p.leadNotes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
