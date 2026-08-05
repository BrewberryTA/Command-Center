// src/hooks/useGCalCompletions.js
// Tracks which Google Calendar events have been marked complete.
// Stored in Firestore so completions persist across sessions.
// Events stay on the Dashboard until manually checked off.

import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, setDoc, deleteDoc, onSnapshot, Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase.js';

export function useGCalCompletions(uid) {
  const [completions, setCompletions] = useState({}); // { eventId: { completedAt, title } }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setCompletions({}); setLoading(false); return; }
    const ref = collection(db, 'users', uid, 'gcalCompletions');
    const unsubscribe = onSnapshot(ref, (snap) => {
      const map = {};
      snap.docs.forEach((d) => { map[d.id] = d.data(); });
      setCompletions(map);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  const markComplete = useCallback(async (eventId, title) => {
    if (!uid) return;
    await setDoc(doc(db, 'users', uid, 'gcalCompletions', eventId), {
      completedAt: Timestamp.now(),
      title: title || '',
    });
  }, [uid]);

  const markIncomplete = useCallback(async (eventId) => {
    if (!uid) return;
    await deleteDoc(doc(db, 'users', uid, 'gcalCompletions', eventId));
  }, [uid]);

  const isComplete = useCallback((eventId) => {
    return !!completions[eventId];
  }, [completions]);

  const toggleComplete = useCallback(async (eventId, title, currentlyComplete) => {
    if (currentlyComplete) {
      await markIncomplete(eventId);
    } else {
      await markComplete(eventId, title);
    }
  }, [markComplete, markIncomplete]);

  return { completions, loading, isComplete, markComplete, markIncomplete, toggleComplete };
}
