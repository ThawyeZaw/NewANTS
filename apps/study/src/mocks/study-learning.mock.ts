/**
 * Study Learning Tools — Realistic Pearson Edexcel IAL & Cambridge IGCSE fixtures (`[ZYY-4.6]`).
 */
import type {
  FlashcardCardItem,
  FlashcardDeckItem,
  QuizAttemptRecord,
  StudyLearningPersistedState,
  StudyNoteItem,
  StudyQuizItem,
} from '../lib/study/learning';

export const MOCK_STUDY_NOTES: StudyNoteItem[] = [
  {
    id: 'note_wma12_trig_logs',
    boardId: 'edexcel-ial',
    subjectCode: 'WMA12',
    topicCode: 'WMA12.4',
    title: 'Factor Theorem, Logarithms & Trig Identities Playbook',
    authorName: 'Thaw Ye Zaw',
    isPinned: true,
    isOfficial: true,
    tags: ['p2', 'logs', 'trig', 'high-yield'],
    updatedLabel: 'Nov 2025 · P2 Core',
    readMinutes: 4,
    linkedDeckId: 'deck_wma12_p2',
    linkedQuizId: 'quiz_wma12_core',
    contentMarkdown: `# Factor Theorem, Logarithms & Trig Identities

Pure Mathematics 2 (\`WMA12\`) frequently rewards clean algebraic rearrangement before substituting values into equations.

## 1. Remainder & Factor Theorem

If \`f(x)\` is a polynomial and \`f(a/b) = 0\`, then \`(bx - a)\` is a linear factor of \`f(x)\`.

\`\`\`formula
f(p) = 0  <=>  (x - p) divides f(x) cleanly
Remainder when dividing f(x) by (ax - b) is f(b / a)
\`\`\`

> Examiner Tip: Never drop the word **"therefore"** or skip showing \`f(p) = 0\` numerically in "Show that" questions.

## 2. Logarithmic Linearisation

Experimental models of the form \`y = a * x^n\` or \`y = a * b^x\` turn straight lines under \`log10\`:

- For \`y = a * x^n\`: \`log10(y) = n * log10(x) + log10(a)\` so **gradient = n** and **y-intercept = log10(a)**.
- For \`y = a * b^x\`: \`log10(y) = (log10 b) * x + log10(a)\` so **gradient = log10(b)**.

## 3. Essential Trig Identities

\`\`\`formula
sin²(θ) + cos²(θ) ≡ 1
tan(θ) ≡ sin(θ) / cos(θ)
\`\`\`

### Pre-Exam Checklist
- [x] Check domain interval in **degrees** vs **radians** before finding all CAST quadrant roots
- [ ] Reject any logarithmic solution where argument \`(x + c) <= 0\`
- [ ] Verify \`+ C\` constant on all indefinite trapezium/polynomial integrals`,
  },
  {
    id: 'note_wph12_quantum',
    boardId: 'edexcel-ial',
    subjectCode: 'WPH12',
    topicCode: 'WPH12.3',
    title: 'Photoelectric Effect, Work Function & Stopping Potential',
    authorName: 'Hnin Ei San',
    isPinned: true,
    isOfficial: true,
    tags: ['waves', 'quantum', 'wph12'],
    updatedLabel: 'Nov 2025 · Unit 2',
    readMinutes: 3,
    linkedDeckId: 'deck_wph12_waves',
    linkedQuizId: 'quiz_wph12_quantum',
    contentMarkdown: `# Photoelectric Effect & Einstein's Equation

Unit 2 (\`WPH12\`) tests the **particle nature of light** through threshold frequency and instant emission.

## Why Classical Wave Theory Fails

1. Wave theory predicts that low-frequency dim light would eventually accumulate enough energy to eject electrons — **experimentally false** below threshold frequency \`f₀\`.
2. Increasing **intensity** (at fixed \`f > f₀\`) increases the **number of photons per second**, NOT individual photon energy \`E = hf\`.

\`\`\`formula
hf = Φ + ½ m v²(max)
Ek(max) = e * Vs   (where Vs is stopping potential)
Φ = h * f₀         (work function in Joules)
\`\`\`

> Examiner Pitfall: Always convert \`eV\` into **Joules** (\`× 1.60 × 10^-19\`) before calculating velocity or frequency!

### 4-Mark Standard Explanation Checklist
- [x] State that **1 photon** interacts with **1 surface electron**
- [ ] State that electron needs minimum energy \`Φ\` (work function) to escape the metal surface
- [ ] Explain leftover kinetic energy equals \`hf - Φ\``,
  },
  {
    id: 'note_wch12_energetics',
    boardId: 'edexcel-ial',
    subjectCode: 'WCH12',
    topicCode: 'WCH12.1',
    title: 'Hess Cycles, Enthalpy of Combustion & Mean Bond Enthalpies',
    authorName: 'Zay Lynn Htet',
    isPinned: false,
    isOfficial: false,
    tags: ['energetics', 'hess-law', 'wch12'],
    updatedLabel: '2d ago',
    readMinutes: 3,
    contentMarkdown: `# Hess's Law & Calorimetry Formulas

Enthalpy calculations in \`WCH12\` combine **q = m c ΔT** calorimetry with arrow-direction Hess cycles.

## Direction Rules in Hess Triangles

- **Given Enthalpies of Formation (\`ΔfH\`):** Arrows point **UP** from elements in standard states to reactants & products.
- **Given Enthalpies of Combustion (\`ΔcH\`):** Arrows point **DOWN** toward \`CO2(g) + H2O(l)\`.

\`\`\`formula
ΔH = Σ ΔfH(products) − Σ ΔfH(reactants)
ΔH = Σ ΔcH(reactants) − Σ ΔcH(products)
ΔH ≈ Σ Bond(broken) − Σ Bond(made)
\`\`\`

> Examiner Tip: **Mean bond enthalpies** assume all species are gaseous, so liquid \`H2O\` requires adding enthalpy of vaporisation if precision is questioned.

### Lab Source-of-Error Checklist
- [ ] Account for incomplete combustion soot formation
- [ ] Mention heat loss to calorimeter surroundings & lack of lid`,
  },
  {
    id: 'note_0580_circle_theorems',
    boardId: 'cambridge-igcse',
    subjectCode: '0580',
    topicCode: '0580.4',
    title: 'Cambridge IGCSE 0580 Circle Theorems & Vectors Mark-Scheme Phrases',
    authorName: 'ANTs Maths Lead',
    isPinned: true,
    isOfficial: true,
    tags: ['igcse', 'geometry', 'circle-theorems'],
    updatedLabel: 'Nov 2025 · P4 Extended',
    readMinutes: 3,
    linkedDeckId: 'deck_0580_geometry',
    linkedQuizId: 'quiz_0580_extended',
    contentMarkdown: `# Circle Theorems: Exact Reasoning Keywords

In Cambridge IGCSE \`0580\` Paper 4, **reason marks** require precise geometric wording alongside angle values.

## Top 5 Reason Statements

1. **Angle at the centre** is **twice** the angle at the circumference (standing on the same arc).
2. **Angle in a semicircle** equals \`90°\`.
3. **Opposite angles of a cyclic quadrilateral** add up to \`180°\`.
4. **Tangent meets radius** at \`90°\`.
5. **Alternate segment theorem**: angle between tangent and chord equals angle in the alternate segment.

\`\`\`formula
Cyclic Quad:  a + c = 180°
Tangent-Chord:  ∠PTQ = ∠QRT (alternate segment)
\`\`\`

> Examiner Tip: Never write "Z-angle" or "F-angle" — always state **alternate angles** or **corresponding angles** on parallel lines.

### Final Checkpoints
- [ ] Verify collinearity vectors with **scalar multiple** + **common point** statement
- [x] Memorise all 5 cyclic & tangent reason sentences word-for-word`,
  },
  {
    id: 'note_0625_thermal_waves',
    boardId: 'cambridge-igcse',
    subjectCode: '0625',
    topicCode: '0625.3',
    title: '0625 Snell’s Law, Critical Angle & Specific Heat Capacity',
    authorName: 'Hnin Ei San',
    isPinned: false,
    isOfficial: true,
    tags: ['igcse', 'physics', 'optics'],
    updatedLabel: 'Nov 2025 · Core/Ext',
    readMinutes: 3,
    linkedDeckId: 'deck_0625_physics',
    linkedQuizId: 'quiz_0625_core',
    contentMarkdown: `# Optics & Thermal Formulas for 0625 Paper 4

## Refractive Index & Total Internal Reflection

Total internal reflection (**TIR**) happens ONLY when light travels from a **more optically dense medium to a less dense medium** AND \`angle of incidence i > critical angle c\`.

\`\`\`formula
n = sin(i) / sin(r)
sin(c) = 1 / n
E = m * c * ΔT
\`\`\`

> Examiner Tip: Angles \`i\` and \`r\` must ALWAYS be measured from the **normal**, never from the glass boundary surface!

### Quick Checklist
- [ ] Practice converting \`kJ\` to \`J\` (\`× 1000\`) in \`E = mcΔT\`
- [ ] Draw ray arrowheads clearly before and after refraction`,
  },
];

