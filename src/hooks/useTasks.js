// src/hooks/useTasks.js
// Manages all task CRUD operations against Firestore.
// Uses real-time onSnapshot for live updates.

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { ref, deleteObject, listAll } from 'firebase/storage';
import { db, storage } from '../lib/firebase.js';

export function useTasks(uid) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mirror of the latest tasks array, readable inside callbacks without
  // adding `tasks` to their dependency lists (keeps callback identity stable).
  const tasksCacheRef = useRef([]);

  useEffect(() => {
    if (!uid) {
      setTasks([]);
      tasksCacheRef.current = [];
      setLoading(false);
      return;
    }

    const tasksRef = collection(db, 'users', uid, 'tasks');
    const q = query(tasksRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          // Convert Firestore Timestamps to JS Dates for convenience
          dueDate: d.data().dueDate?.toDate?.() || null,
          createdAt: d.data().createdAt?.toDate?.() || null,
          completedDate: d.data().completedDate?.toDate?.() || null,
          // Activity timestamps — null on tasks created before this feature shipped
          lastTouchedAt: d.data().lastTouchedAt?.toDate?.() || null,
          statusChangedAt: d.data().statusChangedAt?.toDate?.() || null,
          priorityChangedAt: d.data().priorityChangedAt?.toDate?.() || null,
          notes: (d.data().notes || []).map((n) => ({
            ...n,
            timestamp: n.timestamp?.toDate?.() || new Date(),
          })),
        }));
        tasksCacheRef.current = items;
        setTasks(items);
        setLoading(false);
      },
      (err) => {
        console.error('Tasks snapshot error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [uid]);

  // ── CREATE ────────────────────────────────────────────────
  const addTask = useCallback(
    async (taskData) => {
      if (!uid) return;
      const tasksRef = collection(db, 'users', uid, 'tasks');
      const createdStamp = Timestamp.now();
      const newTask = {
        title: '',
        type: 'open',
        priority: 'Med',
        status: 'No progress',
        duration: 30,
        dueDate: Timestamp.fromDate(new Date()),
        recurringDay: null,
        recurringTime: null,
        recurringDayOfMonth: null,
        weekdaysOnly: false,
        completed: false,
        completedDate: null,
        notes: [],
        attachments: [],
        createdAt: createdStamp,
        rolledOver: false,
        ...taskData,
        // Ensure dueDate is a Timestamp if provided as Date
        dueDate: taskData.dueDate
          ? Timestamp.fromDate(new Date(taskData.dueDate))
          : Timestamp.fromDate(new Date()),
        // Activity timestamps always start at creation time — not overridable
        // by taskData, so they can never be spoofed by a caller.
        lastTouchedAt: createdStamp,
        statusChangedAt: createdStamp,
        priorityChangedAt: createdStamp,
      };
      try {
        const docRef = await addDoc(tasksRef, newTask);
        return docRef.id;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [uid]
  );

  // ── UPDATE ────────────────────────────────────────────────
  // Every manual edit stamps lastTouchedAt. status/priority get their own
  // stamps ONLY when the value genuinely changes — re-saving a task with the
  // same status must not reset its staleness clock.
  const updateTask = useCallback(
    async (taskId, updates) => {
      if (!uid) return;
      const taskRef = doc(db, 'users', uid, 'tasks', taskId);
      // Convert Date objects to Timestamps
      const sanitized = { ...updates };
      if (sanitized.dueDate instanceof Date) {
        sanitized.dueDate = Timestamp.fromDate(sanitized.dueDate);
      }
      if (sanitized.completedDate instanceof Date) {
        sanitized.completedDate = Timestamp.fromDate(sanitized.completedDate);
      }

      const now = Timestamp.now();
      const prev = tasksCacheRef.current.find((t) => t.id === taskId);

      sanitized.lastTouchedAt = now;

      const has = (k) => Object.prototype.hasOwnProperty.call(sanitized, k);

      if (has('status') && (!prev || prev.status !== sanitized.status)) {
        sanitized.statusChangedAt = now;
      }
      if (has('priority') && (!prev || prev.priority !== sanitized.priority)) {
        sanitized.priorityChangedAt = now;
      }

      try {
        await updateDoc(taskRef, sanitized);
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [uid]
  );

  // ── TOGGLE COMPLETE ───────────────────────────────────────
  const toggleComplete = useCallback(
    async (taskId, currentCompleted) => {
      await updateTask(taskId, {
        completed: !currentCompleted,
        completedDate: !currentCompleted ? Timestamp.now() : null,
      });
    },
    [updateTask]
  );

  // ── ADD NOTE ──────────────────────────────────────────────
  const addNote = useCallback(
    async (taskId, noteText, authorName) => {
      if (!uid || !noteText.trim()) return;
      const taskRef = doc(db, 'users', uid, 'tasks', taskId);
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const newNote = {
        text: noteText.trim(),
        timestamp: Timestamp.now(),
        author: authorName || 'User',
      };

      // Optimistic update handled by onSnapshot — just write to Firestore
      const existingNotes = (task.notes || []).map((n) => ({
        ...n,
        timestamp: n.timestamp instanceof Date ? Timestamp.fromDate(n.timestamp) : n.timestamp,
      }));

      try {
        await updateDoc(taskRef, {
          notes: [...existingNotes, newNote],
          // Writing a note is real engagement — counts as touching the task
          lastTouchedAt: Timestamp.now(),
        });
      } catch (err) {
        setError(err.message);
      }
    },
    [uid, tasks]
  );

  // ── ADD ATTACHMENT (metadata only — file uploaded separately) ─
  const addAttachment = useCallback(
    async (taskId, attachment) => {
      if (!uid) return;
      const taskRef = doc(db, 'users', uid, 'tasks', taskId);
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const existing = task.attachments || [];
      try {
        await updateDoc(taskRef, {
          attachments: [...existing, attachment],
          lastTouchedAt: Timestamp.now(),
        });
      } catch (err) {
        setError(err.message);
      }
    },
    [uid, tasks]
  );

  // ── DELETE ────────────────────────────────────────────────
  const deleteTask = useCallback(
    async (taskId) => {
      if (!uid) return;
      const taskRef = doc(db, 'users', uid, 'tasks', taskId);

      // Delete all Storage attachments for this task
      try {
        const storageRef = ref(storage, `users/${uid}/attachments/${taskId}`);
        const list = await listAll(storageRef);
        await Promise.all(list.items.map((item) => deleteObject(item)));
      } catch {
        // Ignore storage errors (folder may not exist)
      }

      try {
        await deleteDoc(taskRef);
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [uid]
  );

  // ── HELPERS ───────────────────────────────────────────────
  const getTasksByType = useCallback(
    (type) => tasks.filter((t) => t.type === type),
    [tasks]
  );

  const getTodaysTasks = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
    const dayOfMonth = today.getDate();
    const isWeekend = dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday';

    return {
      open: tasks.filter(
        (t) =>
          t.type === 'open' &&
          t.dueDate >= today &&
          t.dueDate < tomorrow
      ),
      events: tasks.filter(
        (t) =>
          t.type === 'event' &&
          t.dueDate >= today &&
          t.dueDate < tomorrow
      ),
      daily: tasks
        .filter((t) => t.type === 'daily' && !(t.weekdaysOnly && isWeekend))
        .map((t) => {
          const completedToday =
            t.completed && t.completedDate && t.completedDate >= today && t.completedDate < tomorrow;
          return { ...t, completed: !!completedToday };
        }),
      weekly: tasks.filter(
        (t) => t.type === 'weekly' && t.recurringDay === dayOfWeek
      ),
      monthly: tasks.filter(
        (t) => t.type === 'monthly' && t.recurringDayOfMonth === dayOfMonth
      ),
      rolledOver: tasks.filter((t) => {
        if (!t.rolledOver || t.completed) return false;
        // Only show in Rolled Over if the task is PAST DUE (not today)
        // Tasks due today already show in Open Tasks section
        if (t.type === 'open' && t.dueDate < today) return true;
        // Events that are past due and not today
        if (t.type === 'event' && t.dueDate < today) return true;
        return false;
      }),
    };
  }, [tasks]);

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    toggleComplete,
    addNote,
    addAttachment,
    deleteTask,
    getTasksByType,
    getTodaysTasks,
  };
}
