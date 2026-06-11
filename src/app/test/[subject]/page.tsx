'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  increment
} from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { useBookworkSystem } from '../../../hooks/useBookworkSystem';
import { MathDisplay } from '../../../components/MathDisplay';
import { CoordinateQuestion } from '../../../components/CoordinateQuestion';
import { validateAnswer } from '../../../lib/grading';
import confetti from 'canvas-confetti';

interface Question {
  id: string;
  stage: 'KS3' | 'KS4';
  tier: 'Foundation' | 'Higher' | 'Both';
  subject: 'Mathematics' | 'Physics' | 'Chemistry' | 'Biology';
  topicCode: string;
  topicName: string;
  questionType: 'numeric' | 'algebraic' | 'multichoice' | 'coordinate' | 'diagram';
  questionText: string;
  diagramUrl: string | null;
  correctAnswer: string;
  tolerance: number;
  markScheme: string;
  difficulty: 1 | 2 | 3;
  source: string;
}

interface PageProps {
  params: Promise<{ subject: string }>;
}

export default function TestWizardPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [testState, setTestState] = useState<'LOADING' | 'CODE_PRESENTED' | 'OFFLINE_WORKING' | 'ANSWER_SUBMITTED' | 'BOOKWORK_CHECK' | 'VARIANT_ALERT' | 'COMPLETED'>('LOADING');
  
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [activeCode, setActiveCode] = useState('');
  const [studentInput, setStudentInput] = useState('');
  const [coordinateState, setCoordinateState] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  
  // XP & Stats tracked during this test session
  const [earnedXP, setEarnedXP] = useState(0);
  const [sessionStreak, setSessionStreak] = useState(0);
  const [shouldRunBookworkCheck, setShouldRunBookworkCheck] = useState(false);
  const [bookworkChecksShown, setBookworkChecksShown] = useState(0);

  // Bookwork system
  const { generateCode, registerAnswer, triggerCheck, validateCheck } = useBookworkSystem(attemptId, db);
  
  // Bookwork check specific states
  const [checkCode, setCheckCode] = useState('');
  const [bookworkInput, setBookworkInput] = useState('');
  const [bookworkCheckResult, setBookworkCheckResult] = useState<'NONE' | 'PASS' | 'FAIL'>('NONE');

  // Map route subject to DB subject
  const subjectNameMap: Record<string, 'Mathematics' | 'Physics' | 'Chemistry' | 'Biology'> = {
    maths: 'Mathematics',
    physics: 'Physics',
    chemistry: 'Chemistry',
    biology: 'Biology',
  };

  const dbSubject = subjectNameMap[resolvedParams.subject.toLowerCase()] || 'Mathematics';

  // 1. Authenticate user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/');
      } else {
        setUser(currentUser);
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data();
          setSessionStreak(typeof profile.currentStreak === 'number' ? profile.currentStreak : 0);
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 2. Fetch questions and initialize attempt
  useEffect(() => {
    if (!user) return;

    const initTest = async () => {
      try {
        setLoading(true);
        // Fetch questions matching the subject
        const qQuery = query(collection(db, 'questions'), where('subject', '==', dbSubject));
        const qSnapshot = await getDocs(qQuery);
        const fetchedQuestions: Question[] = [];
        
        qSnapshot.forEach((docSnap) => {
          fetchedQuestions.push({ id: docSnap.id, ...docSnap.data() } as Question);
        });

        if (fetchedQuestions.length === 0) {
          alert('No questions found for this subject. Please seed the database first.');
          router.push('/dashboard');
          return;
        }

        // Shuffle questions and run a full 10-question mock when enough data exists.
        const selected = fetchedQuestions.sort(() => 0.5 - Math.random()).slice(0, 10);
        setQuestions(selected);

        // Create an attempt doc
        const newAttemptId = `attempt_${Date.now()}_${user.uid.slice(0, 5)}`;
        setAttemptId(newAttemptId);

        await setDoc(doc(db, 'attempts', newAttemptId), {
          userId: user.uid,
          subject: dbSubject,
          status: 'in_progress',
          startedAt: new Date(),
          completedAt: null,
          xpEarned: 0,
          questionIds: selected.map(q => q.id),
          bookworkCodes: {}
        });

        // Initialize first question's bookwork code
        const code = generateCode();
        setActiveCode(code);
        setTestState('CODE_PRESENTED');
      } catch (err) {
        console.error('Error starting test:', err);
      } finally {
        setLoading(false);
      }
    };

    initTest();
  }, [user, dbSubject, router, generateCode]);

  const currentQuestion = questions[currentIdx];

  const handleStartQuestion = () => {
    setStudentInput('');
    setCoordinateState({ x: 0, y: 0 });
    setTestState('OFFLINE_WORKING');
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !attemptId || !user) return;

    let finalAnswer = studentInput;
    if (currentQuestion.questionType === 'coordinate') {
      finalAnswer = JSON.stringify(coordinateState);
    }

    const isCorrect = validateAnswer(finalAnswer, currentQuestion.correctAnswer, currentQuestion.tolerance || 0.0001);
    setLastAnswerCorrect(isCorrect);

    // Save answer doc
    const ansRef = doc(db, 'attempts', attemptId, 'answers', currentQuestion.id);
    await setDoc(ansRef, {
      studentAnswer: finalAnswer,
      isCorrect,
      bookworkCode: activeCode,
      bookworkValidated: false,
      attemptCount: 1,
      submittedAt: new Date()
    });

    // Award XP
    const baseXP = isCorrect ? 100 : 10;
    setEarnedXP(prev => prev + baseXP);

    // Update user profile and attempt XP in Firestore
    await updateDoc(doc(db, 'attempts', attemptId), {
      xpEarned: increment(baseXP)
    });
    await updateDoc(doc(db, 'users', user.uid), {
      xpTotal: increment(baseXP)
    });

    if (isCorrect) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });
    }

    // Register answer in bookwork hook
    const checkTriggered = await registerAnswer(activeCode, currentQuestion.id, finalAnswer);
    setShouldRunBookworkCheck(checkTriggered);

    // If a check is triggered, show the answer screen first and audit on continue.
    setTestState('ANSWER_SUBMITTED');
  };

  const handleContinue = async () => {
    const forceAcceptanceCheck =
      questions.length >= 10 &&
      bookworkChecksShown < 2 &&
      (currentIdx === 3 || currentIdx === 7);
    const runBookworkCheck = shouldRunBookworkCheck || forceAcceptanceCheck;

    if (!runBookworkCheck) {
      goToNextQuestion();
      return;
    }

    const checkCodeResult = triggerCheck();

    if (checkCodeResult) {
      setCheckCode(checkCodeResult);
      setBookworkInput('');
      setBookworkCheckResult('NONE');
      setShouldRunBookworkCheck(false);
      setBookworkChecksShown(prev => prev + 1);
      setTestState('BOOKWORK_CHECK');
    } else {
      setShouldRunBookworkCheck(false);
      goToNextQuestion();
    }
  };

  const goToNextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      const nextCode = generateCode();
      setActiveCode(nextCode);
      setTestState('CODE_PRESENTED');
    } else {
      completeTest();
    }
  };

  const handleValidateBookwork = async () => {
    if (!attemptId || !user) return;

    const isMatch = await validateCheck(checkCode, bookworkInput);
    if (isMatch) {
      setBookworkCheckResult('PASS');
      // Award 25XP and increment user streak
      setEarnedXP(prev => prev + 25);
      
      await updateDoc(doc(db, 'attempts', attemptId!), {
        xpEarned: increment(25)
      });

      await updateDoc(doc(db, 'users', user.uid), {
        xpTotal: increment(25),
        currentStreak: increment(1)
      });
      setSessionStreak(prev => prev + 1);

      confetti({
        particleCount: 100,
        spread: 80,
        colors: ['#84CC16', '#A3E635', '#06B6D4']
      });

      setTimeout(() => {
        goToNextQuestion();
      }, 2000);
    } else {
      setBookworkCheckResult('FAIL');

      // Reset streak
      await updateDoc(doc(db, 'users', user.uid), {
        currentStreak: 0
      });
      setSessionStreak(0);

      setTimeout(() => {
        triggerVariantRedirect();
      }, 2000);
    }
  };

  const triggerVariantRedirect = async () => {
    setTestState('LOADING');
    try {
      // Find a variant question of the same subject and topicCode that is not the current one
      const qQuery = query(
        collection(db, 'questions'), 
        where('subject', '==', dbSubject),
        where('topicCode', '==', currentQuestion.topicCode)
      );
      
      const qSnapshot = await getDocs(qQuery);
      let variant: Question | null = null;
      
      qSnapshot.forEach((docSnap) => {
        if (docSnap.id !== currentQuestion.id) {
          variant = { id: docSnap.id, ...docSnap.data() } as Question;
        }
      });

      // If no question with the exact same topic code, fall back to another subject question
      if (!variant) {
        const fallbackQuery = query(collection(db, 'questions'), where('subject', '==', dbSubject));
        const fallbackSnap = await getDocs(fallbackQuery);
        const candidates: Question[] = [];
        fallbackSnap.forEach((docSnap) => {
          if (!questions.some(q => q.id === docSnap.id)) {
            candidates.push({ id: docSnap.id, ...docSnap.data() } as Question);
          }
        });
        if (candidates.length > 0) {
          variant = candidates[Math.floor(Math.random() * candidates.length)];
        }
      }

      if (variant) {
        // Swap the current question with this variant
        const updatedQuestions = [...questions];
        updatedQuestions[currentIdx] = variant;
        setQuestions(updatedQuestions);
        
        // Notify user about variant swap
        setTestState('VARIANT_ALERT');
      } else {
        // No other questions, just retry the current one
        setTestState('VARIANT_ALERT');
      }
    } catch (err) {
      console.error('Error fetching variant:', err);
      setTestState('VARIANT_ALERT');
    }
  };

  const handleVariantAcknowledge = () => {
    // Generate new code for this retake
    const nextCode = generateCode();
    setActiveCode(nextCode);
    setTestState('CODE_PRESENTED');
  };

  const completeTest = async () => {
    if (attemptId) {
      await updateDoc(doc(db, 'attempts', attemptId), {
        status: 'completed',
        completedAt: new Date()
      });
    }
    setTestState('COMPLETED');
  };

  if (testState === 'LOADING' || loading) {
    return (
      <div className="min-h-screen space-bg flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-cyber-cyan border-t-transparent animate-spin mb-4" />
        <p className="text-lavender-grey text-sm font-semibold tracking-wider animate-pulse">
          CONFIGURING SPACE CODES...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-bg flex flex-col text-white">
      {/* Test Wizard Header */}
      <header className="border-b border-white/10 bg-space-navy/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-xs font-bold px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-lavender-grey hover:text-white transition"
          >
            ← Abort Mission
          </button>
          
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-lavender-grey">
              Question {currentIdx + 1} of {questions.length}
            </span>
            <div className="w-32 bg-space-navy/60 h-2 rounded-full overflow-hidden border border-white/5">
              <div 
                className="bg-cyber-cyan h-full rounded-full transition-all duration-300"
                style={{ width: `${((currentIdx) / questions.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-cyber-cyan">
              +{earnedXP} XP
            </span>
            <span className="text-xs font-bold text-neon-coral">
              {sessionStreak} Streak
            </span>
          </div>
        </div>
      </header>

      {/* Main Wizard Area */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-xl bg-card-plum/80 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl relative overflow-hidden transition-all duration-300">
          
          {/* Neon accent strip */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-electric-violet via-cyber-cyan to-electric-violet" />

          {testState === 'CODE_PRESENTED' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-full bg-electric-violet/10 border border-electric-violet/40 flex items-center justify-center text-3xl mb-6 shadow-[0_0_15px_rgba(124,58,237,0.3)] animate-pulse">
                🔐
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-lavender-grey mb-2">
                Mission Code Assigned
              </h2>
              <div className="px-8 py-4 bg-space-navy/60 border border-electric-violet/30 rounded-xl mb-4 font-mono text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-lavender-grey to-white shadow-[0_0_20px_rgba(124,58,237,0.15)]">
                {activeCode}
              </div>
              <p className="text-xs text-lavender-grey leading-relaxed max-w-sm mb-8">
                Write down this <strong>Mission Code</strong> and show your working out in your workbook before you attempt the question. You may be audited on it later!
              </p>
              <button
                onClick={handleStartQuestion}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-electric-violet to-purple-600 hover:from-purple-600 hover:to-electric-violet text-sm font-bold tracking-wide text-white transition shadow-lg shadow-electric-violet/20"
              >
                Launch Question ➔
              </button>
            </div>
          )}

          {testState === 'OFFLINE_WORKING' && currentQuestion && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="px-2.5 py-0.5 rounded-full bg-space-navy/50 text-[10px] text-lavender-grey uppercase tracking-widest border border-white/5">
                  {currentQuestion.topicName}
                </span>
                <span className="text-xs text-lavender-grey font-mono">
                  Code: {activeCode}
                </span>
              </div>

              <div className="text-base leading-relaxed text-white py-2 font-medium">
                <MathDisplay text={currentQuestion.questionText} />
              </div>

              {currentQuestion.questionType === 'coordinate' ? (
                <div className="py-4">
                  <CoordinateQuestion
                    boardId="jxgbox-interactive"
                    initialX={0}
                    initialY={0}
                    onChange={(x, y) => setCoordinateState({ x, y })}
                  />
                  <div className="text-center text-xs text-lavender-grey mt-2 font-semibold">
                    Current Point: <span className="text-cyber-cyan">({coordinateState.x}, {coordinateState.y})</span>
                  </div>
                </div>
              ) : currentQuestion.questionType === 'multichoice' ? (
                <div className="grid grid-cols-1 gap-3 py-2">
                  {['A', 'B', 'C', 'D'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setStudentInput(opt)}
                      className={`w-full py-3 px-4 rounded-xl text-left border transition text-sm font-bold flex items-center justify-between ${
                        studentInput === opt
                          ? 'bg-electric-violet/10 border-electric-violet text-white'
                          : 'bg-space-navy/30 border-white/10 text-lavender-grey hover:bg-space-navy/50 hover:border-white/20'
                      }`}
                    >
                      <span>Option {opt}</span>
                      {studentInput === opt && <span className="text-electric-violet">⚡ Active</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-2">
                  <label htmlFor="student-answer" className="block text-xs font-semibold text-lavender-grey uppercase tracking-wider mb-2">
                    Enter your answer
                  </label>
                  <input
                    id="student-answer"
                    type="text"
                    value={studentInput}
                    onChange={(e) => setStudentInput(e.target.value)}
                    placeholder="Type your final answer here"
                    className="w-full bg-space-navy/50 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-electric-violet transition"
                  />
                </div>
              )}

              <button
                onClick={handleSubmitAnswer}
                disabled={currentQuestion.questionType !== 'coordinate' && !studentInput.trim()}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-cyber-cyan to-blue-500 hover:from-blue-500 hover:to-cyber-cyan disabled:opacity-40 disabled:pointer-events-none text-sm font-bold tracking-wide text-white transition shadow-lg shadow-cyber-cyan/15"
              >
                Submit Answer ➔
              </button>
            </div>
          )}

          {testState === 'ANSWER_SUBMITTED' && currentQuestion && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center text-center">
                {lastAnswerCorrect ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-lime-zap/10 border border-lime-zap/40 flex items-center justify-center text-3xl mb-4 shadow-[0_0_15px_rgba(132,204,22,0.3)]">
                      ✨
                    </div>
                    <h2 className="text-2xl font-black text-lime-zap mb-1">
                      Correct Answer!
                    </h2>
                    <p className="text-xs text-lavender-grey">
                      Excellent work, space explorer. You earned +100 XP.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-neon-coral/10 border border-neon-coral/40 flex items-center justify-center text-3xl mb-4 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                      ⚠️
                    </div>
                    <h2 className="text-2xl font-black text-neon-coral mb-1">
                      Incorrect Answer
                    </h2>
                    <p className="text-xs text-lavender-grey">
                      Don&apos;t worry, you still earned +10 XP for the attempt.
                    </p>
                  </>
                )}
              </div>

              <div className="bg-space-navy/60 border border-white/5 rounded-xl p-5 space-y-3">
                <h3 className="text-xs font-black uppercase text-lavender-grey tracking-wider">
                  Mark Scheme & Explanation
                </h3>
                <p className="text-sm leading-relaxed text-lavender-grey">
                  <MathDisplay text={currentQuestion.markScheme} />
                </p>
              </div>

              <button
                onClick={handleContinue}
                className="w-full py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-white transition"
              >
                Continue Mission ➔
              </button>
            </div>
          )}

          {testState === 'BOOKWORK_CHECK' && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/40 flex items-center justify-center text-3xl mb-4 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  📓
                </div>
                <h2 className="text-2xl font-black text-cyber-cyan mb-1">
                  Bookwork Check!
                </h2>
                <p className="text-xs text-lavender-grey max-w-sm">
                  To ensure complete data alignment, please enter the answer you recorded in your workbook for Mission Code:
                </p>
                <div className="mt-3 px-4 py-1.5 bg-space-navy/60 border border-cyber-cyan/30 rounded-lg font-mono text-2xl font-bold text-cyber-cyan">
                  {checkCode}
                </div>
              </div>

              {bookworkCheckResult === 'NONE' ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="bookwork-answer" className="block text-xs font-semibold text-lavender-grey uppercase tracking-wider mb-2">
                      Enter Workbook Answer
                    </label>
                    <input
                      id="bookwork-answer"
                      type="text"
                      value={bookworkInput}
                      onChange={(e) => setBookworkInput(e.target.value)}
                      placeholder="e.g. 5, or Option B"
                      className="w-full bg-space-navy/50 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyber-cyan transition"
                    />
                  </div>

                  <button
                    onClick={handleValidateBookwork}
                    disabled={!bookworkInput.trim()}
                    className="w-full py-3 rounded-lg bg-cyber-cyan text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-40 transition"
                  >
                    Verify Bookwork ➔
                  </button>
                </div>
              ) : bookworkCheckResult === 'PASS' ? (
                <div className="text-center py-4 bg-lime-zap/10 border border-lime-zap/30 rounded-xl">
                  <span className="text-3xl">✅</span>
                  <h3 className="text-lg font-bold text-lime-zap mt-2">Verification Passed!</h3>
                  <p className="text-xs text-lavender-grey mt-1">+25 XP awarded. Streak continued!</p>
                </div>
              ) : (
                <div className="text-center py-4 bg-neon-coral/10 border border-neon-coral/30 rounded-xl">
                  <span className="text-3xl">❌</span>
                  <h3 className="text-lg font-bold text-neon-coral mt-2">Verification Failed!</h3>
                  <p className="text-xs text-lavender-grey mt-1">Answer does not match. Redirecting to variant question...</p>
                </div>
              )}
            </div>
          )}

          {testState === 'VARIANT_ALERT' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-full bg-neon-coral/10 border border-neon-coral/40 flex items-center justify-center text-3xl mb-6 animate-bounce">
                🔄
              </div>
              <h2 className="text-2xl font-black text-neon-coral mb-2">
                New Variant Assigned
              </h2>
              <p className="text-xs text-lavender-grey leading-relaxed max-w-sm mb-8">
                Because the bookwork check was not completed correctly, you have been reassigned a different version of this topic. Make sure to record the new mission code and show your work!
              </p>
              <button
                onClick={handleVariantAcknowledge}
                className="w-full py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-white transition"
              >
                Acknowledge & Continue
              </button>
            </div>
          )}

          {testState === 'COMPLETED' && (
            <div className="flex flex-col items-center text-center py-6 space-y-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-lime-zap to-cyber-cyan flex items-center justify-center text-4xl shadow-[0_0_25px_rgba(6,182,212,0.4)]">
                🏆
              </div>
              <div>
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-soft-white via-white to-lavender-grey">
                  Mission Accomplished!
                </h2>
                <p className="text-xs text-lavender-grey mt-1">
                  You have successfully completed the {dbSubject} Mock Test.
                </p>
              </div>

              <div className="w-full bg-space-navy/60 border border-white/5 rounded-xl p-5 grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] uppercase text-lavender-grey tracking-wider font-semibold">
                    Total XP Gained
                  </span>
                  <span className="text-2xl font-black text-cyber-cyan">
                    +{earnedXP} XP
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-lavender-grey tracking-wider font-semibold">
                    Questions Solved
                  </span>
                  <span className="text-2xl font-black text-white">
                    {questions.length} / {questions.length}
                  </span>
                </div>
              </div>

              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-cyber-cyan to-blue-500 hover:from-blue-500 hover:to-cyber-cyan text-sm font-bold tracking-wide text-white transition shadow-lg shadow-cyber-cyan/15"
              >
                Return to Command Center ➔
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
