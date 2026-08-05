// src/App.jsx
import { useState, useEffect, useCallback } from 'react';
import { TopBar } from './components/TopBar.jsx';
import { NavTabs } from './components/NavTabs.jsx';
import { QuickStrip } from './components/QuickStrip.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { TasksTab } from './components/TasksTab.jsx';
import { CalendarView } from './components/CalendarView.jsx';
import { ToolsGrid } from './components/ToolsGrid.jsx';
import { TaskModal } from './components/TaskModal.jsx';
import { RentalAuditTab } from './components/RentalAuditTab.jsx';
import { NewGCalEvent } from './components/NewGCalEvent.jsx';
import { useGCalCompletions } from './hooks/useGCalCompletions.js';
import { useAuth } from './hooks/useAuth.js';
import { useTasks } from './hooks/useTasks.js';
import { useTools } from './hooks/useTools.js';
import { useCalendar } from './hooks/useCalendar.js';
import { runRollForward, resetDailyTasks } from './lib/rollForward.js';

// ── Login Screen ───────────────────────────────────────────────
function LoginScreen({ onSignIn, error, loading }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8f9fb 0%, #eef2ff 100%)',
      padding: '20px',
    }}>
      {/* Logo mark */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '14px',
          background: 'var(--accent)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '28px', color: 'white',
          margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(37,99,235,0.3)',
        }}>⌘</div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>
          Command Center
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          Your personal productivity workspace
        </p>
      </div>

      {/* Sign-in card */}
      <div style={{
        background: 'white', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '32px 36px',
        width: '100%', maxWidth: '380px',
        boxShadow: 'var(--shadow-lg)', textAlign: 'center',
      }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
          Sign in with your Google account to continue
        </p>

        <button
          onClick={onSignIn}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '12px', width: '100%', padding: '11px 20px',
            background: loading ? 'var(--bg-primary)' : 'white',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 150ms ease',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        {error && (
          <div style={{ marginTop: '16px', color: 'var(--red)', fontSize: '12px', padding: '8px 12px', background: 'var(--red-light)', borderRadius: 'var(--radius-sm)' }}>
            ⚠ {error}
          </div>
        )}

        <p style={{ marginTop: '20px', color: 'var(--text-muted)', fontSize: '11px', lineHeight: 1.6 }}>
          Google Calendar access is optional and requested separately.
          Your data is stored securely in your own Firebase project.
        </p>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────
export default function App() {
  const { user, loading: authLoading, error: authError, signIn, signOut, accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [rollForwardDone, setRollForwardDone] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const uid = user?.uid;

  const { tasks, loading: tasksLoading, error: tasksError, addTask, updateTask, toggleComplete, addNote, addAttachment, deleteTask, getTodaysTasks } = useTasks(uid);
  const { tools, loading: toolsLoading, error: toolsError, addTool, updateTool, deleteTool } = useTools(uid);
  const { completions: gcalCompletions, toggleComplete: toggleGCalComplete } = useGCalCompletions(uid);
  const {
    linkedCalendars, linkedAccounts, accountTokens, events: calEvents,
    loading: calLoading, error: calError,
    currentMonth, prevMonth, nextMonth,
    addGoogleAccount, removeAccount, toggleCalendar, refreshAccountToken,
  } = useCalendar(uid);

  // Roll-forward on login
  useEffect(() => {
    if (uid && !rollForwardDone) {
      Promise.all([
        runRollForward(uid),
        resetDailyTasks(uid),
      ]).then(() => setRollForwardDone(true));
    }
  }, [uid, rollForwardDone]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (!user) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setShowNewTaskModal(true); }
    if (e.key === 't' || e.key === 'T') { e.preventDefault(); setActiveTab('Dashboard'); }
    if (e.key === 'Escape') setShowNewTaskModal(false);
  }, [user]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const todayTasks = getTodaysTasks();
  const authorName = user?.displayName || 'User';

  const handleSignIn = async () => {
    setSigningIn(true);
    await signIn();
    setSigningIn(false);
  };

  // Auth loading
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px' }}>⌘</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading...</p>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return <LoginScreen onSignIn={handleSignIn} error={authError} loading={signingIn} />;
  }

  // TopBar = 56px, NavTabs = 44px, QuickStrip = 54px → total = 154px
  const TOP_OFFSET = 154;

  return (
    <>
      <TopBar todayTasks={todayTasks} user={user} onSignOut={signOut} />
      <NavTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Quick Action Strip — below NavTabs */}
      <div style={{ position: 'fixed', top: '100px', left: 0, right: 0, zIndex: 80 }}>
        <QuickStrip uid={uid} />
      </div>

      {/* Main content */}
      <main style={{ paddingTop: `${TOP_OFFSET}px`, minHeight: '100vh' }}>
        <div className="app-container" style={{ padding: '24px 20px 60px' }}>

          {/* Error banner */}
          {(tasksError || toolsError || calError) && (
            <div style={{
              background: 'var(--red-light)', border: '1px solid #fca5a5',
              borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: '16px',
              fontSize: '13px', color: 'var(--red)', display: 'flex', gap: '8px', alignItems: 'center',
            }}>
              ⚠ {tasksError || toolsError || calError}
            </div>
          )}

          {/* Keyboard hints + New Event button */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
            {[['N', 'New Task'], ['T', 'Today'], ['Esc', 'Close']].map(([key, label]) => (
              <span key={key} style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <kbd style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 6px', fontSize: '11px', boxShadow: '0 1px 0 var(--border)' }}>{key}</kbd>
                {label}
              </span>
            ))}
            <NewGCalEvent linkedAccounts={linkedAccounts} />
          </div>

          {/* Tab content */}
          {activeTab === 'Dashboard' && (
            <Dashboard todayTasks={todayTasks} calendarEvents={calEvents}
              gcalCompletions={gcalCompletions}
              onGCalToggle={toggleGCalComplete}
              loading={tasksLoading} uid={uid}
              onUpdate={updateTask} onToggleComplete={toggleComplete}
              onAddNote={addNote} onAddAttachment={addAttachment}
              onDelete={deleteTask} authorName={authorName} />
          )}

          {activeTab === 'Tasks' && (
            <TasksTab tasks={tasks} loading={tasksLoading} uid={uid}
              onAdd={addTask} onUpdate={updateTask} onToggleComplete={toggleComplete}
              onAddNote={addNote} onAddAttachment={addAttachment}
              onDelete={deleteTask} authorName={authorName} />
          )}

          {activeTab === 'Rental Audit' && (
            <RentalAuditTab uid={uid} />
          )}

          {activeTab === 'Calendar' && (
            <CalendarView
              tasks={tasks}
              events={calEvents}
              linkedCalendars={linkedCalendars}
              linkedAccounts={linkedAccounts}
              accountTokens={accountTokens}
              currentMonth={currentMonth}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              onAddAccount={addGoogleAccount}
              onRemoveAccount={removeAccount}
              onToggleCalendar={toggleCalendar}
              onRefreshToken={refreshAccountToken}
              loading={calLoading}
              error={calError}
            />
          )}

          {activeTab === 'Tools' && (
            <ToolsGrid tools={tools} loading={toolsLoading}
              onAdd={addTool} onUpdate={updateTool} onDelete={deleteTool} />
          )}
        </div>
      </main>

      {/* Global new task modal */}
      {showNewTaskModal && (
        <TaskModal
          onClose={() => setShowNewTaskModal(false)}
          onSave={async (data) => { await addTask(data); setShowNewTaskModal(false); }}
        />
      )}
    </>
  );
}