export const MOCK_FLASHCARD_DECKS: FlashcardDeckItem[] = [
  {
    id: 'deck_wma12_p2',
    boardId: 'edexcel-ial',
    subjectCode: 'WMA12',
    topicCode: 'WMA12 · P2',
    title: 'IAL Pure Maths 2 — Logs, Series & Trig Proofs',
    description: 'Essential identities, geometric progression convergence, and factor theorem recall.',
    createdBy: 'Thaw Ye Zaw',
  },
  {
    id: 'deck_wph12_waves',
    boardId: 'edexcel-ial',
    subjectCode: 'WPH12',
    topicCode: 'WPH12 · Unit 2',
    title: 'IAL Physics Unit 2 — Standing Waves, Quantum & Circuits',
    description: 'Core equations, unit conversions, and 4-mark photoelectric definitions.',
    createdBy: 'Hnin Ei San',
  },
  {
    id: 'deck_0580_geometry',
    boardId: 'cambridge-igcse',
    subjectCode: '0580',
    topicCode: '0580 · Paper 4',
    title: 'IGCSE 0580 — Circle Theorems, Bearings & Vectors',
    description: 'Exact Cambridge mark-scheme reason statements and vector ratios.',
    createdBy: 'ANTs Maths Lead',
  },
  {
    id: 'deck_0625_physics',
    boardId: 'cambridge-igcse',
    subjectCode: '0625',
    topicCode: '0625 · Extended',
    title: 'IGCSE 0625 Physics — Optics, Thermal & Radioactivity',
    description: 'Critical angle, half-life decay logic, and EMF/potential divider rules.',
    createdBy: 'Hnin Ei San',
  },
];

