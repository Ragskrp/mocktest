Seeding guide — Inject sample questions into Firestore

Overview

This guide explains how to seed multiple-choice questions into your Firebase Firestore for the `mock-test-engine-98021` project. Two options are provided:

- Quick one-off: run the `scripts/seedQuestions.mjs` script (already included).
- Reusable import: place questions in a JSON file and run `scripts/seed_from_file.mjs`.

Prerequisites

- You must be logged in with the Firebase CLI: `npx firebase login`
- Your `.env.local` must contain the Firebase project values (this repo uses `NEXT_PUBLIC_FIREBASE_...`).
- Firestore must be provisioned in the Firebase console (Firestore -> Create database).
- Your Firestore security rules must permit writes for the seeder. Two options:
  - Temporarily relax `questions` rules while seeding (not recommended for long periods).
  - Create an admin user in Authentication and add a `users/{uid}` document with `role: "admin"` so seeding can run under that admin account.

Files added

- `scripts/seed_from_file.mjs` — Node ESM script that reads a JSON file and writes documents to `questions` collection.
- `scripts/sample_questions.json` — Example file with 5 Maths multiple-choice questions.

How to run (recommended)

1. Ensure `.env.local` at project root contains the correct Firebase project variables.

2. (Optional) Set the active Firebase project for CLI commands:

```powershell
npx firebase use --add
# follow prompts and select or enter mock-test-engine-98021
```

3. Seed from the sample file (or replace with your own JSON path):

```powershell
node scripts/seed_from_file.mjs scripts/sample_questions.json
```

4. Verify in Firebase Console → Firestore → `questions` collection.

Alternative: run the one-off seeder that was used earlier:

```powershell
node scripts/seedQuestions.mjs
```

JSON template (question object)

Each question should match this shape (example fields used by the app):

{
  "stage": "KS4",
  "tier": "Both",
  "subject": "Mathematics",
  "topicCode": "MATH.MC.01",
  "topicName": "Algebra - Simplifying Expressions",
  "questionType": "multichoice",
  "questionText": "Simplify: 2(x + 3) - x\n\nA: x + 3\nB: 2x + 3\nC: x + 6\nD: x - 3",
  "diagramUrl": null,
  "correctAnswer": "C",
  "tolerance": 0,
  "markScheme": "2(x+3)-x = 2x+6-x = x+6. Correct C.",
  "difficulty": 1,
  "source": "Seeded Sample",
  "createdAt": "2026-06-11T00:00:00.000Z"
}

Notes & Troubleshooting

- If you get permission errors, ensure your script is running with credentials that Firestore rules allow to write. The simplest secure approach is to create a Firebase Authentication user and add a `users/{uid}` doc with `role: 'admin'`.

- To create an admin user quickly from the Firebase Console:
  1. Auth -> Add user (choose email/password). Note the UID.
  2. Firestore -> Create document `users/{UID}` with content:
     {
       "displayName": "Admin",
       "email": "you@example.com",
       "role": "admin"
     }

- After seeding, revert any relaxed security rules.

Questions or want me to seed more? Open an issue or message me here and I can extend the sample bank.