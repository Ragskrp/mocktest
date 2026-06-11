'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { seedMockQuestions } from '../lib/mockData';

export default function AuthGate() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [yearGroup, setYearGroup] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Seed questions quietly if we are using the local emulator
        if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
          await seedMockQuestions();
        }
        router.push('/dashboard');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        router.push('/dashboard');
      } else if (mode === 'register') {
        if (!displayName.trim()) {
          throw new Error('Please enter a display name.');
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create user doc in firestore
        await setDoc(doc(db, 'users', user.uid), {
          displayName: displayName.trim(),
          email: email.trim(),
          role: 'student',
          yearGroup: yearGroup,
          xpTotal: 0,
          level: 1,
          currentStreak: 0,
          longestStreak: 0,
          createdAt: new Date()
        });

        // Seed questions if emulator
        if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
          await seedMockQuestions();
        }
        router.push('/dashboard');
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setSuccessMsg('Password reset link sent to your email.');
        setMode('login');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Helper helper to log in instantly on Local Emulator
  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    const demoEmail = 'test.student@spark.sch.uk';
    const demoPassword = 'password123';
    try {
      try {
        await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      } catch (err: any) {
        // If demo user doesn't exist, register them
        const userCredential = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
        const user = userCredential.user;
        await setDoc(doc(db, 'users', user.uid), {
          displayName: 'Alex Spark',
          email: demoEmail,
          role: 'student',
          yearGroup: 10,
          xpTotal: 2450,
          level: 3,
          currentStreak: 4,
          longestStreak: 12,
          createdAt: new Date()
        });
      }
      await seedMockQuestions();
      router.push('/dashboard');
    } catch (err: any) {
      setError('Emulator Demo Login failed. Ensure firestore emulator is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center space-bg px-4 py-12">
      {/* Outer ambient glow circles */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-electric-violet/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-cyber-cyan/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md bg-card-plum/80 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl transition-all duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-electric-violet to-cyber-cyan flex items-center justify-center text-3xl font-black text-white shadow-[0_0_20px_rgba(124,58,237,0.5)] animate-pulse">
            ⚡
          </div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-soft-white via-white to-lavender-grey mt-4">
            SPARK
          </h1>
          <p className="text-sm text-lavender-grey mt-1 font-medium">
            Turn testing into a cosmic mission
          </p>
        </div>

        {error && (
          <div className="bg-neon-coral/15 border border-neon-coral/50 text-neon-coral text-xs rounded-lg p-3 mb-6 font-semibold flex items-center gap-2">
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-lime-zap/15 border border-lime-zap/50 text-lime-zap text-xs rounded-lg p-3 mb-6 font-semibold">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold text-lavender-grey uppercase tracking-wider mb-1">
                Display Name
              </label>
              <input
                id="reg-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. AstroStudent"
                className="w-full bg-space-navy/50 border border-white/10 rounded-lg py-2 px-3 text-sm text-white placeholder-lavender-grey/50 focus:outline-none focus:border-electric-violet focus:ring-1 focus:ring-electric-violet transition"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-semibold text-lavender-grey uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.com"
              className="w-full bg-space-navy/50 border border-white/10 rounded-lg py-2 px-3 text-sm text-white placeholder-lavender-grey/50 focus:outline-none focus:border-electric-violet focus:ring-1 focus:ring-electric-violet transition"
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label htmlFor="auth-pass" className="block text-xs font-semibold text-lavender-grey uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                id="auth-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-space-navy/50 border border-white/10 rounded-lg py-2 px-3 text-sm text-white placeholder-lavender-grey/50 focus:outline-none focus:border-electric-violet focus:ring-1 focus:ring-electric-violet transition"
                required
              />
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label htmlFor="reg-year" className="block text-xs font-semibold text-lavender-grey uppercase tracking-wider mb-1">
                Year Group
              </label>
              <select
                id="reg-year"
                value={yearGroup}
                onChange={(e) => setYearGroup(parseInt(e.target.value))}
                className="w-full bg-space-navy/50 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-electric-violet focus:ring-1 focus:ring-electric-violet transition"
              >
                <option value={7}>Year 7</option>
                <option value={8}>Year 8</option>
                <option value={9}>Year 9</option>
                <option value={10}>Year 10</option>
                <option value={11}>Year 11</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-electric-violet to-purple-600 hover:from-purple-600 hover:to-electric-violet text-sm font-bold tracking-wide text-white transition duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-electric-violet/20 focus:outline-none focus:ring-2 focus:ring-electric-violet disabled:opacity-50"
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Launch Mission' : mode === 'register' ? 'Register Account' : 'Send Instructions'}
          </button>
        </form>

        <div className="flex items-center justify-between text-xs text-lavender-grey mt-6">
          {mode === 'login' ? (
            <>
              <button onClick={() => setMode('register')} className="hover:text-white transition">
                Create an account
              </button>
              <button onClick={() => setMode('forgot')} className="hover:text-white transition">
                Forgot password?
              </button>
            </>
          ) : (
            <button onClick={() => setMode('login')} className="hover:text-white transition mx-auto block text-center">
              Back to Sign In
            </button>
          )}
        </div>

        {/* Emulator Demo Login Assistant (Only shown or optimized for developer ease) */}
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center">
          <p className="text-[10px] text-lavender-grey uppercase tracking-widest mb-3">
            Testing / Development
          </p>
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-2 px-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-cyber-cyan font-bold transition flex items-center justify-center gap-2"
          >
            🚀 Instant Emulator Student Login
          </button>
        </div>
      </div>
    </main>
  );
}
