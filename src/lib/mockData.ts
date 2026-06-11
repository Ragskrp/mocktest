import { collection, doc, writeBatch, getDocs, limit, query } from 'firebase/firestore';
import { db } from './firebase';

export interface Question {
  id?: string;
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
  createdAt: any;
}

const mockQuestions: Omit<Question, 'id'>[] = [
  {
    stage: 'KS4',
    tier: 'Both',
    subject: 'Mathematics',
    topicCode: 'UF2.1',
    topicName: 'Linear Equations',
    questionType: 'numeric',
    questionText: 'Solve the equation for $x$: $3x + 7 = 22$.',
    diagramUrl: null,
    correctAnswer: '5',
    tolerance: 0.0001,
    markScheme: 'Subtract 7 from both sides: $3x = 15$. Divide by 3: $x = 5$.',
    difficulty: 1,
    source: 'AQA GCSE Practice Paper 1',
    createdAt: new Date(),
  },
  {
    stage: 'KS4',
    tier: 'Higher',
    subject: 'Mathematics',
    topicCode: 'UH4.3',
    topicName: 'Trigonometry',
    questionType: 'numeric',
    questionText: 'In a right-angled triangle, the hypotenuse is $10\\text{ cm}$ and the angle opposite to side $a$ is $30^\\circ$. Find the length of side $a$ in $\\text{cm}$.',
    diagramUrl: null,
    correctAnswer: '5',
    tolerance: 0.01,
    markScheme: 'Use sine rule: $\\sin(30^\\circ) = \\frac{a}{10}$. Since $\\sin(30^\\circ) = 0.5$, we get $a = 10 \\times 0.5 = 5\\text{ cm}$.',
    difficulty: 3,
    source: 'Edexcel GCSE Nov 2022',
    createdAt: new Date(),
  },
  {
    stage: 'KS4',
    tier: 'Both',
    subject: 'Physics',
    topicCode: 'SF1.1',
    topicName: 'Forces and Electricity',
    questionType: 'numeric',
    questionText: 'A current of $0.5\\text{ A}$ flows through a resistor of $24 \\; \\Omega$. Calculate the potential difference across the resistor in volts ($V$).',
    diagramUrl: null,
    correctAnswer: '12',
    tolerance: 0.0001,
    markScheme: 'Use Ohm\'s Law: $V = I \\times R$. $V = 0.5 \\times 24 = 12\\text{ V}$.',
    difficulty: 2,
    source: 'AQA GCSE Physics Paper 1',
    createdAt: new Date(),
  },
  {
    stage: 'KS3',
    tier: 'Both',
    subject: 'Chemistry',
    topicCode: 'S2.1',
    topicName: 'Atomic Structure',
    questionType: 'multichoice',
    questionText: 'Which particle has a positive charge?\n\nA: Electron\nB: Neutron\nC: Proton\nD: Atom',
    diagramUrl: null,
    correctAnswer: 'C',
    tolerance: 0.0,
    markScheme: 'Protons have a positive charge (+1), electrons are negative (-1), and neutrons have no charge (0). Therefore, the correct option is C.',
    difficulty: 1,
    source: 'KS3 National Curriculum',
    createdAt: new Date(),
  },
  {
    stage: 'KS4',
    tier: 'Foundation',
    subject: 'Biology',
    topicCode: 'SF3.1',
    topicName: 'Cells and Ecology',
    questionType: 'multichoice',
    questionText: 'What is the main function of the chloroplast in a plant cell?\n\nA: Respiration\nB: Photosynthesis\nC: Protein synthesis\nD: Structural support',
    diagramUrl: null,
    correctAnswer: 'B',
    tolerance: 0.0,
    markScheme: 'Chloroplasts contain chlorophyll which absorbs light for photosynthesis. The correct option is B.',
    difficulty: 1,
    source: 'Edexcel GCSE Biology',
    createdAt: new Date(),
  }
];

export async function seedMockQuestions() {
  try {
    const qColl = collection(db, 'questions');
    const existing = await getDocs(query(qColl, limit(1)));
    if (!existing.empty) {
      console.log('Database already has questions, skipping seeding.');
      return;
    }

    console.log('Seeding mock questions to Firestore...');
    const batch = writeBatch(db);
    mockQuestions.forEach((q, idx) => {
      const docRef = doc(qColl, `mock_q_${idx + 1}`);
      batch.set(docRef, q);
    });

    await batch.commit();
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding questions:', error);
  }
}
