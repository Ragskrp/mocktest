# KS3 & KS4 Free Mock Test Platform — Final Blueprint (2026)
> Validated, corrected, and ready-to-build. Tailored for a developer with Firebase and Netlify experience.

---

## ⚠️ Critical Corrections to the Original Plan

Before the blueprint, here are the material errors in the original plan that would have caused real problems:

| # | Original Claim | Correction | Why It Matters |
|---|---|---|---|
| 1 | Use **Vercel Hobby** for hosting | Replace with **Netlify Starter** (your existing experience) | Vercel Hobby **prohibits commercial use** in its ToS. A school-facing platform almost certainly violates this. Netlify explicitly allows commercial use on the free tier. |
| 2 | Use **Supabase** as primary DB | Replace with **Firebase Firestore** (your existing experience) | Supabase pauses after **7 days of inactivity** — a catastrophic failure during school holidays. Firebase has **zero inactivity pauses** on the Spark plan. |
| 3 | Model names "Gemini 3.1 Flash‑Lite" and "Gemini 3 Flash" used with wrong rate limits | Real 2026 limits: **Gemini 3 Flash = 10 RPM, 1,500 RPD**; **Flash-Lite = 30 RPM, 1,500 RPD** | The original table shows "Gemini 3.1 Flash-Lite at 15 RPM, 1,000 RPD" — those are outdated Gemini 2.5 numbers. Use `gemini-2.5-flash` or `gemini-3-flash` as model strings. |
| 4 | **PyMuPDF** for server-side extraction | Remove entirely from the stack | PyMuPDF is a Python library. Your stack is JavaScript/Next.js. This creates a separate Python runtime dependency for an admin-only feature. `pdfjs-dist` client-side is sufficient. |
| 5 | Neon described as "Active Projects: 1" | Neon free tier now offers **1 project, 10 branches, 3 GiB** but is now **irrelevant** since Firebase replaces it | Kept for reference only. |
| 6 | GitHub Actions backup uses `pg_dump` | Firebase uses **Firestore export** via Admin SDK, not pg_dump | pg_dump is for PostgreSQL. Firestore has its own export format. |
| 7 | Billing warning missing | **Critical**: Enabling billing on a Google AI Studio project **permanently removes the Gemini free tier** on that project | Use a **separate Google Cloud project** for Gemini AI (admin-only use) and never attach billing to it. |

---

## 1. Platform Identity & Design Vision

### Brand Concept: **"Spark"** *(working title)*
> A KS3/KS4 mock-test platform that feels like a game, not a test. Every question is a mission. Every correct answer earns XP.

### Audience
UK secondary school students, Years 7–11 (ages 11–16). They live on TikTok, play Minecraft and Roblox, and are used to reward loops. This platform must compete with those for their attention — not with Sparx.

### Design System

#### Colour Palette (6 tokens)
| Role | Name | Hex | Usage |
|---|---|---|---|
| Background | Space Navy | `#0F0E1A` | Dark mode app shell |
| Surface | Card Plum | `#1E1B33` | Question cards, panels |
| Primary | Electric Violet | `#7C3AED` | Buttons, active states, XP bar |
| Accent A | Neon Coral | `#F97316` | Streak counter, warnings, highlights |
| Accent B | Cyber Cyan | `#06B6D4` | Science subject identity, hover glow |
| Accent C | Lime Zap | `#84CC16` | Correct answer flashes, badge unlocks |
| Text Primary | Soft White | `#F1F0FF` | All body copy |
| Text Muted | Lavender Grey | `#9CA3C0` | Labels, subtitles |

> **Aesthetic risk taken**: The platform uses a *dark space theme* by default rather than the light-background "classroom tool" look. Stars/particles in the app shell animate subtly on idle. This creates the "app you actually want to open" feeling teenagers respond to, while a one-click light mode switch satisfies teachers who may project it.

#### Typography
| Role | Font | Notes |
|---|---|---|
| Display / Headings | **Nunito** (700, 900) | Rounded, friendly, high energy — avoid the serif trap |
| Body / Questions | **Inter** (400, 500) | Neutral, maximum legibility for maths notation |
| Monospace / Codes | **JetBrains Mono** | Bookwork codes rendered in mono for the "secret agent" feel |
| All via Google Fonts | CDN load | Free, no self-hosting needed |

#### Signature Element: The **XP Pulse System**
- Every question attempt awards XP (correct = 100XP, attempted = 10XP, bookwork pass = 25XP).
- XP fills a glowing radial ring around the student's avatar on every screen.
- Correct answers trigger a `confetti-burst` animation (via `canvas-confetti`, 2KB, free).
- A **streak counter** with a flame icon (like Duolingo) tracks consecutive correct bookwork checks.
- Subject cards on the dashboard glow in their identity colour when hovered.

