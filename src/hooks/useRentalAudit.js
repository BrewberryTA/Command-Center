// src/hooks/useRentalAudit.js
// Manages the monthly rental portfolio audit against Firestore.
// One document per property under users/{uid}/rentalProperties.
// Mirrors the pattern used in useTasks.js (real-time onSnapshot).

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  setDoc,
  query,
  orderBy,
  getDocs,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase.js';

// Fields that describe a point-in-time check (reset when a month is archived).
// leaseEndDate is intentionally excluded — a lease doesn't reset every month.
const MONTHLY_FIELDS = [
  'rentPaid', 'rentDue', 'rentReceived',
  'maintenanceCount', 'maintenanceNotes',
  'leadsCount', 'leadNotes', 'lastChecked',
];

// Seeded once, the first time a user has zero rental properties on file.
export const DEFAULT_PROPERTIES = [
  "2273 Mission Timber",
  "11915 Alydar Loop",
  "2109 E 6th Ave",
  "2101 6th Ave",
  "2107 E 6th Ave",
  "1183 N Worthington",
  "2107 E 6th Ave (2)",
  "2208 First Street Unit A",
  "2208 First Street Unit B",
  "2208 First Street Unit C",
  "2301 5th Street",
  "2301 5th Street Unit B",
  "2000 E Frontier Ave Unit 39",
  "2000 E Frontier Ave Unit 11",
  "2000 E Frontier Ave Unit 19",
  "2000 E Frontier Ave Unit 20",
  "2000 E Frontier Ave Unit 24",
  "2000 E Frontier Ave Unit 34",
  "2000 E Frontier Ave Unit 36",
  "2000 E Frontier Ave Unit 42",
  "2000 E Frontier Ave Unit 44",
  "2000 E Frontier Ave Unit 46",
  "2000 E Frontier Ave Unit 47",
  "2000 E Frontier Ave Unit 49",
  "2000 E Frontier Ave Unit 50",
  "2000 E Frontier Ave Unit 1",
  "2000 E Frontier Ave Unit 2",
  "2000 E Frontier Ave Unit 4",
  "2000 E Frontier Ave Unit 5",
  "2000 E Frontier Ave Unit 6",
  "2000 E Frontier Ave Unit 8",
  "2000 E Frontier Ave Unit 10",
  "2000 E Frontier Ave Unit 12",
  "2000 E Frontier Ave Unit 13",
  "2000 E Frontier Ave Unit 14",
  "2000 E Frontier Ave Unit 15",
  "2000 E Frontier Ave Unit 16",
  "2000 E Frontier Ave Unit 17",
  "2000 E Frontier Ave Unit 18",
  "2000 E Frontier Ave Unit 22",
  "2000 E Frontier Ave Unit 30",
  "2000 E Frontier Ave Unit 38",
  "2000 E Frontier Ave Unit 41",
  "2000 E Frontier Ave Unit 45",
  "2000 E Frontier Ave Unit 51",
  "2000 E Frontier Ave Lot 7",
  "2000 E Frontier Ave Unit 43",
  "2000 E Frontier Ave Unit 32",
  "2000 E Frontier Ave Unit 26",
  "2000 E Frontier Ave Unit 3",
  "2000 E Frontier Ave Unit 48",
];

// Module-level (not dependent on hook closures) so it can be used both
// inside archiveMonth and in the live summary calculation below.
export function daysUntilFor(dateStr) {
  if (!dateStr) return null;
  const end = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end - today) / 86400000);
}

export function leaseFlagFor(dateStr) {
  const days = daysUntilFor(dateStr);
  if (days === null) return '';
  if (days < 0) return 'EXPIRED - RENEW NOW';
  if (days <= 60) return 'RENEWAL DUE SOON';
  return 'OK';
}

function blankFields() {
  return {
    leaseEndDate: '',      // 'YYYY-MM-DD' string, simplest for a date input
    rentPaid: '',          // '' | 'Y' | 'N'
    rentDue: '',
    rentReceived: '',
    maintenanceCount: '',
    maintenanceNotes: '',
    leadsCount: '',
    leadNotes: '',
    lastChecked: '',
  };
}

