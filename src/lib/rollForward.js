// src/lib/rollForward.js
// On each weekday app load, find incomplete open-ended tasks from prior business day
// and roll their dueDate forward to today, marking rolledOver: true.

import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase.js';

/**
 * Returns the previous business day (skips weekends) relative to a given date.
 */
export function getPreviousBusinessDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  do {
    d.setDate(d.getDate() - 1);
  } while (d.getDay() === 0 || d.getDay() === 6); // 0 = Sunday, 6 = Saturday
  return d;
}

/**
 * Returns true if today is a weekday (Mon–Fri).
 */
export function isTodayWeekday() {
  const day = new Date().getDay();
  return day !== 0 && day !== 6;
}

/**
 * Resets completed daily tasks back to incomplete each new day.
 * Called on every app load — finds daily tasks marked complete and resets them.
 */
export async function resetDailyTasks(uid) {
  const tasksRef = collection(db, 'users', uid, 'tasks');

  // Find all completed daily tasks
  const q = query(
    tasksRef,
    where('type', '==', 'daily'),
    where('completed', '==', true)
  );

  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const batch = writeBatch(db);
    let resetCount = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const completedDate = data.completedDate?.toDate?.();
      // Reset if completed before today OR if completedDate is missing (legacy tasks)
      if (!completedDate || completedDate < today) {
        const taskRef = doc(db, 'users', uid, 'tasks', docSnap.id);
        batch.update(taskRef, {
          completed: false,
          completedDate: null,
        });
        resetCount++;
      }
    });

    if (resetCount > 0) {
      await batch.commit();
      console.log(`[DailyReset] Reset ${resetCount} daily task(s) to incomplete.`);
    }
  } catch (err) {
    console.error('[DailyReset] Error resetting daily tasks:', err);
  }
}

/**
 * Finds open-ended tasks that are incomplete and have a dueDate before today,
 * then updates them to dueDate = today and rolledOver = true.
 */
export async function runRollForward(uid) {
  if (!isTodayWeekday()) return; // Only run on business days

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasksRef = collection(db, 'users', uid, 'tasks');

  // Query: open-ended, not completed, dueDate before today
  const q = query(
    tasksRef,
    where('type', '==', 'open'),
    where('completed', '==', false),
    where('dueDate', '<', Timestamp.fromDate(today))
  );

  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    const todayTimestamp = Timestamp.fromDate(today);

    snapshot.forEach((docSnap) => {
      const taskRef = doc(db, 'users', uid, 'tasks', docSnap.id);
      batch.update(taskRef, {
        dueDate: todayTimestamp,
        rolledOver: true,
      });
    });

    await batch.commit();
    console.log(`[RollForward] Updated ${snapshot.size} task(s) to today.`);
  } catch (err) {
    console.error('[RollForward] Error during roll-forward:', err);
  }
}