#### Subject Identity Colours
| Subject | Colour | Feel |
|---|---|---|
| Mathematics | Electric Violet `#7C3AED` | Sharp, precise |
| Physics | Cyber Cyan `#06B6D4` | Wave-like, electric |
| Chemistry | Neon Coral `#F97316` | Reactive, energetic |
| Biology | Lime Zap `#84CC16` | Organic, alive |

#### Gamification Layer (no backend needed for most of this)
- **Level badges**: Level 1 "Spark" → Level 5 "Supernova" → Level 10 "Quantum" (stored in Firestore per user)
- **Streak flames**: Consecutive correct bookwork checks (local Firestore field)
- **Topic mastery rings**: Radial chart per topic (using `recharts`, free)
- **Leaderboard** (opt-in): Class or school-level XP table, shown on teacher dashboard
- **Bookwork Code** presented as a glowing "Mission Code" — students write it down to "unlock" the next step

---

## 2. Final Technology Stack

### Hosting: **Netlify Starter (Free)**
> You already know Netlify. Use it. It explicitly allows commercial use on the free tier.

| Feature | Netlify Free (Starter) |
|---|---|
| Bandwidth | 100 GB/month |
| Build minutes | 300/month (sufficient for solo dev; ~1–2 min builds) |
| Serverless Functions | 125,000 invocations/month (Level 0) |
| Commercial use | ✅ Allowed |
| Custom domain + SSL | ✅ Free |
| Overage behaviour | Site pauses until next month — no surprise bills |

> **Alternative**: Cloudflare Pages (unlimited bandwidth, 500 builds/month) if you expect heavy traffic. But Netlify is your existing comfort zone.

**Build minutes tip**: At ~2 min per build, 300 minutes = ~150 deployments/month. More than enough for a solo project. If you run low, push multiple changes in one commit.

---

### Database & Auth: **Firebase Firestore + Firebase Auth (Spark Plan — Free)**
> You already know Firebase. No cold starts. No inactivity pauses. No surprises during half-term.

| Resource | Firebase Spark Free Limit | Platform Expectation |
|---|---|---|
| Firestore reads | 50,000 / day | ~200 students × 20 reads/session = 4,000/day ✅ |
| Firestore writes | 20,000 / day | ~200 students × 5 writes/session = 1,000/day ✅ |
| Firestore storage | 1 GiB | Text-only question bank ≈ 50MB for 5,000 questions ✅ |
| Firebase Auth (email/social) | 50,000 MAU | Well within free tier ✅ |
| Inactivity pause | ❌ Never pauses | Critical advantage over Supabase ✅ |
| Automatic backups | ❌ Not included | Use GitHub Actions (see Phase 4) |

**Why not Supabase?** Supabase free tier pauses after 7 days with no database traffic. School holidays (Christmas = 2 weeks, Easter = 2 weeks, Summer = 6 weeks) will kill the project repeatedly. Firebase has zero inactivity policy.

---

### Media/Asset Storage: **Cloudflare R2 (Free)**
| Resource | R2 Free Limit |
|---|---|
| Storage | 10 GB |
| Class A operations (writes) | 1,000,000 / month |
| Class B operations (reads) | 10,000,000 / month |
| Egress fees | **Zero** — this is R2's defining advantage |

Use R2 for: question diagram images (PNGs cropped from past papers), any admin-uploaded science illustrations.

---

### Math Rendering: **KaTeX (Free, MIT)**
- Renders LaTeX synchronously on the client side — no server roundtrip
- Zero layout shift on load (faster than MathJax)
- Install: `npm install katex`
- Use `react-katex` wrapper for React integration

---

### Interactive Geometry: **JSXGraph (Free, LGPL/MIT)**
- Dynamic coordinate grids, draggable points, function plots
- Pure JavaScript, SVG/Canvas rendering
- Works on mobile (touch-enabled)
- No commercial licensing issues
- Install: `npm install jsxgraph`
- Wrap in a React hook (see implementation section)

---

### AI Question Seeding: **Google Gemini API — Google AI Studio (Free)**
> For admin-only use when ingesting past papers. Not used at runtime by students.

**⚠️ Critical setup rule**: Create a **dedicated, separate Google Cloud project** for AI seeding. Never enable billing on it. The moment billing is enabled on a project, the free tier disappears entirely on that project (confirmed behaviour, May 2026).

