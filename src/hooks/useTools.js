// src/hooks/useTools.js
import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase.js';

export function useTools(uid) {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) {
      setTools([]);
      setLoading(false);
      return;
    }

    const toolsRef = collection(db, 'users', uid, 'tools');
    const q = query(toolsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTools(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [uid]);

  const addTool = useCallback(
    async ({ name, url }) => {
      if (!uid) return;
      const toolsRef = collection(db, 'users', uid, 'tools');
      // Auto-generate favicon URL
      let favicon = null;
      try {
        const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      } catch {}

      await addDoc(toolsRef, {
        name,
        url: url.startsWith('http') ? url : `https://${url}`,
        favicon,
        createdAt: Timestamp.now(),
      });
    },
    [uid]
  );

  const updateTool = useCallback(
    async (toolId, updates) => {
      if (!uid) return;
      const toolRef = doc(db, 'users', uid, 'tools', toolId);
      // Regenerate favicon if URL changed
      if (updates.url) {
        try {
          const domain = new URL(
            updates.url.startsWith('http') ? updates.url : `https://${updates.url}`
          ).hostname;
          updates.favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch {}
      }
      await updateDoc(toolRef, updates);
    },
    [uid]
  );

  const deleteTool = useCallback(
    async (toolId) => {
      if (!uid) return;
      const toolRef = doc(db, 'users', uid, 'tools', toolId);
      await deleteDoc(toolRef);
    },
    [uid]
  );

  return { tools, loading, error, addTool, updateTool, deleteTool };
}
