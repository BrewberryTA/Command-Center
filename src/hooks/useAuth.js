// src/hooks/useAuth.js
import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase.js';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Store the Google OAuth access token for Calendar API calls
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Extract the Google OAuth credential (has access token for Calendar)
      const { OAuthProvider } = await import('firebase/auth');
      // Use GoogleAuthProvider to get credential
      const { GoogleAuthProvider } = await import('firebase/auth');
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        sessionStorage.setItem('gAccessToken', credential.accessToken);
      }
    } catch (err) {
      setError(err.message);
      console.error('Sign-in error:', err);
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
      setAccessToken(null);
      sessionStorage.removeItem('gAccessToken');
    } catch (err) {
      setError(err.message);
    }
  };

  // Restore access token from session if available
  useEffect(() => {
    const stored = sessionStorage.getItem('gAccessToken');
    if (stored) setAccessToken(stored);
  }, []);

  return { user, loading, error, signIn, signOut, accessToken };
}
