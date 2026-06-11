import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import fs from 'fs';

// Manual parser for .env.local to avoid needing the 'dotenv' dependency
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = value;
      }
    }
  });
} catch (e) {
  console.warn('Warning: Could not read .env.local', e.message);
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Usage: node scripts/promote.mjs <email> <password>');
  process.exit(1);
}

async function run() {
  try {
    console.log(`Logging in as ${email}...`);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    
    console.log(`Promoting user ${user.uid} to admin...`);
    await updateDoc(doc(db, 'users', user.uid), {
      role: 'admin'
    });
    console.log('Success! Your account is now an admin. You can log in and visit /admin.');
    process.exit(0);
  } catch (err) {
    console.error('Promotion failed:', err);
    process.exit(1);
  }
}

run();