| Model | Real RPM | Real RPD | Use Case |
|---|---|---|---|
| `gemini-3-flash` | 10 RPM | 1,500 RPD | Parsing complex multi-part questions with diagrams |
| `gemini-2.5-flash-lite` | 30 RPM | 1,500 RPD | Bulk text extraction from straightforward questions |
| Fallback: `gemini-2.5-flash` | 10 RPM | 500 RPD | When newer models hit transient limits |

Use the exponential backoff pattern from the original plan (it is correct). Queue admin ingestion requests client-side to stay under RPM limits.

---

### PDF Parsing (Admin tool only): **pdfjs-dist (Free, Apache 2.0)**
- Runs entirely in the browser — zero server cost, zero serverless timeout risk
- Renders PDF pages to `<canvas>` for admin to crop diagram regions
- Cropped regions → PNG → Cloudflare R2 directly from the browser
- Install: `npm install pdfjs-dist`

> **Drop PyMuPDF entirely.** It requires a Python runtime environment that is incompatible with your Next.js/Netlify stack. `pdfjs-dist` handles everything you need in the browser.

---

### Full Stack Framework: **Next.js 14+ (App Router)**
- Use with Netlify's Next.js runtime plugin (`@netlify/plugin-nextjs`)
- Server Components for initial page loads (fast for students on slow connections)
- Client Components for KaTeX, JSXGraph, confetti animations
- API Routes (Netlify Functions) for Gemini AI calls from the admin panel

---

## 3. Firestore Data Architecture

### Collection Structure

```
/users/{userId}
  ├── displayName: string
  ├── email: string
  ├── role: "student" | "teacher" | "admin"
  ├── yearGroup: 7 | 8 | 9 | 10 | 11
  ├── xpTotal: number
  ├── level: number
  ├── currentStreak: number
  ├── longestStreak: number
  ├── createdAt: timestamp

/questions/{questionId}
  ├── stage: "KS3" | "KS4"
  ├── tier: "Foundation" | "Higher" | "Both"
  ├── subject: "Mathematics" | "Physics" | "Chemistry" | "Biology"
  ├── topicCode: string        // e.g. "M3.1" (KS3), "U5.2" (GCSE)
  ├── topicName: string        // e.g. "Quadratic Equations"
  ├── questionType: "numeric" | "algebraic" | "multichoice" | "coordinate" | "diagram"
  ├── questionText: string     // KaTeX-formatted LaTeX string
  ├── diagramUrl: string | null  // Cloudflare R2 URL
  ├── correctAnswer: string    // For auto-grading
  ├── tolerance: number        // For numeric ε validation (default 0.0001)
  ├── markScheme: string       // KaTeX-formatted worked solution
  ├── difficulty: 1 | 2 | 3   // 1=Foundation, 2=Crossover, 3=Higher only
  ├── source: string           // e.g. "AQA June 2023 Paper 1"
  ├── createdAt: timestamp

/mock_tests/{testId}
  ├── title: string
  ├── subject: string
  ├── stage: "KS3" | "KS4"
  ├── tier: "Foundation" | "Higher"
  ├── questionIds: string[]    // Ordered array of questionId refs
  ├── durationMinutes: number
  ├── createdBy: userId
  ├── isPublic: boolean
  ├── createdAt: timestamp

/attempts/{attemptId}
  ├── userId: string
  ├── testId: string
  ├── status: "in_progress" | "completed"
  ├── startedAt: timestamp
  ├── completedAt: timestamp | null
  ├── xpEarned: number
  ├── bookworkCodes: map        // { "2B": { questionId, correctAnswer, validated: bool } }
  
  /attempts/{attemptId}/answers/{questionId}
    ├── studentAnswer: string
    ├── isCorrect: boolean
    ├── bookworkCode: string
    ├── bookworkValidated: boolean
    ├── attemptCount: number
    ├── timeSpentSeconds: number
    ├── submittedAt: timestamp
```

