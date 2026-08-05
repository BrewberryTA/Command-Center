// src/lib/firebase.js
// Firebase v9 modular SDK — single initialization point for the entire app.

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebaseConfig.js';

// Initialize Firebase app (safe to call multiple times — returns same instance)
const app = initializeApp(firebaseConfig);

// Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// Request calendar scope so we can link Google Calendar
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');

// Firestore
export const db = getFirestore(app);

// Storage
export const storage = getStorage(app);

export default app;
