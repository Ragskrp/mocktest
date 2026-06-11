import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Use Emulators only when explicitly enabled in environment variables.
// This prevents auth calls from trying to use localhost:9099 when the emulator is not running.
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  // Check if we already connected to emulator in this hot-reload instance
  // (Avoids re-binding errors in development hot reloads)
  const isServer = typeof window === 'undefined';
  const isEmulator = !isServer && (window as any)._firebase_emulator_connected;
  if (!isEmulator && !isServer) {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, 'localhost', 8080);
      (window as any)._firebase_emulator_connected = true;
      console.log('Firebase Emulators connected successfully.');
    } catch (err) {
      console.warn('Failed to connect to Firebase Emulators:', err);
    }
  }
}

export { app, auth, db };