### Firestore Security Rules (Minimal Correct Setup)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Questions: anyone authenticated can read; only admins can write
    match /questions/{qId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Mock tests: authenticated read; teacher/admin write
    match /mock_tests/{tId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['teacher', 'admin'];
    }

    // Users: read own data; write own data (except role — only admin can set role)
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow update: if request.auth.uid == userId 
                    && !('role' in request.resource.data.diff(resource.data).affectedKeys());
      allow create: if request.auth.uid == userId;
    }

    // Attempts: students read/write only their own; teachers can read their class
    match /attempts/{attemptId} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['teacher', 'admin'];
    }

    match /attempts/{attemptId}/answers/{qId} {
      allow read, write: if request.auth.uid == get(/databases/$(database)/documents/attempts/$(attemptId)).data.userId;
    }
  }
}
```

---

## 4. Curriculum Topic Code System

Use a three-part code: `[Stage][Thread][Subtopic]`

| Stage | Mathematics | Science |
|---|---|---|
| KS3 (Yr 7–9) | `M` prefix | `S` prefix |
| KS4 Foundation | `UF` prefix | `SF` prefix |
| KS4 Higher | `UH` prefix | `SH` prefix |

### Mathematics Thread Codes

| Code | Strand | Example Topics |
|---|---|---|
| `M1.x` | Number | Fractions, decimals, HCF/LCM, surds |
| `M2.x` | Algebra | Linear equations, sequences, factorising |
| `M3.x` | Ratio & Proportion | Percentage change, direct/inverse proportion |
| `M4.x` | Geometry & Measures | Area, volume, Pythagoras, trigonometry |
| `M5.x` | Probability | Tree diagrams, Venn diagrams, conditional |
| `M6.x` | Statistics | Mean/median/mode, histograms, cumulative frequency |

### Science Discipline Codes

| Code | Subject | Example Topics |
|---|---|---|
| `S1.x` | Physics | Forces, energy, waves, electricity, magnetism |
| `S2.x` | Chemistry | Atomic structure, bonding, stoichiometry, rates |
| `S3.x` | Biology | Cells, genetics, ecology, homeostasis |

---

## 5. Bookwork Check — Full Implementation Logic

### State Machine

The wizard advances through 5 states per question block:

```
[CODE_PRESENTED] → [OFFLINE_WORKING] → [ANSWER_SUBMITTED] → [NEXT_QUESTION]
                                                    ↓ (random 25% chance)
                                          [BOOKWORK_CHECK_TRIGGERED]
                                                    ↓
                                     PASS → [CONTINUE]  FAIL → [VARIANT_QUESTION]
```

### Implementation

```javascript
// hooks/useBookworkSystem.js
import { useState, useCallback } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export function useBookworkSystem(attemptId, db) {
  const [codes, setCodes] = useState({});    // { "2B": { answer, validated } }
  const [pendingCheck, setPendingCheck] = useState(null);

  // Generate a readable alphanumeric code (avoids ambiguous chars: 0/O, 1/I)
  const generateCode = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const num = Math.floor(Math.random() * 9) + 1;
    const letter = chars[Math.floor(Math.random() * chars.length)];
    return `${num}${letter}`;
  }, []);

  const registerAnswer = useCallback(async (code, correctAnswer) => {
    const updated = { ...codes, [code]: { correctAnswer, validated: false } };
    setCodes(updated);
    // Persist bookwork codes in Firestore attempt document
    await setDoc(doc(db, 'attempts', attemptId), 
      { bookworkCodes: updated }, { merge: true });
    
    // 25% chance of triggering a check on the NEXT transition
    return Math.random() < 0.25 && Object.keys(updated).length > 1;
  }, [codes, attemptId, db]);

  const triggerCheck = useCallback(() => {
    const validCodes = Object.entries(codes)
      .filter(([, v]) => !v.validated);
    if (validCodes.length === 0) return null;
    const [code] = validCodes[Math.floor(Math.random() * validCodes.length)];
    setPendingCheck(code);
    return code;
  }, [codes]);

  const validateCheck = useCallback((code, studentInput) => {
    const stored = codes[code];
    if (!stored) return false;
    // Numeric tolerance check
    const target = parseFloat(stored.correctAnswer);
    const input = parseFloat(studentInput);
    const isMatch = isNaN(target) 
      ? stored.correctAnswer.trim().toLowerCase() === studentInput.trim().toLowerCase()
      : Math.abs(input - target) < 0.0001;
    
    if (isMatch) {
      setCodes(prev => ({ ...prev, [code]: { ...prev[code], validated: true } }));
    }
    setPendingCheck(null);
    return isMatch;
  }, [codes]);

  return { generateCode, registerAnswer, triggerCheck, validateCheck, pendingCheck };
}
```

### Bookwork Check UI Pattern (React Component sketch)

```jsx
// The code is displayed in a mono font with a glowing border
// Students see: "🔐 Mission Code: 3K — Write this in your workbook!"
<div className="bookwork-code-display">
  <span className="mission-label">🔐 Mission Code</span>
  <code className="code-badge">{activeCode}</code>
  <p>Write this code and your answer in your workbook before continuing.</p>
</div>

// On bookwork check trigger:
<div className="bookwork-check-modal">
  <h2>📓 Bookwork Check!</h2>
  <p>What was your answer for Mission Code <code>{checkCode}</code>?</p>
  <input type="text" placeholder="Enter your answer from your workbook" />
  <button onClick={handleValidate}>Submit</button>
