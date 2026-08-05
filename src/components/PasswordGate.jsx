// src/components/PasswordGate.jsx
// A front-door password screen shown before anything else loads.
//
// IMPORTANT — what this does and doesn't do:
// This is a static site with no server, so there's no way to check a
// password server-side before serving the page. This gate is a deterrent,
// not real security: the password is baked into the built JS bundle and
// anyone comfortable with browser devtools could read it out or skip the
// check entirely. Your actual data stays fully protected regardless —
// that protection comes from Firebase Auth + Firestore security rules
// (only your signed-in Google account can read/write your data), and
// those work whether or not this gate is here.
// This gate's real job is just to keep casual visitors from even seeing
// that the app exists.

import { useState } from 'react';

const SESSION_KEY = 'cc_gate_passed';
const SITE_PASSWORD = import.meta.env.VITE_SITE_PASSWORD || '';

export function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'true');
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  // If no site password is configured, skip the gate entirely so the site
  // is never accidentally locked. Firebase Auth still protects all data.
  if (!SITE_PASSWORD) return children;

  if (unlocked) return children;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (SITE_PASSWORD && input === SITE_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setUnlocked(true);
    } else {
      setError(true);
      setInput('');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8f9fb 0%, #eef2ff 100%)', padding: '20px',
    }}>
      <form onSubmit={handleSubmit} style={{
        background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px',
        padding: '32px 36px', width: '100%', maxWidth: '360px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'center',
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px', background: '#2563eb',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
          color: 'white', margin: '0 auto 16px',
        }}>⌘</div>
        <h1 style={{ fontSize: '18px', marginBottom: '18px' }}>Command Center</h1>
        <input
          type="password"
          autoFocus
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false); }}
          placeholder="Site password"
          style={{
            width: '100%', padding: '10px 12px', fontSize: '14px', marginBottom: '12px',
            border: `1px solid ${error ? '#dc2626' : '#e5e7eb'}`, borderRadius: '8px', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {error && (
          <div style={{ color: '#dc2626', fontSize: '12px', marginBottom: '12px' }}>Incorrect password.</div>
        )}
        <button type="submit" style={{
          width: '100%', padding: '10px', background: '#2563eb', color: 'white',
          border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
        }}>
          Enter
        </button>
      </form>
    </div>
  );
}