export function useRentalAudit(uid) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setProperties([]);
      setLoading(false);
      return;
    }

    const propsRef = collection(db, 'users', uid, 'rentalProperties');
    const q = query(propsRef, orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty) {
          // First time this user has opened the tab — seed the portfolio once.
          try {
            const batch = writeBatch(db);
            DEFAULT_PROPERTIES.forEach((name, idx) => {
              const newDoc = doc(propsRef);
              batch.set(newDoc, { name, order: idx, ...blankFields() });
            });
            await batch.commit();
          } catch (err) {
            setError(err.message);
          }
          return; // onSnapshot fires again once the seed writes land
        }

        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProperties(items);
        setLoading(false);
      },
      (err) => {
        console.error('Rental audit snapshot error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [uid]);

  // ── Monthly archive history — one doc per completed month ──────
  useEffect(() => {
    if (!uid) {
      setHistory([]);
      setHistoryLoading(false);
      return;
    }

    const historyRef = collection(db, 'users', uid, 'rentalAuditHistory');
    const q = query(historyRef, orderBy('month', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setHistory(items);
        setHistoryLoading(false);
      },
      (err) => {
        console.error('Rental audit history snapshot error:', err);
        setHistoryLoading(false);
      }
    );

    return unsubscribe;
  }, [uid]);

  const updateProperty = useCallback(
    async (propertyId, updates) => {
      if (!uid) return;
      const propRef = doc(db, 'users', uid, 'rentalProperties', propertyId);
      try {
        await updateDoc(propRef, updates);
      } catch (err) {
        setError(err.message);
      }
    },
    [uid]
  );

  const addProperty = useCallback(
    async (name) => {
      if (!uid || !name.trim()) return;
      const propsRef = collection(db, 'users', uid, 'rentalProperties');
      try {
        await addDoc(propsRef, { name: name.trim(), order: properties.length, ...blankFields() });
      } catch (err) {
        setError(err.message);
      }
    },
    [uid, properties.length]
  );

  // ── Archive the current month, then reset month-specific fields ────
  // monthKey format: 'YYYY-MM'. Safe to call more than once for the same
  // month — it just overwrites that month's snapshot with the latest data.
  const archiveMonth = useCallback(
    async (monthKey, monthLabel) => {
      if (!uid || properties.length === 0) return;
      try {
        const historyDocRef = doc(db, 'users', uid, 'rentalAuditHistory', monthKey);
        await setDoc(historyDocRef, {
          month: monthKey,
          monthLabel,
          archivedAt: Timestamp.now(),
          properties: properties.map((p) => ({
            name: p.name,
            leaseEndDate: p.leaseEndDate || '',
            rentPaid: p.rentPaid || '',
            rentDue: p.rentDue || '',
            rentReceived: p.rentReceived || '',
            maintenanceCount: p.maintenanceCount || '',
            maintenanceNotes: p.maintenanceNotes || '',
            leadsCount: p.leadsCount || '',
            leadNotes: p.leadNotes || '',
            lastChecked: p.lastChecked || '',
            leaseFlagAtArchive: leaseFlagFor(p.leaseEndDate),
          })),
        });

        // Reset month-specific fields on the live sheet so next month starts fresh.
        // leaseEndDate is left untouched — leases don't reset monthly.
        const batch = writeBatch(db);
        properties.forEach((p) => {
          const propRef = doc(db, 'users', uid, 'rentalProperties', p.id);
          const resets = {};
          MONTHLY_FIELDS.forEach((f) => { resets[f] = ''; });
          batch.update(propRef, resets);
        });
        await batch.commit();
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [uid, properties]
  );

  // ── Derived flags/summary — same logic as the spreadsheet version ──
  const daysUntil = daysUntilFor;
  const leaseFlag = leaseFlagFor;

  const summary = {
    total: properties.length,
    expiringSoon: properties.filter((p) => leaseFlag(p.leaseEndDate) === 'RENEWAL DUE SOON').length,
    expired: properties.filter((p) => leaseFlag(p.leaseEndDate) === 'EXPIRED - RENEW NOW').length,
    rentNotPaid: properties.filter((p) => p.rentPaid === 'N').length,
    openMaintenance: properties.reduce((sum, p) => sum + (Number(p.maintenanceCount) || 0), 0),
    activeLeads: properties.reduce((sum, p) => sum + (Number(p.leadsCount) || 0), 0),
  };

  return {
    properties,
    loading,
    error,
    updateProperty,
    addProperty,
    daysUntil,
    leaseFlag,
    summary,
    history,
    historyLoading,
    archiveMonth,
  };
}