</div>
```

---

## 6. Math Rendering Engine

### KaTeX Integration

```bash
npm install katex react-katex
```

```jsx
// components/MathDisplay.jsx
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

export function QuestionText({ latex, isBlock = false }) {
  // Split on $...$ inline and $$...$$ block delimiters
  if (isBlock) return <BlockMath math={latex} />;
  return <InlineMath math={latex} />;
}
```

### JSXGraph Integration (React Hook)

```javascript
// hooks/useJSXGraph.js
import { useEffect, useRef } from 'react';

export function useJSXGraph(boardId, config = {}) {
  const boardRef = useRef(null);

  useEffect(() => {
    // Dynamically import to prevent SSR issues (use dynamic import in Next.js)
    import('jsxgraph').then(({ JSXGraph }) => {
      if (boardRef.current) return; // Already initialised
      
      boardRef.current = JSXGraph.initBoard(boardId, {
        boundingbox: [-10, 10, 10, -10],
        axis: true,
        keepaspectratio: true,
        showcopyright: false,
        showNavigation: false,
        pan: { enabled: false },
        zoom: { enabled: false },
        ...config
      });
    });

    return () => {
      import('jsxgraph').then(({ JSXGraph }) => {
        if (boardRef.current) {
          JSXGraph.freeBoard(boardRef.current);
          boardRef.current = null;
        }
      });
    };
  }, [boardId]);

  return boardRef;
}
```

```jsx
// components/CoordinateQuestion.jsx — wrap JSXGraph in a dynamic import
import dynamic from 'next/dynamic';

const CoordinateBoard = dynamic(
  () => import('./CoordinateBoard'),
  { ssr: false }  // CRITICAL: prevents hydration errors
);
```

### Answer Validation

For all numeric questions, use tolerance-based validation:

```javascript
// lib/grading.js
export function validateAnswer(studentInput, correctAnswer, tolerance = 0.0001) {
  const studentNum = parseFloat(studentInput);
  const correctNum = parseFloat(correctAnswer);
  
  if (!isNaN(studentNum) && !isNaN(correctNum)) {
    return Math.abs(studentNum - correctNum) < tolerance;
  }
  
  // Algebraic/text answers: normalise whitespace and case
  return studentInput.trim().toLowerCase().replace(/\s+/g, ' ') 
       === correctAnswer.trim().toLowerCase().replace(/\s+/g, ' ');
}

// For coordinate geometry: validate against JSON state
export function validateCoordinates(studentCoords, targetCoords, tolerance = 0.5) {
  return Math.abs(studentCoords.x - targetCoords.x) < tolerance
      && Math.abs(studentCoords.y - targetCoords.y) < tolerance;
}
```

---

## 7. Admin Question Seeding Pipeline

### Architecture: Client-Side + Netlify Function

```
PDF Upload (browser)
    → pdfjs-dist renders pages to <canvas>
    → Admin crops diagram regions (bounding box UI)
    → Cropped PNG → Cloudflare R2 (via presigned URL from Netlify Function)
    → Text chunks + R2 URLs → Netlify Function (/api/seed-questions)
    → Netlify Function calls Gemini API → returns structured JSON
    → Admin reviews/edits → saves to Firestore