export const MOCK_FLASHCARD_CARDS: FlashcardCardItem[] = [
  // WMA12 P2 (5 due, 1 already mastered)
  {
    id: 'card_wma12_1',
    deckId: 'deck_wma12_p2',
    front: 'When does an infinite geometric series a + ar + ar² + … converge, and what is S∞?',
    back: 'It converges if and only if |r| < 1 (strictly between −1 and 1).',
    hint: 'Check common ratio bounds strictly.',
    formulaOrExample: 'S∞ = a / (1 − r)   for |r| < 1',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    dueAtOffsetDays: 0,
    totalReviews: 0,
  },
  {
    id: 'card_wma12_2',
    deckId: 'deck_wma12_p2',
    front: 'State the binomial expansion formula for (a + bx)ⁿ up to the x² term (positive integer n).',
    back: 'aⁿ + n·aⁿ⁻¹(bx) + [n(n−1)/2!]·aⁿ⁻²(bx)²',
    hint: 'Do not forget to square BOTH b and x in (bx)²!',
    formulaOrExample: 'Remember to factor out aⁿ first if using (1 + kx)ⁿ.',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 1,
    lapses: 0,
    dueAtOffsetDays: 0,
    totalReviews: 1,
  },
  {
    id: 'card_wma12_3',
    deckId: 'deck_wma12_p2',
    front: 'What is the centre and radius of (x − 3)² + (y + 5)² = 20?',
    back: 'Centre (3, −5) and radius √20 = 2√5.',
    hint: 'Flip both bracket signs and square-root the RHS.',
    formulaOrExample: 'x² + y² + 2gx + 2fy + c = 0 => centre (−g, −f), r = √(g² + f² − c)',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    dueAtOffsetDays: 0,
    totalReviews: 0,
  },
  {
    id: 'card_wma12_4',
    deckId: 'deck_wma12_p2',
    front: 'Write log_a(x) + 2 log_a(y) − log_a(z) as a single logarithm.',
    back: 'log_a(x y² / z)',
    hint: 'Power rule before addition/subtraction laws.',
    formulaOrExample: 'n log(y) = log(yⁿ)',
    intervalDays: 0,
    easeFactor: 2.4,
    repetitions: 1,
    lapses: 0,
    dueAtOffsetDays: 0,
    totalReviews: 2,
  },
  {
    id: 'card_wma12_5',
    deckId: 'deck_wma12_p2',
    front: 'How do you identify whether a stationary point is a minimum vs maximum using f″(x)?',
    back: 'f″(x) > 0 gives a local minimum; f″(x) < 0 gives a local maximum; if f″(x) = 0 check sign change of f′(x).',
    hint: 'Think of curve concavity.',
    intervalDays: 6,
    easeFactor: 2.6,
    repetitions: 3,
    lapses: 0,
    dueAtOffsetDays: 4,
    lastRating: 'good',
    totalReviews: 4,
  },

  // WPH12 Unit 2
  {
    id: 'card_wph12_1',
    deckId: 'deck_wph12_waves',
    front: 'Define the **work function (Φ)** of a metal surface.',
    back: 'The minimum energy required to release an electron from the surface of the metal with zero kinetic energy.',
    hint: 'Relate it to surface release, not ionisation.',
    formulaOrExample: 'Φ = h f₀  (in Joules)',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    dueAtOffsetDays: 0,
    totalReviews: 0,
  },
  {
    id: 'card_wph12_2',
    deckId: 'deck_wph12_waves',
    front: 'State the condition for constructive vs destructive path difference in interference.',
    back: 'Constructive: Δx = nλ (phase diff 2nπ). Destructive: Δx = (n + ½)λ (phase diff (2n+1)π).',
    hint: 'Half-integer wavelengths cancel coherent waves.',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    dueAtOffsetDays: 0,
    totalReviews: 0,
  },
  {
    id: 'card_wph12_3',
    deckId: 'deck_wph12_waves',
    front: 'What is the de Broglie wavelength equation and what does p stand for?',
    back: 'λ = h / p = h / (m v), where p is the particle’s linear momentum in kg·m/s.',
    formulaOrExample: 'Applies to electrons diffracting through graphite.',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 1,
    lapses: 0,
    dueAtOffsetDays: 0,
    totalReviews: 1,
  },
  {
    id: 'card_wph12_4',
    deckId: 'deck_wph12_waves',
    front: 'Define terminal potential difference (V) in terms of EMF (ε) and internal resistance (r).',
    back: 'V = ε − I r  (terminal PD equals EMF minus lost volts across internal resistance r).',
    intervalDays: 5,
    easeFactor: 2.55,
    repetitions: 2,
    lapses: 0,
    dueAtOffsetDays: 3,
    lastRating: 'good',
    totalReviews: 2,
  },

  // 0580 IGCSE Geometry
  {
    id: 'card_0580_1',
    deckId: 'deck_0580_geometry',
    front: 'State the Alternate Segment Theorem word-for-word for full marks.',
    back: 'The angle between a tangent and a chord through the point of contact equals the angle in the alternate segment.',
    hint: 'Mention both "tangent" and "chord".',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    dueAtOffsetDays: 0,
    totalReviews: 0,
  },
  {
    id: 'card_0580_2',
    deckId: 'deck_0580_geometry',
    front: 'If Area Scale Factor of two similar shapes is 9, what are the Length and Volume Scale Factors?',
    back: 'Length Scale Factor k = √9 = 3; Volume Scale Factor k³ = 27.',
    formulaOrExample: 'Area ratio = k²  |  Volume ratio = k³',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    dueAtOffsetDays: 0,
    totalReviews: 0,
  },
  {
    id: 'card_0580_3',
    deckId: 'deck_0580_geometry',
    front: 'What two facts prove three points A, B, C are collinear using vectors?',
    back: '1) Vector AB = k × Vector BC (parallel / scalar multiple) AND 2) they share a common point B.',
    intervalDays: 0,
    easeFactor: 2.4,
    repetitions: 1,
    lapses: 0,
    dueAtOffsetDays: 0,
    totalReviews: 1,
  },

  // 0625 IGCSE Physics
  {
    id: 'card_0625_1',
    deckId: 'deck_0625_physics',
    front: 'State the two conditions required for Total Internal Reflection (TIR).',
    back: '1) Light travels from a denser medium to a less dense medium. 2) Angle of incidence i > critical angle c.',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    dueAtOffsetDays: 0,
    totalReviews: 0,
  },
  {
    id: 'card_0625_2',
    deckId: 'deck_0625_physics',
    front: 'How do you find corrected half-life count rate when background radiation is 24 counts/min?',
    back: 'Subtract 24 counts/min BEFORE halving, then add 24 counts/min back if asked for the raw Geiger counter reading.',
    formulaOrExample: 'C(sample) = C(measured) − C(background)',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    dueAtOffsetDays: 0,
    totalReviews: 0,
  },
  {
    id: 'card_0625_3',
    deckId: 'deck_0625_physics',
    front: 'Write the transformer turns-to-voltage ratio equation.',
    back: 'Vp / Vs = Np / Ns   (and for 100% efficient transformer: Vp Ip = Vs Is).',
    intervalDays: 7,
    easeFactor: 2.6,
    repetitions: 3,
    lapses: 0,
    dueAtOffsetDays: 5,
    lastRating: 'easy',
    totalReviews: 3,
  },
];

