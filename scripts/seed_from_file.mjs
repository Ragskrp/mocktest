import fs from 'fs';
import path from 'path';

// Load .env.local values (simple parser)
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  env.forEach((line) => {
    const [k, ...rest] = line.split('=');
    process.env[k] = rest.join('=');
  });
} else {
  console.error('.env.local not found in project root. Aborting.');
  process.exit(1);
}

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node scripts/seed_from_file.mjs <path-to-json-file>');
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), args[0]);
if (!fs.existsSync(filePath)) {
  console.error('JSON file not found:', filePath);
  process.exit(1);
}

let items;
try {
  const raw = fs.readFileSync(filePath, 'utf8');
  items = JSON.parse(raw);
  if (!Array.isArray(items)) throw new Error('JSON must be an array of question objects');
} catch (err) {
  console.error('Failed to read/parse JSON file:', err);
  process.exit(1);
}

(async () => {
  try {
    console.log('Seeding', items.length, 'questions to Firestore...');
    for (let i = 0; i < items.length; i++) {
      const q = items[i];
      const id = q.id || `seed_${Date.now()}_${i+1}`;
      await setDoc(doc(db, 'questions', id), q);
      console.log('Wrote', id);
    }
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
})();