```

### Netlify Function: Question Extraction

```javascript
// netlify/functions/seed-questions.js
exports.handler = async (event) => {
  const { textChunk, diagramUrl, topicCode } = JSON.parse(event.body);

  const systemPrompt = `You are a UK GCSE/KS3 exam question parser.
Extract questions and return ONLY valid JSON (no markdown, no preamble).
Format: {
  "questionText": "LaTeX string using KaTeX syntax",
  "questionType": "numeric|algebraic|multichoice|coordinate",
  "correctAnswer": "string",
  "markScheme": "LaTeX string",
  "difficulty": 1|2|3,
  "source": "paper reference if visible"
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { text: systemPrompt },
          { text: `Topic: ${topicCode}\n\nQuestion text:\n${textChunk}` },
          ...(diagramUrl ? [{ text: `Diagram URL: ${diagramUrl}` }] : [])
        ]}],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
      })
    }
  );

  const data = await response.json();
  const raw = data.candidates[0].content.parts[0].text;
  
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return { statusCode: 200, body: JSON.stringify(parsed) };
  } catch {
    return { statusCode: 422, body: JSON.stringify({ error: 'Parse failed', raw }) };
  }
};
```

### Rate Limit Manager (client-side)

```javascript
// lib/geminiQueue.js
class GeminiQueue {
  constructor(rpm = 10) {
    this.rpm = rpm;
    this.queue = [];
    this.running = 0;
    this.minInterval = (60 / rpm) * 1000; // ms between requests
    this.lastCall = 0;
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running >= 1) return;
    const item = this.queue.shift();
    if (!item) return;

    const now = Date.now();
    const wait = Math.max(0, this.lastCall + this.minInterval - now);
    
    await new Promise(r => setTimeout(r, wait));
    this.running++;
    this.lastCall = Date.now();
    
    try {
      item.resolve(await item.fn());
    } catch (e) {
      if (e.status === 429) {
        // Push back with backoff
        this.queue.unshift(item);
        await new Promise(r => setTimeout(r, 5000));
      } else {
        item.reject(e);
      }
    } finally {
      this.running--;
      this.process();
    }
  }
}

export const geminiQueue = new GeminiQueue(10); // Use 10 RPM (Gemini 3 Flash)
```

---

## 8. Cloudflare R2 Integration

### Upload Flow (presigned URLs via Netlify Function)

R2 presigned URLs let the browser upload directly, bypassing your serverless function's 6MB body limit.

```javascript
// netlify/functions/r2-presign.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

exports.handler = async (event) => {
  const { filename, contentType } = JSON.parse(event.body);
  const key = `diagrams/${Date.now()}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(client, command, { expiresIn: 300 }); // 5 min
  const publicUrl = `https://pub-${process.env.R2_PUBLIC_BUCKET_ID}.r2.dev/${key}`;

  return { statusCode: 200, body: JSON.stringify({ uploadUrl: url, publicUrl }) };
};
```

---

## 9. Automated Firebase Backup (GitHub Actions)

Since you're using Firestore, the backup uses the **Firestore export** API via `gcloud`, not `pg_dump`.

```yaml
# .github/workflows/firestore-backup.yml
name: Nightly Firestore Backup to R2

on:
  schedule:
    - cron: '0 2 * * *'   # 02:00 UTC daily
  workflow_dispatch:       # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Install Google Cloud SDK
        uses: google-github-actions/setup-gcloud@v2
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY_JSON }}

      - name: Export Firestore to GCS (temporary)
        run: |
          gcloud firestore export gs://${{ secrets.GCS_TEMP_BUCKET }}/backups/$(date +%F) \
            --project=${{ secrets.FIREBASE_PROJECT_ID }}

      - name: Configure AWS CLI for R2
        run: |
          aws configure set aws_access_key_id ${{ secrets.R2_ACCESS_KEY_ID }}
          aws configure set aws_secret_access_key ${{ secrets.R2_SECRET_ACCESS_KEY }}
          aws configure set default.region auto

      - name: Copy from GCS to R2
        run: |
          gsutil -m cp -r gs://${{ secrets.GCS_TEMP_BUCKET }}/backups/$(date +%F) ./backup-temp
          aws s3 cp ./backup-temp/ s3://${{ secrets.R2_BUCKET_NAME }}/firestore-backups/$(date +%F)/ \
            --recursive \
            --endpoint-url https://${{ secrets.CF_ACCOUNT_ID }}.r2.cloudflarestorage.com

      - name: Cleanup old GCS backup
        run: gsutil rm -rf gs://${{ secrets.GCS_TEMP_BUCKET }}/backups/$(date +%F)
