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
          dueDate: d.data().dueDate?.toDate?.() || null,
          createdAt: d.data().createdAt?.toDate?.() || null,
          completedDate: d.data().completedDate?.toDate?.() || null,
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
        dueDate: taskData.dueDate
          ? Timestamp.fromDate(new Date(taskData.dueDate))
          : Timestamp.fromDate(new Date()),
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

  const updateTask = useCallback(
    async (taskId, updates) => {
      if (!uid) return;
      const taskRef = doc(db, 'users', uid, 'tasks', taskId);
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

  const toggleComplete = useCallback(
    async (taskId, currentCompleted) => {
      await updateTask(taskId, {
        completed: !currentCompleted,
        completedDate: !currentCompleted ? Timestamp.now() : null,
      });
    },
    [updateTask]
  );

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

      const existingNotes = (task.notes || []).map((n) => ({
        ...n,
        timestamp: n.timestamp instanceof Date ? Timestamp.fromDate(n.timestamp) : n.timestamp,
      }));

      try {
        await updateDoc(taskRef, {
          notes: [...existingNotes, newNote],
          lastTouchedAt: Timestamp.now(),
        });
      } catch (err) {
        setError(err.message);
      }
    },
    [uid, tasks]
  );

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

  const deleteTask = useCallback(
    async (taskId) => {
      if (!uid) return;
      const taskRef = doc(db, 'users', uid, 'tasks', taskId);

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
      // "Open" used to mean strictly due-today, which meant a task became
      // invisible on the Dashboard the moment you set its due date to any
      // other day — including the future dates you'd deliberately picked.
      // Now: every incomplete open task EXCEPT ones already shown in Rolled
      // Over (past-due) belongs here — due today, due later, or with no
      // due date at all. Completed tasks still show through the end of the
      // day they were completed on, same as before, so the checkmark stays
      // visible as confirmation rather than vanishing instantly.
      open: tasks.filter((t) => {
        if (t.type !== 'open') return false;
        if (t.rolledOver && !t.completed && t.dueDate && t.dueDate < today) return false;
        if (t.completed) {
          return t.completedDate && t.completedDate >= today && t.completedDate < tomorrow;
        }
        return true;
      }),
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
        if (t.type === 'open' && t.dueDate < today) return true;
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
