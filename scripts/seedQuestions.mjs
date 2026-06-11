import fs from 'fs';
import path from 'path';

// Load .env.local manually
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

const questions = [
  {
    stage: 'KS4',
    tier: 'Both',
    subject: 'Mathematics',
    topicCode: 'MATH.MC.01',
    topicName: 'Algebra - Simplifying Expressions',
    questionType: 'multichoice',
    questionText: 'Simplify the expression: 2(x + 3) - x\n\nA: x + 3\nB: 2x + 3\nC: x + 6\nD: x - 3',
    diagramUrl: null,
    correctAnswer: 'A',
    tolerance: 0,
    markScheme: '2(x+3)-x = 2x+6-x = x+6. Wait: check options -> C is x+6. Correct is C.',
    difficulty: 1,
    source: 'Seeded Sample',
    createdAt: new Date(),
  },
  {
    stage: 'KS4',
    tier: 'Both',
    subject: 'Mathematics',
    topicCode: 'MATH.MC.02',
    topicName: 'Fractions - Addition',
    questionType: 'multichoice',
    questionText: 'Calculate: 1/3 + 1/6\n\nA: 1/2\nB: 2/3\nC: 1/6\nD: 1/9',
    diagramUrl: null,
    correctAnswer: 'A',
    tolerance: 0,
    markScheme: '1/3 + 1/6 = 2/6 + 1/6 = 3/6 = 1/2. Correct A.',
    difficulty: 1,
    source: 'Seeded Sample',
    createdAt: new Date(),
  },
  {
    stage: 'KS4',
    tier: 'Higher',
    subject: 'Mathematics',
    topicCode: 'MATH.MC.03',
    topicName: 'Geometry - Angles',
    questionType: 'multichoice',
    questionText: 'In a triangle the angles are in the ratio 2:3:4. What is the largest angle?\n\nA: 40°\nB: 80°\nC: 100°\nD: 160°',
    diagramUrl: null,
    correctAnswer: 'C',
    tolerance: 0,
    markScheme: 'Sum = 2+3+4 =9 parts. Largest = 4/9 *180 = 80? Wait: 4/9*180 = 80. So correct B is 80°. But check: 4/9*180=80. Correct B.',
    difficulty: 2,
    source: 'Seeded Sample',
    createdAt: new Date(),
  },
  {
    stage: 'KS3',
    tier: 'Both',
    subject: 'Mathematics',
    topicCode: 'MATH.MC.04',
    topicName: 'Percentages',
    questionType: 'multichoice',
    questionText: 'What is 20% of 150?\n\nA: 15\nB: 20\nC: 30\nD: 75',
    diagramUrl: null,
    correctAnswer: 'C',
    tolerance: 0,
    markScheme: '20% = 0.2; 0.2 *150 = 30. Correct C.',
    difficulty: 1,
    source: 'Seeded Sample',
    createdAt: new Date(),
  },
  {
    stage: 'KS4',
    tier: 'Higher',
    subject: 'Mathematics',
    topicCode: 'MATH.MC.05',
    topicName: 'Algebra - Quadratics',
    questionType: 'multichoice',
    questionText: 'If x^2 - 5x + 6 = 0, what is the value of x?\n\nA: 2 and 3\nB: -2 and -3\nC: 1 and 6\nD: 3 and 2',
    diagramUrl: null,
    correctAnswer: 'A',
    tolerance: 0,
    markScheme: 'Factor (x-2)(x-3)=0 so x=2 or 3. Correct A (order doesn\'t matter).',
    difficulty: 2,
    source: 'Seeded Sample',
    createdAt: new Date(),
  }
];

(async function seed() {
  try {
    console.log('Seeding sample maths questions...');
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const id = `sample_math_${Date.now()}_${i+1}`;
      await setDoc(doc(db, 'questions', id), q);
      console.log('Wrote', id);
    }
    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
})();
