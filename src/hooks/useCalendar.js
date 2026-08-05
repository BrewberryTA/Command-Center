// src/hooks/useCalendar.js
// Supports multiple Google accounts by storing separate OAuth tokens per account.
// Each account is signed in independently via a popup, and events from all
// linked accounts are merged into one calendar view.

import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, setDoc, deleteDoc, onSnapshot, Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { GOOGLE_CLIENT_ID } from '../../firebaseConfig.js';
import {
  fetchCalendarList,
  fetchAllLinkedCalendarEvents,
  normalizeGCalEvent,
} from '../lib/googleCalendar.js';

// ── Per-account Google OAuth via popup ─────────────────────────
// Uses Google Identity Services (GIS) to get an access token for any Google account.
function loadGoogleIdentityScript() {
  return new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

async function getAccessTokenForAccount(clientId) {
  await loadGoogleIdentityScript();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      callback: (response) => {
        if (response.error) reject(new Error(response.error));
        else resolve(response.access_token);
      },
      prompt: 'select_account', // Forces account chooser so user can pick any account
    });
    client.requestAccessToken();
  });
}

export function useCalendar(uid) {
  const [linkedCalendars, setLinkedCalendars] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // Map of accountEmail -> accessToken (session only, not stored)
  const [accountTokens, setAccountTokens] = useState({});

  // Listen to linked calendars in Firestore
  useEffect(() => {
    if (!uid) return;
    const calsRef = collection(db, 'users', uid, 'calendars');
    const unsubscribe = onSnapshot(calsRef, (snapshot) => {
      setLinkedCalendars(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [uid]);

  // Auto-reconnect all linked accounts silently on load
  useEffect(() => {
    if (!uid || linkedCalendars.length === 0) return;
    const accounts = [...new Set(linkedCalendars.map((c) => c.accountEmail).filter(Boolean))];
    accounts.forEach(async (accountEmail) => {
      if (!accountTokens[accountEmail]) {
        try {
          await loadGoogleIdentityScript();
          const token = await new Promise((resolve, reject) => {
            const client = window.google.accounts.oauth2.initTokenClient({
              client_id: GOOGLE_CLIENT_ID,
              scope: 'https://www.googleapis.com/auth/calendar.readonly',
              hint: accountEmail, // hint which account to use silently
              prompt: '', // empty = no prompt if already authorized
              callback: (response) => {
                if (response.error) reject(new Error(response.error));
                else resolve(response.access_token);
              },
            });
            client.requestAccessToken();
          });
          setAccountTokens((prev) => ({ ...prev, [accountEmail]: token }));
        } catch {
          // Silent fail — user can reconnect manually
        }
      }
    });
  }, [uid, linkedCalendars.length]); // only run when accounts change
  const addGoogleAccount = useCallback(async () => {
    const clientId = GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google Client ID not configured in firebaseConfig.js');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // Get token — Google will show account picker
      const token = await getAccessTokenForAccount(clientId);
      // Fetch calendar list for this account
      const calendars = await fetchCalendarList(token);
      if (calendars.length === 0) {
        setError('No calendars found for this account.');
        setLoading(false);
        return;
      }
      // Get account email from the primary calendar
      const primary = calendars.find((c) => c.primary) || calendars[0];
      const accountEmail = primary.id; // primary calendar ID = email

      // Store token in session memory
      setAccountTokens((prev) => ({ ...prev, [accountEmail]: token }));

      // Save each calendar to Firestore
      for (const cal of calendars) {
        const calRef = doc(db, 'users', uid, 'calendars', `${accountEmail}__${cal.id}`);
        await setDoc(calRef, {
          calendarId: cal.id,
          accountEmail,
          summary: cal.summary,
          backgroundColor: cal.backgroundColor || '#4285f4',
          enabled: true,
          linkedAt: Timestamp.now(),
        }, { merge: true });
      }
    } catch (err) {
      if (err.message !== 'popup_closed_by_user') {
        setError(`Failed to link account: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [uid]);

  // ── Remove an entire Google account ──────────────────────────
  const removeAccount = useCallback(async (accountEmail) => {
    if (!uid) return;
    const toRemove = linkedCalendars.filter((c) => c.accountEmail === accountEmail);
    for (const cal of toRemove) {
      await deleteDoc(doc(db, 'users', uid, 'calendars', cal.id));
    }
    setAccountTokens((prev) => {
      const next = { ...prev };
      delete next[accountEmail];
      return next;
    });
  }, [uid, linkedCalendars]);

  // ── Toggle individual calendar on/off ─────────────────────────
  const toggleCalendar = useCallback(async (calDocId, enabled) => {
    if (!uid) return;
    await setDoc(doc(db, 'users', uid, 'calendars', calDocId), { enabled }, { merge: true });
  }, [uid]);

  // ── Refresh token for an account ─────────────────────────────
  const refreshAccountToken = useCallback(async (accountEmail) => {
    const clientId = GOOGLE_CLIENT_ID;
    if (!clientId) return null;
    try {
      const token = await getAccessTokenForAccount(clientId);
      setAccountTokens((prev) => ({ ...prev, [accountEmail]: token }));
      return token;
    } catch {
      return null;
    }
  }, []);

  // ── Fetch events from all linked accounts ─────────────────────
  const fetchEvents = useCallback(async () => {
    if (linkedCalendars.length === 0) { setEvents([]); return; }

    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

    setLoading(true);
    setError(null);

    try {
      // Group calendars by account
      const byAccount = {};
      linkedCalendars.filter((c) => c.enabled !== false).forEach((cal) => {
        if (!byAccount[cal.accountEmail]) byAccount[cal.accountEmail] = [];
        byAccount[cal.accountEmail].push(cal.calendarId);
      });

      const allEvents = [];
      for (const [accountEmail, calIds] of Object.entries(byAccount)) {
        let token = accountTokens[accountEmail];
        if (!token) {
          // Try to silently get a token without showing account picker
          // If it fails, skip this account and show a prompt
          continue;
        }
        try {
          const raw = await fetchAllLinkedCalendarEvents(token, calIds, start, end);
          raw.forEach((evt) => allEvents.push({
            ...normalizeGCalEvent(evt),
            _accountEmail: accountEmail,
          }));
        } catch (err) {
          if (err.message?.includes('401')) {
            // Token expired — remove it so UI shows "reconnect" prompt
            setAccountTokens((prev) => { const n = { ...prev }; delete n[accountEmail]; return n; });
          }
        }
      }
      setEvents(allEvents);
    } catch (err) {
      setError(`Failed to fetch events: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [linkedCalendars, currentMonth, accountTokens]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Get unique accounts from linked calendars
  const linkedAccounts = [...new Set(linkedCalendars.map((c) => c.accountEmail).filter(Boolean))];

  const prevMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  return {
    linkedCalendars,
    linkedAccounts,
    accountTokens,
    events,
    loading,
    error,
    currentMonth,
    prevMonth,
    nextMonth,
    addGoogleAccount,
    removeAccount,
    toggleCalendar,
    refreshAccountToken,
    fetchEvents,
  };
}
