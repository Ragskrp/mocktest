import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

type Stage = 'KS3' | 'KS4';
type Tier = 'Foundation' | 'Higher' | 'Both';
type Subject = 'Mathematics' | 'Physics' | 'Chemistry' | 'Biology';
type QuestionType = 'numeric' | 'algebraic' | 'multichoice' | 'coordinate' | 'diagram';
type Difficulty = 1 | 2 | 3;

export interface Question {
  id?: string;
  stage: Stage;
  tier: Tier;
  subject: Subject;
  topicCode: string;
  topicName: string;
  questionType: QuestionType;
  questionText: string;
  diagramUrl: string | null;
  correctAnswer: string;
  tolerance: number;
  markScheme: string;
  difficulty: Difficulty;
  source: string;
  createdAt: Date;
}

type QuestionSeed = Omit<Question, 'id' | 'createdAt' | 'diagramUrl'> & {
  diagramUrl?: string | null;
};

function question(seed: QuestionSeed): Omit<Question, 'id'> {
  return {
    diagramUrl: null,
    createdAt: new Date(),
    ...seed,
  };
}

const mockQuestions: Omit<Question, 'id'>[] = [
  question({
    stage: 'KS4',
    tier: 'Both',
    subject: 'Mathematics',
    topicCode: 'UF2.1',
    topicName: 'Linear Equations',
    questionType: 'numeric',
    questionText: 'Solve for $x$: $3x + 7 = 22$.',
    correctAnswer: '5',
    tolerance: 0.0001,
    markScheme: 'Subtract $7$ to get $3x = 15$, then divide by $3$, so $x = 5$.',
    difficulty: 1,
    source: 'Spark Phase 2 Seed',
  }),
  question({
    stage: 'KS4',
    tier: 'Both',
    subject: 'Mathematics',
    topicCode: 'UF1.2',
    topicName: 'Percentages',
    questionType: 'numeric',
    questionText: 'A jacket costs $40$ GBP and is reduced by $25\\%$. What is the sale price in GBP?',
    correctAnswer: '30',
    tolerance: 0.0001,
    markScheme: '$25\\%$ of $40$ is $10$, so the sale price is $40 - 10 = 30$.',
    difficulty: 1,
    source: 'Spark Phase 2 Seed',
  }),
  question({
    stage: 'KS4',
    tier: 'Both',
    subject: 'Mathematics',
    topicCode: 'UH4.3',
    topicName: 'Trigonometry',
    questionType: 'numeric',
    questionText: 'In a right-angled triangle, $\\sin(30^\\circ)=\\frac{a}{10}$. Find $a$.',
    correctAnswer: '5',
    tolerance: 0.01,
    markScheme: '$a = 10 \\times \\sin(30^\\circ) = 10 \\times 0.5 = 5$.',
    difficulty: 3,
    source: 'Spark Phase 2 Seed',
  }),
  question({
    stage: 'KS4',
    tier: 'Both',
    subject: 'Mathematics',
    topicCode: 'UF4.1',
    topicName: 'Area',
    questionType: 'numeric',
    questionText: 'Find the area of a rectangle with length $8\\text{ cm}$ and width $6\\text{ cm}$.',
    correctAnswer: '48',
    tolerance: 0.0001,
    markScheme: 'Area $= 8 \\times 6 = 48\\text{ cm}^2$.',
    difficulty: 1,
    source: 'Spark Phase 2 Seed',
  }),
  question({
    stage: 'KS4',
    tier: 'Both',
    subject: 'Mathematics',
    topicCode: 'UF6.1',
    topicName: 'Averages',
    questionType: 'numeric',
    questionText: 'Find the mean of $4, 6, 10, 12$.',
    correctAnswer: '8',
    tolerance: 0.0001,
    markScheme: 'The total is $32$ and there are $4$ values, so the mean is $8$.',
    difficulty: 1,
    source: 'Spark Phase 2 Seed',
  }),
  question({
    stage: 'KS4',
    tier: 'Both',
    subject: 'Mathematics',
    topicCode: 'UF5.1',
    topicName: 'Probability',
    questionType: 'numeric',
    questionText: 'A fair spinner has $5$ equal sections. One section is blue. What is $P(blue)$?',
    correctAnswer: '0.2',
    tolerance: 0.0001,
    markScheme: 'One successful outcome out of $5$ gives $\\frac{1}{5}=0.2$.',
    difficulty: 1,
    source: 'Spark Phase 2 Seed',
  }),
  question({
    stage: 'KS4',
    tier: 'Higher',
    subject: 'Mathematics',
    topicCode: 'UH2.4',
    topicName: 'Factorising',
    questionType: 'algebraic',
    questionText: 'Factorise $x^2 + 5x + 6$.',
    correctAnswer: '(x + 2)(x + 3)',
    tolerance: 0.0001,
    markScheme: 'Find two numbers that multiply to $6$ and add to $5$: $2$ and $3$.',
    difficulty: 3,
    source: 'Spark Phase 2 Seed',
  }),
  question({
    stage: 'KS4',
    tier: 'Both',
    subject: 'Mathematics',
    topicCode: 'UF3.2',
    topicName: 'Ratio',
    questionType: 'numeric',
    questionText: 'Share $45$ in the ratio $2:3$. What is the larger share?',
    correctAnswer: '27',
    tolerance: 0.0001,
    markScheme: 'There are $5$ parts, so each part is $9$. The larger share is $3 \\times 9 = 27$.',
    difficulty: 2,
    source: 'Spark Phase 2 Seed',
  }),
  question({
    stage: 'KS4',
    tier: 'Both',
    subject: 'Mathematics',
    topicCode: 'UF4.2',
    topicName: 'Coordinate Geometry',
    questionType: 'coordinate',
    questionText: 'Drag the interactive point on the grid to coordinates $(3, -2)$.',
    correctAnswer: '{"x":3,"y":-2}',
    tolerance: 0.5,
    markScheme: 'Move $3$ units right and $2$ units down to reach $(3,-2)$.',
    difficulty: 2,
    source: 'Spark Phase 2 Seed',
  }),
  question({
    stage: 'KS4',
    tier: 'Both',
    subject: 'Mathematics',
    topicCode: 'UF1.3',
    topicName: 'Fractions',
    questionType: 'numeric',
    questionText: 'Calculate $\\frac{3}{4}$ of $28$.',
    correctAnswer: '21',
    tolerance: 0.0001,
    markScheme: '$28 \\div 4 = 7$, and $7 \\times 3 = 21$.',
    difficulty: 1,
    source: 'Spark Phase 2 Seed',
  }),
  ...[
    ['Physics', 'SF1.1', 'Forces', 'A force of $12\\text{ N}$ acts on a mass of $3\\text{ kg}$. Find the acceleration in $\\text{m/s}^2$.', '4', '$a = F \\div m = 12 \\div 3 = 4$.'],
    ['Physics', 'SF1.2', 'Energy', 'A machine transfers $200\\text{ J}$ in $5\\text{ s}$. Calculate the power in watts.', '40', '$P = E \\div t = 200 \\div 5 = 40\\text{ W}$.'],
    ['Physics', 'SF1.3', 'Waves', 'A wave has frequency $10\\text{ Hz}$ and wavelength $2\\text{ m}$. Find its speed.', '20', '$v = f\\lambda = 10 \\times 2 = 20\\text{ m/s}$.'],
    ['Physics', 'SF1.4', 'Electricity', 'A current of $0.5\\text{ A}$ flows through $24\\Omega$. Find the potential difference.', '12', '$V = IR = 0.5 \\times 24 = 12\\text{ V}$.'],
    ['Physics', 'SF1.5', 'Density', 'A cube has mass $60\\text{ g}$ and volume $20\\text{ cm}^3$. Find its density.', '3', '$\\rho = m \\div V = 60 \\div 20 = 3\\text{ g/cm}^3$.'],
    ['Physics', 'SF1.6', 'Pressure', 'A force of $100\\text{ N}$ acts on an area of $20\\text{ m}^2$. Find pressure.', '5', '$P = F \\div A = 100 \\div 20 = 5\\text{ Pa}$.'],
    ['Physics', 'SF1.7', 'Charge', 'A current of $2\\text{ A}$ flows for $6\\text{ s}$. Calculate charge.', '12', '$Q = It = 2 \\times 6 = 12\\text{ C}$.'],
    ['Physics', 'SF1.8', 'Moments', 'A $10\\text{ N}$ force acts $0.4\\text{ m}$ from a pivot. Find the moment.', '4', 'Moment $= 10 \\times 0.4 = 4\\text{ Nm}$.'],
    ['Physics', 'SF1.9', 'Work Done', 'A force of $15\\text{ N}$ moves an object $3\\text{ m}$. Find work done.', '45', '$W = Fd = 15 \\times 3 = 45\\text{ J}$.'],
    ['Physics', 'SF1.10', 'Resultant Forces', 'Forces of $9\\text{ N}$ right and $4\\text{ N}$ left act on an object. Find resultant force.', '5', 'Resultant force $= 9 - 4 = 5\\text{ N}$ to the right.'],
  ].map(([subject, topicCode, topicName, questionText, correctAnswer, markScheme]) =>
    question({
      stage: 'KS4',
      tier: 'Both',
      subject: subject as Subject,
      topicCode,
      topicName,
      questionType: 'numeric',
      questionText,
      correctAnswer,
      tolerance: 0.0001,
      markScheme,
      difficulty: 2,
      source: 'Spark Phase 2 Seed',
    })
  ),
  ...[
    ['Chemistry', 'S2.1', 'Atomic Structure', 'Which particle has a positive charge?\n\nA: Electron\nB: Neutron\nC: Proton\nD: Atom', 'C', 'Protons have a positive charge, so the answer is C.'],
    ['Chemistry', 'S2.2', 'Periodic Table', 'Which group contains the noble gases?\n\nA: Group 1\nB: Group 2\nC: Group 7\nD: Group 0', 'D', 'The noble gases are in Group 0, so the answer is D.'],
    ['Chemistry', 'S2.3', 'Bonding', 'What type of bond forms when electrons are shared?\n\nA: Ionic\nB: Covalent\nC: Metallic\nD: Hydrogen', 'B', 'Shared electrons form covalent bonds.'],
    ['Chemistry', 'S2.4', 'Acids', 'A solution with pH $2$ is best described as:\n\nA: Strong acid\nB: Weak alkali\nC: Neutral\nD: Strong alkali', 'A', 'Low pH values are acidic; pH 2 is strongly acidic.'],
    ['Chemistry', 'S2.5', 'Rates', 'Increasing temperature usually changes reaction rate by:\n\nA: Decreasing it\nB: Stopping it\nC: Increasing it\nD: Keeping it unchanged', 'C', 'Higher temperature usually increases reaction rate.'],
    ['Chemistry', 'S2.6', 'Electrolysis', 'Which ion moves to the negative electrode?\n\nA: Positive ion\nB: Negative ion\nC: Neutron\nD: Molecule', 'A', 'Positive ions are attracted to the negative electrode.'],
    ['Chemistry', 'S2.7', 'Conservation', 'In a closed reaction, total mass is:\n\nA: Lost\nB: Created\nC: Conserved\nD: Doubled', 'C', 'Mass is conserved in a closed system.'],
    ['Chemistry', 'S2.8', 'Separation', 'Which method separates an insoluble solid from a liquid?\n\nA: Filtration\nB: Crystallisation\nC: Chromatography\nD: Distillation', 'A', 'Filtration separates insoluble solids from liquids.'],
    ['Chemistry', 'S2.9', 'Metals', 'Which property is typical of metals?\n\nA: Brittle\nB: Poor conductor\nC: Malleable\nD: Always liquid', 'C', 'Most metals are malleable.'],
    ['Chemistry', 'S2.10', 'Formulae', 'What is the formula of carbon dioxide?\n\nA: CO\nB: CO2\nC: C2O\nD: O2C2', 'B', 'Carbon dioxide contains one carbon atom and two oxygen atoms: CO2.'],
  ].map(([subject, topicCode, topicName, questionText, correctAnswer, markScheme]) =>
    question({
      stage: 'KS3',
      tier: 'Both',
      subject: subject as Subject,
      topicCode,
      topicName,
      questionType: 'multichoice',
      questionText,
      correctAnswer,
      tolerance: 0,
      markScheme,
      difficulty: 1,
      source: 'Spark Phase 2 Seed',
    })
  ),
  ...[
    ['Biology', 'S3.1', 'Cells', 'What is the main function of chloroplasts?\n\nA: Respiration\nB: Photosynthesis\nC: Protein synthesis\nD: Support', 'B', 'Chloroplasts absorb light for photosynthesis.'],
    ['Biology', 'S3.2', 'Genetics', 'DNA is found mainly in the:\n\nA: Cell wall\nB: Cytoplasm\nC: Nucleus\nD: Ribosome', 'C', 'Most DNA is found in the nucleus.'],
    ['Biology', 'S3.3', 'Respiration', 'Aerobic respiration requires:\n\nA: Oxygen\nB: Nitrogen\nC: Carbon monoxide\nD: Helium', 'A', 'Aerobic respiration requires oxygen.'],
    ['Biology', 'S3.4', 'Ecology', 'A producer in a food chain is usually a:\n\nA: Plant\nB: Predator\nC: Decomposer\nD: Parasite', 'A', 'Plants produce biomass using photosynthesis.'],
    ['Biology', 'S3.5', 'Homeostasis', 'Insulin helps control blood:\n\nA: Oxygen\nB: Glucose\nC: Urea\nD: Water', 'B', 'Insulin helps control blood glucose.'],
    ['Biology', 'S3.6', 'Digestion', 'Enzymes are biological:\n\nA: Catalysts\nB: Fuels\nC: Cells\nD: Hormones', 'A', 'Enzymes are biological catalysts.'],
    ['Biology', 'S3.7', 'Transport', 'Red blood cells carry:\n\nA: Oxygen\nB: Bile\nC: Starch\nD: Insulin', 'A', 'Red blood cells carry oxygen using haemoglobin.'],
    ['Biology', 'S3.8', 'Variation', 'Differences between organisms are called:\n\nA: Diffusion\nB: Variation\nC: Osmosis\nD: Respiration', 'B', 'Differences between organisms are variation.'],
    ['Biology', 'S3.9', 'Photosynthesis', 'Which gas is needed for photosynthesis?\n\nA: Oxygen\nB: Carbon dioxide\nC: Nitrogen\nD: Hydrogen', 'B', 'Photosynthesis uses carbon dioxide and water.'],
    ['Biology', 'S3.10', 'Disease', 'Vaccination mainly trains the:\n\nA: Digestive system\nB: Immune system\nC: Skeletal system\nD: Nervous system', 'B', 'Vaccines train the immune system to respond faster.'],
  ].map(([subject, topicCode, topicName, questionText, correctAnswer, markScheme]) =>
    question({
      stage: 'KS3',
      tier: 'Both',
      subject: subject as Subject,
      topicCode,
      topicName,
      questionType: 'multichoice',
      questionText,
      correctAnswer,
      tolerance: 0,
      markScheme,
      difficulty: 1,
      source: 'Spark Phase 2 Seed',
    })
  ),
];

export async function seedMockQuestions() {
  try {
    const qColl = collection(db, 'questions');
    console.log('Upserting mock questions to Firestore...');
    const batch = writeBatch(db);
    mockQuestions.forEach((seed, idx) => {
      const docRef = doc(qColl, `mock_q_${idx + 1}`);
      batch.set(docRef, seed, { merge: true });
    });

    await batch.commit();
    console.log('Question upsert completed successfully!');
  } catch (error) {
    console.error('Error seeding questions:', error);
  }
}
