// src/components/NavTabs.jsx
const TABS = [
  { id: 'Dashboard', icon: '⊞' },
  { id: 'Tasks', icon: '✓' },
  { id: 'Rental Audit', icon: '🏠' },
  { id: 'Calendar', icon: '📅' },
  { id: 'Tools', icon: '🔗' },
];

export function NavTabs({ activeTab, onTabChange }) {
  return (
    <nav style={{
      position: 'fixed', top: '56px', left: 0, right: 0, zIndex: 90,
      background: 'white', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'stretch', height: '44px',
      padding: '0 20px', gap: '2px',
    }}>
      {TABS.map(({ id, icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            style={{
              background: 'none', border: 'none',
              borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px', fontWeight: isActive ? 600 : 400,
              padding: '0 14px', cursor: 'pointer',
              transition: 'all 150ms ease', outline: 'none',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <span style={{ fontSize: '13px' }}>{icon}</span>
            {id}
          </button>
        );
      })}
    </nav>
  );
}
