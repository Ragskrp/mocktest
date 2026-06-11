'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

interface UserProfile {
  displayName: string;
  email: string;
  role: string;
  yearGroup: number;
  xpTotal: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Authenticate user and fetch profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/');
      } else {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            // Fallback profile if Firestore is blank or rules block
            setProfile({
              displayName: user.displayName || 'Explorer',
              email: user.email || '',
              role: 'student',
              yearGroup: 10,
              xpTotal: 0,
              level: 1,
              currentStreak: 0,
              longestStreak: 0
            });
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
          // If Firestore is offline or blocked, provide a client-side fallback
          setProfile({
            displayName: user.displayName || 'Explorer',
            email: user.email || '',
            role: 'student',
            yearGroup: 10,
            xpTotal: 0,
            level: 1,
            currentStreak: 0,
            longestStreak: 0
          });
        } finally {
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-space-navy flex flex-col items-center justify-center space-bg">
        <div className="w-12 h-12 rounded-full border-4 border-electric-violet border-t-transparent animate-spin mb-4" />
        <p className="text-lavender-grey text-sm font-semibold tracking-wider animate-pulse">
          TUNING COGNITIVE RINGS...
        </p>
      </div>
    );
  }

  const userXP = profile?.xpTotal || 0;
  const userLevel = profile?.level || 1;
  const userStreak = profile?.currentStreak || 0;

  // Determine XP limits for current level (1000 XP per level for simplicity)
  const xpNeededForNextLevel = 1000;
  const xpInCurrentLevel = userXP % xpNeededForNextLevel;
  const progressPercent = Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100);

  // Circle path math
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Level Badge titles
  const getLevelTitle = (lvl: number) => {
    if (lvl >= 10) return 'Quantum';
    if (lvl >= 5) return 'Supernova';
    return 'Spark';
  };

  const subjects = [
    {
      name: 'Mathematics',
      code: 'Maths',
      theme: 'violet',
      glowClass: 'glow-purple',
      icon: '📐',
      color: '#7C3AED',
      topics: ['Linear Equations', 'Trigonometry', 'Quadratic Equations'],
      description: 'Master equations, geometry, and numerical ratios.'
    },
    {
      name: 'Physics',
      code: 'Physics',
      theme: 'cyan',
      glowClass: 'glow-cyan',
      icon: '⚡',
      color: '#06B6D4',
      topics: ['Forces & Energy', 'Waves', 'Electricity'],
      description: 'Unlock the mechanics of waves, energy, and force fields.'
    },
    {
      name: 'Chemistry',
      code: 'Chemistry',
      theme: 'coral',
      glowClass: 'glow-coral',
      icon: '🧪',
      color: '#F97316',
      topics: ['Atomic Structure', 'Bonding & Formulas', 'Rates of Reaction'],
      description: 'Analyze elements, atomic lattices, and rate equations.'
    },
    {
      name: 'Biology',
      code: 'Biology',
      theme: 'lime',
      glowClass: 'glow-lime',
      icon: '🧬',
      color: '#84CC16',
      topics: ['Cell Structures', 'Genetics', 'Homeostasis'],
      description: 'Examine cell biology, human organs, and ecosystems.'
    }
  ];

  return (
    <div className="min-h-screen space-bg flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-white/10 bg-space-navy/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <span className="font-black text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-soft-white to-white">
              SPARK
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Streak Counter */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-neon-coral/15 border border-neon-coral/30 rounded-full text-neon-coral font-bold text-sm">
              <span>🔥</span>
              <span>{userStreak} Streak</span>
            </div>

            {/* User Details */}
            <span className="text-sm font-semibold text-lavender-grey hidden sm:inline">
              {profile?.displayName} (Yr {profile?.yearGroup})
            </span>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="text-xs font-bold px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-soft-white hover:text-white transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Left column: User Progress Panel */}
        <section className="w-full lg:w-80 flex-shrink-0" aria-label="Your Progress">
          <div className="bg-card-plum/80 border border-white/10 rounded-2xl p-6 backdrop-blur-sm sticky top-24 flex flex-col items-center text-center">
            
            {/* XP Radial progress Ring */}
            <div className="relative w-36 h-36 flex items-center justify-center mb-4">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                {/* Background track circle */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="transparent"
                  className="stroke-space-navy"
                  strokeWidth="8"
                />
                {/* Glowing foreground ring */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="transparent"
                  className="stroke-electric-violet"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    filter: 'drop-shadow(0px 0px 4px rgba(124, 58, 237, 0.6))',
                    transition: 'stroke-dashoffset 0.8s ease-in-out'
                  }}
                />
              </svg>

              {/* Central avatar/Level indicator */}
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-extrabold text-white">{userLevel}</span>
                <span className="text-[10px] text-lavender-grey uppercase tracking-widest font-black">
                  Level
                </span>
              </div>
            </div>

            {/* Level Badge Text */}
            <div className="inline-block px-3 py-1 bg-electric-violet/10 border border-electric-violet/30 rounded-md text-electric-violet font-bold text-xs uppercase tracking-wider mb-4">
              🎖️ {getLevelTitle(userLevel)}
            </div>

            <h2 className="text-xl font-bold text-white mb-1">{profile?.displayName}</h2>
            <p className="text-xs text-lavender-grey mb-6">Year {profile?.yearGroup} Student</p>

            <div className="w-full space-y-3 border-t border-white/10 pt-6">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-lavender-grey">Total XP</span>
                <span className="text-white font-bold">{userXP} XP</span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-lavender-grey">Current Level Progress</span>
                <span className="text-white font-bold">{xpInCurrentLevel} / {xpNeededForNextLevel} XP</span>
              </div>
              <div className="w-full bg-space-navy/80 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-electric-violet h-full rounded-full transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
            </div>
          </div>
        </section>

        {/* Right column: Subject selection */}
        <section className="flex-1" aria-label="Available Subjects">
          <div className="mb-6">
            <h1 className="text-3xl font-black text-white">Select a Mission</h1>
            <p className="text-lavender-grey mt-1 text-sm">
              Choose a subject to launch a mock test. Correct answers fuel your XP ring.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subjects.map((sub) => (
              <div
                key={sub.code}
                className={`bg-card-plum/80 border border-white/10 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm cursor-pointer ${sub.glowClass}`}
              >
                {/* Accent lighting strip */}
                <div 
                  className="absolute top-0 left-0 w-full h-1" 
                  style={{ backgroundColor: sub.color }}
                />

                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${sub.color}20` }}>
                    {sub.icon}
                  </div>
                  <span className="text-[10px] text-lavender-grey uppercase tracking-widest font-black px-2 py-0.5 bg-space-navy/50 rounded-md border border-white/5">
                    {sub.code}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-white mb-2">{sub.name}</h2>
                <p className="text-xs text-lavender-grey mb-6 leading-relaxed">
                  {sub.description}
                </p>

                <div className="mb-6">
                  <p className="text-[10px] uppercase text-lavender-grey tracking-wider font-semibold mb-2">
                    Active Mission Topics:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {sub.topics.map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-space-navy/60 text-soft-white border border-white/5">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/test/${sub.code.toLowerCase()}`)}
                  className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white hover:border-white/20 transition flex items-center justify-center gap-2 group"
                >
                  Launch Test 
                  <span className="transform group-hover:translate-x-1 transition duration-200">➔</span>
                </button>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
