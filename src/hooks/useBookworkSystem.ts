import { useState, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { validateAnswer } from '../lib/grading';

export interface BookworkEntry {
  questionId: string;
  correctAnswer: string;
  validated: boolean;
}

export interface BookworkCodesMap {
  [code: string]: BookworkEntry;
}

export function useBookworkSystem(attemptId: string | null, db: Firestore) {
  const [codes, setCodes] = useState<BookworkCodesMap>({});
  const [pendingCheck, setPendingCheck] = useState<string | null>(null);

  // Generate readable code avoiding ambiguous characters (0/O, 1/I)
  const generateCode = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const num = Math.floor(Math.random() * 9) + 1;
    const letter = chars[Math.floor(Math.random() * chars.length)];
    return `${num}${letter}`;
  }, []);

  const registerAnswer = useCallback(async (code: string, questionId: string, correctAnswer: string) => {
    const updated = {
      ...codes,
      [code]: { questionId, correctAnswer, validated: false }
    };
    setCodes(updated);

    if (attemptId) {
      try {
        await setDoc(
          doc(db, 'attempts', attemptId),
          { bookworkCodes: updated },
          { merge: true }
        );
      } catch (err) {
        console.error('Error saving bookwork codes:', err);
      }
    }

    // 25% chance of triggering a check on transition once there is prior work to audit.
    return Math.random() < 0.25 && Object.keys(updated).length > 1;
  }, [codes, attemptId, db]);

  const triggerCheck = useCallback(() => {
    const unvalidatedCodes = Object.entries(codes)
      .filter(([, v]) => !v.validated);
    
    if (unvalidatedCodes.length === 0) return null;

    // Pick a random unvalidated code
    const [code] = unvalidatedCodes[Math.floor(Math.random() * unvalidatedCodes.length)];
    setPendingCheck(code);
    return code;
  }, [codes]);

  const validateCheck = useCallback(async (code: string, studentInput: string) => {
    const stored = codes[code];
    if (!stored) return false;

    // Use grading utility tolerance
    const isMatch = validateAnswer(studentInput, stored.correctAnswer);

    if (isMatch) {
      const updated = {
        ...codes,
        [code]: { ...codes[code], validated: true }
      };
      setCodes(updated);

      if (attemptId) {
        try {
          await setDoc(
            doc(db, 'attempts', attemptId),
            { bookworkCodes: updated },
            { merge: true }
          );
        } catch (err) {
          console.error('Error updating validated bookwork code:', err);
        }
      }
    }

    setPendingCheck(null);
    return isMatch;
  }, [codes, attemptId, db]);

  return { generateCode, registerAnswer, triggerCheck, validateCheck, pendingCheck, codes, setCodes };
}
