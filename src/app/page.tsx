'use client';

import React, { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

type AuthMode = 'login' | 'signup';

async function seedLocalQuestions() {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR !== 'true') return;

  const { seedMockQuestions } = await import('../lib/mockData');
  await seedMockQuestions();
}

function authErrorMessage(error: unknown) {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : '';

  if (code === 'auth/email-already-in-use') return 'This email is already registered.';
  if (code === 'auth/invalid-credential') return 'Invalid email or password.';
  if (code === 'auth/weak-password') return 'Password should be at least 6 characters.';
  if (code === 'auth/missing-password') return 'Enter your password to continue.';
  if (code === 'auth/invalid-email') return 'Enter a valid email address.';

  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [yearGroup, setYearGroup] = useState(10);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        void seedLocalQuestions().finally(() => router.push('/dashboard'));
        return;
      }

      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      if (mode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const name = displayName.trim() || 'Explorer';

        await updateProfile(credential.user, { displayName: name });
        await setDoc(doc(db, 'users', credential.user.uid), {
          displayName: name,
          email: credential.user.email ?? email,
          role: 'student',
          yearGroup,
          xpTotal: 0,
          level: 1,
          currentStreak: 0,
          longestStreak: 0,
          createdAt: new Date(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      await seedLocalQuestions();
      router.push('/dashboard');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Enter your email first, then request a reset link.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent.');
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen space-bg flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-full border-4 border-electric-violet border-t-transparent animate-spin mb-4" />
        <p className="text-lavender-grey text-sm font-semibold tracking-wider animate-pulse">
          LOADING COMMAND CENTER...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen space-bg flex items-center justify-center px-4 py-10 text-white">
      <section className="w-full max-w-md bg-card-plum/85 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-electric-violet/20 border border-electric-violet/40 flex items-center justify-center text-3xl mb-4">
            SP
          </div>
          <h1 className="text-4xl font-black tracking-wide">SPARK</h1>
          <p className="text-sm text-lavender-grey mt-2">
            Launch your KS3 and KS4 mock-test missions.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-space-navy/60 border border-white/10 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2 rounded-lg text-sm font-bold transition ${
              mode === 'login' ? 'bg-electric-violet text-white' : 'text-lavender-grey hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`py-2 rounded-lg text-sm font-bold transition ${
              mode === 'signup' ? 'bg-electric-violet text-white' : 'text-lavender-grey hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <label className="block">
                <span className="block text-xs font-semibold text-lavender-grey uppercase tracking-wider mb-2">
                  Display Name
                </span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full bg-space-navy/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-electric-violet"
                  placeholder="Explorer name"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-semibold text-lavender-grey uppercase tracking-wider mb-2">
                  Year Group
                </span>
                <select
                  value={yearGroup}
                  onChange={(event) => setYearGroup(Number(event.target.value))}
                  className="w-full bg-space-navy/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-electric-violet"
                >
                  {[7, 8, 9, 10, 11].map((year) => (
                    <option key={year} value={year}>
                      Year {year}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <label className="block">
            <span className="block text-xs font-semibold text-lavender-grey uppercase tracking-wider mb-2">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full bg-space-navy/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-electric-violet"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-semibold text-lavender-grey uppercase tracking-wider mb-2">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full bg-space-navy/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-electric-violet"
              placeholder="********"
            />
          </label>

          {error && (
            <p className="rounded-xl border border-neon-coral/30 bg-neon-coral/10 px-4 py-3 text-sm text-neon-coral">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-xl border border-lime-zap/30 bg-lime-zap/10 px-4 py-3 text-sm text-lime-zap">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-electric-violet to-purple-600 text-sm font-black disabled:opacity-50 transition"
          >
            {submitting ? 'Launching...' : mode === 'signup' ? 'Create Account' : 'Enter Dashboard'}
          </button>
        </form>

        {mode === 'login' && (
          <button
            type="button"
            onClick={handlePasswordReset}
            className="w-full mt-4 text-xs font-semibold text-lavender-grey hover:text-white transition"
          >
            Send password reset link
          </button>
        )}
      </section>
    </main>
  );
}