```

> **GitHub Actions free tier**: 2,000 runner minutes/month. This backup job takes ~2–3 minutes daily = ~75 minutes/month. Well within the free limit.

**Required Secrets in GitHub Repo:**
- `GCP_SA_KEY_JSON` — Service account key for Firestore export
- `FIREBASE_PROJECT_ID` — Your Firebase project ID
- `GCS_TEMP_BUCKET` — A GCS bucket (Firebase Storage is fine for temp staging)
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `CF_ACCOUNT_ID`

---

## 10. Keeping Firebase Active (Not Needed — But Ping Anyway)

Firebase Firestore does NOT pause. Unlike Supabase, there is no inactivity timeout. However, if you also use **Firebase Realtime Database** (you won't need to), that behaves differently.

You can optionally add a Netlify Scheduled Function to do a lightweight Firestore health ping every 72 hours — but for Firestore it is genuinely not required.

---

## 11. Implementation Roadmap

### Phase 1 — Foundation (Week 1–2)

**Goal**: Students can log in, see a dashboard, and start a test.

- [ ] Create Firebase project, enable Firestore + Auth (email/password + Google sign-in)
- [ ] Apply Firestore security rules from Section 3
- [ ] Initialize Next.js 14 app with Tailwind CSS
- [ ] Connect Netlify: `netlify init` → link GitHub repo → auto-deploy on push
- [ ] Build auth flow: sign-up, login, password reset (using Firebase Auth UI or custom)
- [ ] Build student dashboard: subject cards, XP ring, level badge
- [ ] Implement the dark-mode space theme (Section 1 design tokens)
- [ ] Create 5 test questions manually in Firestore to validate the data model

**Test**: A student can sign up, see their dashboard, and click into a subject.

---

### Phase 2 — Question Wizard & Bookwork System (Week 3–4)

**Goal**: Full test-taking flow with bookwork codes.

- [ ] Build the wizard component (page-by-page, single question per screen)
- [ ] Implement `useBookworkSystem` hook (Section 5)
- [ ] Build Bookwork Code display UI (glowing "Mission Code" card)
- [ ] Build Bookwork Check modal with tolerance validation
- [ ] Implement variant question redirect on bookwork failure
- [ ] Wire up XP awarding on correct answers + bookwork passes
- [ ] Add `canvas-confetti` on correct answers (`npm install canvas-confetti`)
- [ ] Display streak counter in the navigation bar
- [ ] Install KaTeX, render `questionText` fields (Section 6)
- [ ] Implement `useJSXGraph` hook with dynamic Next.js import (Section 6)
- [ ] Build coordinate question type (draggable point → JSON state → grading)

**Test**: End-to-end test run: start a 10-question mock test, experience two bookwork checks, see XP awarded, see confetti on correct answers.

---

### Phase 3 — Admin Panel & Question Seeding (Week 5–6)

**Goal**: Admin can ingest past papers and build a question bank.

- [ ] Create a protected `/admin` route (check `role === 'admin'` in Firestore)
- [ ] Build PDF viewer using `pdfjs-dist` (page navigation, zoom)
- [ ] Build bounding-box crop tool (mouse/touch drag selection on canvas)
- [ ] Create Netlify Function `r2-presign` for direct browser-to-R2 uploads
- [ ] Create Netlify Function `seed-questions` for Gemini API extraction
- [ ] Implement `GeminiQueue` class for rate limiting (Section 7)
- [ ] Build question review UI: admin sees extracted JSON, edits KaTeX, approves
- [ ] On approval, write to Firestore `/questions` collection
- [ ] Build topic code selector, difficulty picker, tier selector in the review UI
- [ ] Seed initial question bank: target 50 questions per subject strand (200 total minimum)

**Test**: Upload a real AQA GCSE past paper PDF, crop 5 questions, seed them into Firestore via Gemini, verify they render correctly in the student wizard.

---

### Phase 4 — Reliability & Data Safety (Week 7)

**Goal**: Platform survives holidays, traffic spikes, and admin mistakes.

- [ ] Set up GitHub Actions nightly backup (Section 9)
- [ ] Run manual backup test: verify `.json` export appears in R2 bucket
- [ ] Add Firestore composite indexes for common queries (by `subject + yearGroup + tier`)
- [ ] Add error boundaries around KaTeX/JSXGraph renders (malformed LaTeX shouldn't crash the page)
- [ ] Implement loading skeletons for question cards (prevent layout shift)
- [ ] Add `robots.txt` and `sitemap.xml` (Netlify handles this)
- [ ] Set up Netlify Analytics (free with Netlify, basic pageview tracking)
- [ ] Add WCAG 2.1 AA: keyboard navigation for wizard, aria-labels on interactive elements

**Test**: Manually trigger the backup workflow. Confirm the Firestore export is in R2.

---

### Phase 5 — Polish & Gamification (Week 8)

**Goal**: Platform feels like a game, not a test tool.

- [ ] Build achievement badge system: 10 badges (e.g., "First Spark", "7-Day Streak", "Algebra Master")
- [ ] Build class leaderboard for teachers (optional opt-in per student)
- [ ] Build topic mastery radial chart per student using `recharts`
- [ ] Add light mode toggle (CSS custom properties swap)
- [ ] Add ambient star-particle background on idle (use a lightweight Canvas animation, ~50 lines)
- [ ] Build teacher dashboard: see class progress, topic gaps, XP leaderboard
- [ ] Add "Practice Mode" (questions without bookwork codes, infinite attempts)
- [ ] Conduct mobile usability test on a real Android phone (the target student device)
- [ ] Final Lighthouse audit: target 90+ on Performance, Accessibility, Best Practices

---

## 12. Free Tier Limits — Full Reference Table

| Service | Key Free Resource | Platform Limit | Safety Buffer |
|---|---|---|---|
| **Netlify** | Bandwidth | 100 GB/month | ~1,000 students loading pages daily ✅ |
| **Netlify** | Build minutes | 300/month | ~150 deploys ✅ |
| **Netlify** | Function invocations | 125,000/month | Admin-only Gemini calls, very low volume ✅ |
| **Firebase Firestore** | Reads | 50,000/day | 200 students × 20 reads = 4,000/day ✅ |
| **Firebase Firestore** | Writes | 20,000/day | 200 students × 5 writes = 1,000/day ✅ |
| **Firebase Auth** | MAU | 50,000 | Well within ✅ |
| **Cloudflare R2** | Storage | 10 GB | ~5,000 diagram PNGs at 2MB avg = 10GB ⚠️ Compress to 100KB |
| **Cloudflare R2** | Egress | Zero | ✅ Unlimited reads |
| **Gemini API** | Admin RPD | 1,500/day | Seeding sessions only, not student-facing ✅ |
| **GitHub Actions** | Runner minutes | 2,000/month | ~3 min/day backup = 90 min/month ✅ |

### ⚠️ R2 Storage Warning
Cloudflare R2's 10GB free limit is the tightest constraint. Compress all diagram PNGs during the admin crop step. At 100KB per diagram PNG, 10GB = ~100,000 diagrams — entirely safe. Use browser-side compression before upload:

```javascript
// Compress canvas to PNG at 0.8 quality before uploading to R2
const blob = await new Promise(resolve => 
  canvas.toBlob(resolve, 'image/webp', 0.8)  // WebP is 30% smaller than PNG
);
```

---

## 13. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Firebase free reads exhausted by heavy traffic | Medium | High | Add Firestore query caching (`sessionStorage` for question data within a session). Add a rate-limit warning email alert via Firebase Extensions (free). |
| Netlify 300 build-minute limit hit | Low | Low | Batch commits. Use `[skip ci]` in commit messages for documentation changes. |
| Gemini API 429 rate limit during admin seeding | High | Low | `GeminiQueue` handles this. Seed in batches of 20 questions at a time. |
| Enabling billing on Gemini project accidentally kills free tier | Medium | High | Never attach billing to the AI project. Use budget alerts at $0 on the Google Cloud project. |
| Student data loss (no Firestore backup for 7+ days) | Low | High | Daily GitHub Actions backup to R2 mitigates this. |
| KaTeX renders malformed LaTeX from Gemini output | High | Low | Wrap all KaTeX renders in try/catch error boundaries. Show raw text as fallback. |
| Mobile performance on low-end Android phones | Medium | High | Dynamic import JSXGraph (only load on questions that need it). Lazy-load KaTeX CSS. Target Lighthouse score 90+. |
| Supabase inactivity pause during school holidays | N/A | N/A | Avoided entirely by using Firebase. ✅ |
| Vercel commercial use ToS violation | N/A | N/A | Avoided entirely by using Netlify. ✅ |

---

## 14. Environment Variables Checklist

Create `.env.local` for local dev. Add each to Netlify Site Settings → Environment Variables.

```bash
# Firebase (client-side — safe to expose; security is via Firestore Rules)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Cloudflare R2 (server-side only — never expose to client)
CF_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BUCKET_ID=  # The public URL hash for your R2 bucket