export const MOCK_STUDY_QUIZZES: StudyQuizItem[] = [
  {
    id: 'quiz_wma12_core',
    boardId: 'edexcel-ial',
    subjectCode: 'WMA12',
    title: 'WMA12 Calculus, Circles & Geometric Series Sprint',
    topicLabel: 'Pure Maths 2 · Units 1–6',
    difficulty: 'standard',
    durationMinutes: 12,
    questions: [
      {
        id: 'q_wma12_1',
        type: 'mcq',
        topicCode: 'WMA12.3',
        marks: 2,
        prompt:
          'A geometric series has first term a = 12 and sum to infinity S∞ = 30. What is the common ratio r?',
        options: ['r = 0.4', 'r = 0.6', 'r = 2.5', 'r = −0.6'],
        correctIndex: 1,
        formulaHint: 'S∞ = a / (1 − r)',
        explanation:
          'Using S∞ = a / (1 − r): 30 = 12 / (1 − r) => 1 − r = 12 / 30 = 0.4 => r = 0.6 (valid since |0.6| < 1).',
      },
      {
        id: 'q_wma12_2',
        type: 'short_answer',
        topicCode: 'WMA12.1',
        marks: 2,
        prompt:
          'Using the Remainder Theorem, find the remainder when f(x) = 2x³ − 5x + 9 is divided by (x − 2).',
        numericTarget: { value: 15, tolerance: 0.01 },
        acceptedAnswers: ['15'],
        formulaHint: 'Evaluate f(2) directly.',
        explanation: 'Substitute x = 2: f(2) = 2(8) − 5(2) + 9 = 16 − 10 + 9 = 15.',
      },
      {
        id: 'q_wma12_3',
        type: 'mcq',
        topicCode: 'WMA12.2',
        marks: 2,
        prompt: 'What is the radius of the circle with equation x² + y² − 6x + 8y − 11 = 0?',
        options: ['3 units', '5 units', '6 units', '√11 units'],
        correctIndex: 2,
        formulaHint: 'Complete the square for both x and y.',
        explanation:
          '(x − 3)² − 9 + (y + 4)² − 16 − 11 = 0 => (x − 3)² + (y + 4)² = 36 => r = √36 = 6.',
      },
      {
        id: 'q_wma12_4',
        type: 'short_answer',
        topicCode: 'WMA12.5',
        marks: 2,
        prompt: 'Solve log₂(x − 1) = 4 for x.',
        numericTarget: { value: 17, tolerance: 0.01 },
        acceptedAnswers: ['17'],
        formulaHint: 'Convert log_a(b) = c into a^c = b.',
        explanation: 'x − 1 = 2⁴ = 16, therefore x = 17 (checks x − 1 > 0).',
      },
    ],
  },
  {
    id: 'quiz_wph12_quantum',
    boardId: 'edexcel-ial',
    subjectCode: 'WPH12',
    title: 'WPH12 Waves, Quantum & Internal Resistance Check',
    topicLabel: 'Unit 2 · Waves & Electricity',
    difficulty: 'stretch',
    durationMinutes: 10,
    questions: [
      {
        id: 'q_wph12_1',
        type: 'mcq',
        topicCode: 'WPH12.3',
        marks: 2,
        prompt:
          'Monochromatic light above the threshold frequency strikes a clean zinc plate. If intensity is doubled while frequency stays constant, what happens?',
        options: [
          'Maximum kinetic energy of emitted electrons doubles',
          'Threshold frequency halves',
          'Rate of photoelectron emission doubles; Ek(max) stays unchanged',
          'Stopping potential doubles',
        ],
        correctIndex: 2,
        explanation:
          'Intensity only increases photons arriving per second, doubling electron emission rate. Individual photon energy E = hf is unchanged, so Ek(max) stays constant.',
      },
      {
        id: 'q_wph12_2',
        type: 'short_answer',
        topicCode: 'WPH12.1',
        marks: 2,
        prompt:
          'A cell of EMF 12.0 V and internal resistance 0.50 Ω delivers a steady current of 4.0 A. Calculate the terminal potential difference in Volts.',
        numericTarget: { value: 10, tolerance: 0.1, unit: 'V' },
        acceptedAnswers: ['10', '10.0', '10V', '10.0V'],
        formulaHint: 'V = ε − I·r',
        explanation: 'Lost volts = I·r = 4.0 × 0.50 = 2.0 V, so terminal PD V = 12.0 − 2.0 = 10.0 V.',
      },
      {
        id: 'q_wph12_3',
        type: 'mcq',
        topicCode: 'WPH12.2',
        marks: 2,
        prompt:
          'Two coherent microwave sources produce a first-order minimum at a path difference of:',
        options: ['0 λ', '0.5 λ', '1.0 λ', '2.0 λ'],
        correctIndex: 1,
        explanation:
          'Destructive interference occurs when waves arrive in antiphase at path difference (n + ½)λ; the first minimum (n = 0) is at 0.5λ.',
      },
    ],
  },
  {
    id: 'quiz_0580_extended',
    boardId: 'cambridge-igcse',
    subjectCode: '0580',
    title: 'IGCSE 0580 Extended Geometry & Scale Factors Drill',
    topicLabel: 'Geometry, Similarity & Trigonometry',
    difficulty: 'foundation',
    durationMinutes: 10,
    questions: [
      {
        id: 'q_0580_1',
        type: 'short_answer',
        topicCode: '0580.4',
        marks: 2,
        prompt:
          'Two mathematically similar cylinders have heights 4 cm and 12 cm. If the smaller has volume 30 cm³, find the volume of the larger cylinder in cm³.',
        numericTarget: { value: 810, tolerance: 0.5, unit: 'cm³' },
        acceptedAnswers: ['810', '810cm3', '810cm³'],
        formulaHint: 'Volume ratio = (Length ratio)³',
        explanation: 'Length scale factor k = 12 / 4 = 3. Volume scale factor = 3³ = 27. Larger volume = 30 × 27 = 810 cm³.',
      },
      {
        id: 'q_0580_2',
        type: 'mcq',
        topicCode: '0580.4',
        marks: 2,
        prompt:
          'In a cyclic quadrilateral PQRS, ∠PQR = 114°. What is the value of opposite angle ∠PSR?',
        options: ['57°', '66°', '114°', '228°'],
        correctIndex: 1,
        explanation: 'Opposite angles in a cyclic quadrilateral sum to 180°, so ∠PSR = 180° − 114° = 66°.',
      },
      {
        id: 'q_0580_3',
        type: 'short_answer',
        topicCode: '0580.6',
        marks: 2,
        prompt:
          'Calculate the bearing of A from B if the bearing of B from A is 055°.',
        numericTarget: { value: 235, tolerance: 0.1, unit: '°' },
        acceptedAnswers: ['235', '235°'],
        formulaHint: 'Add or subtract 180° for the reverse bearing.',
        explanation: 'Since 055° < 180°, reverse bearing = 055° + 180° = 235°.',
      },
    ],
  },
  {
    id: 'quiz_0625_core',
    boardId: 'cambridge-igcse',
    subjectCode: '0625',
    title: 'IGCSE 0625 Thermal, Optics & Nuclear Decay Quick Check',
    topicLabel: 'Thermal & Waves Paper 4 Prep',
    difficulty: 'standard',
    durationMinutes: 8,
    questions: [
      {
        id: 'q_0625_1',
        type: 'short_answer',
        topicCode: '0625.3',
        marks: 2,
        prompt:
          'A glass block has refractive index n = 1.50. Calculate the critical angle c in degrees (to 1 decimal place).',
        numericTarget: { value: 41.8, tolerance: 0.3, unit: '°' },
        acceptedAnswers: ['41.8', '41.81', '42'],
        formulaHint: 'sin(c) = 1 / n',
        explanation: 'sin(c) = 1 / 1.50 = 0.6667 => c = arcsin(0.6667) = 41.8°.',
      },
      {
        id: 'q_0625_2',
        type: 'mcq',
        topicCode: '0625.5',
        marks: 2,
        prompt:
          'A radioactive sample has initial corrected count rate 480 Bq and half-life 6 hours. What is the corrected count rate after 18 hours?',
        options: ['160 Bq', '120 Bq', '60 Bq', '30 Bq'],
        correctIndex: 2,
        explanation: '18 hours = 3 half-lives. 480 → 240 → 120 → 60 Bq.',
      },
    ],
  },
];

export const MOCK_QUIZ_ATTEMPTS: QuizAttemptRecord[] = [
  {
    id: 'att_wma12_seed',
    quizId: 'quiz_wma12_core',
    quizTitle: 'WMA12 Calculus, Circles & Geometric Series Sprint',
    subjectCode: 'WMA12',
    completedAtLabel: 'Yesterday',
    score: 6,
    maxScore: 8,
    percent: 75,
    xpEarned: 20,
    mode: 'practice',
    incorrectQuestionIds: ['q_wma12_3'],
  },
];

export function createDefaultStudyLearningState(): StudyLearningPersistedState {
  return {
    version: 1,
    notes: MOCK_STUDY_NOTES.map((n) => ({ ...n, tags: [...n.tags] })),
    decks: MOCK_FLASHCARD_DECKS.map((d) => ({ ...d })),
    cards: MOCK_FLASHCARD_CARDS.map((c) => ({ ...c })),
    quizAttempts: MOCK_QUIZ_ATTEMPTS.map((a) => ({
      ...a,
      incorrectQuestionIds: [...a.incorrectQuestionIds],
    })),
    awardedNoteIds: [],
    awardedDeckIds: [],
    earnedLearningXp: 0,
    cardsReviewedToday: 4,
  };
}