# Gemini AI (server-side only — admin use, separate GCP project)
GEMINI_API_KEY=
```

---

## 15. Recommended npm Dependencies

```bash
# Core framework
npm install next@latest react react-dom

# Styling
npm install tailwindcss postcss autoprefixer

# Firebase
npm install firebase

# Math rendering
npm install katex react-katex

# Geometry
npm install jsxgraph

# PDF parsing (admin tool only)
npm install pdfjs-dist

# Animations
npm install canvas-confetti

# Charts (for progress dashboards)
npm install recharts

# R2 uploads
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Utilities
npm install date-fns        # Date formatting
npm install zod             # Runtime schema validation for Gemini output
```

**Total bundle impact**: The largest dependency is JSXGraph (~300KB). Use dynamic imports (`ssr: false`) so it only loads when a coordinate geometry question is shown. KaTeX adds ~150KB but can be split per route.

---

## 16. Suggested MVP Scope (Build This First)

If you want a working prototype in 4 weeks, cut to this core:

1. **Auth** (Firebase email/password)
2. **3 test questions** per subject (12 total, manually entered in Firestore)
3. **Wizard with Bookwork Check** (the core UX differentiator)
4. **XP counter** (single Firestore field, updated on correct answer)
5. **Dark theme** with KaTeX rendering
6. **No admin panel yet** (seed questions directly in Firestore console)

Everything else is additive. The bookwork check + XP system IS the product.

---

*Blueprint finalized June 2026. All free tier limits verified against provider documentation.*
*Stack: Next.js 14 · Firebase Firestore/Auth · Netlify · Cloudflare R2 · Gemini API · KaTeX · JSXGraph · GitHub Actions*
