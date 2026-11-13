import type {
  StudyTopicsPersistedState,
  SyllabusTopicItem,
} from '../lib/study/topics';

export const MOCK_SYLLABUS_TOPICS: SyllabusTopicItem[] = [
  // =========================================================================
  // 1. Edexcel IAL Modular Mathematics Suite (ial-maths-suite · WMA11-SET)
  // =========================================================================
  {
    id: 'topic-wma11-1',
    subjectId: 'ial-maths-suite',
    unitCode: 'WMA11',
    unitLabel: 'P1 · Pure Mathematics 1',
    code: 'WMA11.1',
    title: 'Algebraic Expressions, Indices, Surds & Quadratic Discriminants',
    difficulty: 'foundation',
    estimatedMinutes: 45,
    keyFormulasAndPitfalls: [
      'Discriminant Δ = b² − 4ac: strictly > 0 for two distinct real roots, = 0 for repeated root, < 0 for no real roots.',
      'When rationalising (a + b√c), multiply numerator and denominator by the conjugate (a − b√c).',
      'Always flip the inequality sign when multiplying or dividing by a negative expression.',
    ],
    defaultStatus: 'mastered',
    defaultNote:
      'Watch out for hidden quadratics in disguise like 4^x − 5(2^x) + 4 = 0 where u = 2^x > 0.',
    subtopics: [
      {
        id: 'sub-wma11-1a',
        code: '1.1',
        title: 'Fractional and negative laws of indices',
        defaultCompleted: true,
      },
      {
        id: 'sub-wma11-1b',
        code: '1.2',
        title: 'Surd simplification and rationalising denominators',
        defaultCompleted: true,
      },
      {
        id: 'sub-wma11-1c',
        code: '1.3',
        title: 'Completing the square and vertex coordinates',
        defaultCompleted: true,
      },
      {
        id: 'sub-wma11-1d',
        code: '1.4',
        title: 'Discriminant b² − 4ac and quadratic inequalities',
        defaultCompleted: true,
      },
    ],
  },
  {
    id: 'topic-wma11-4',
    subjectId: 'ial-maths-suite',
    unitCode: 'WMA11',
    unitLabel: 'P1 · Pure Mathematics 1',
    code: 'WMA11.4',
    title: 'Radian Measure, Arc Length & Sector Area',
    difficulty: 'standard',
    estimatedMinutes: 40,
    keyFormulasAndPitfalls: [
      'Arc length s = rθ and sector area A = ½r²θ require θ in radians (π rad = 180°).',
      'Area of a segment = ½r²(θ − sin θ) with calculator set to RADIANS mode.',
    ],
    defaultStatus: 'mastered',
    defaultNote:
      'Double-check perimeter of a sector = 2r + rθ (do not forget the two radii!).',
    subtopics: [
      {
        id: 'sub-wma11-4a',
        code: '4.1',
        title: 'Degree ↔ radian conversion and exact trig values',
        defaultCompleted: true,
      },
      {
        id: 'sub-wma11-4b',
        code: '4.2',
        title: 'Arc length s = rθ in compound perimeter problems',
        defaultCompleted: true,
      },
      {
        id: 'sub-wma11-4c',
        code: '4.3',
        title: 'Sector area ½r²θ and minor/major segment areas',
        defaultCompleted: true,
      },
    ],
  },
  {
    id: 'topic-wma11-6',
    subjectId: 'ial-maths-suite',
    unitCode: 'WMA11',
    unitLabel: 'P1 · Pure Mathematics 1',
    code: 'WMA11.6',
    title: 'Differentiation from First Principles, Tangents & Normals',
    difficulty: 'standard',
    estimatedMinutes: 55,
    keyFormulasAndPitfalls: [
      'Normal gradient m_N = −1 / m_T (perpendicular reciprocal).',
      'Rewrite roots and fractions as x^n powers before differentiating term-by-term.',
    ],
    defaultStatus: 'mastered',
    subtopics: [
      {
        id: 'sub-wma11-6a',
        code: '6.1',
        title: 'Gradient of a chord and differentiation of x^n',
        defaultCompleted: true,
      },
      {
        id: 'sub-wma11-6b',
        code: '6.2',
        title: 'Equations of tangents and normals in ax + by + c = 0 form',
        defaultCompleted: true,
      },
      {
        id: 'sub-wma11-6c',
        code: '6.3',
        title: 'Second derivatives d²y/dx² and rate of change',
        defaultCompleted: true,
      },
    ],
  },
  {
    id: 'topic-wma12-3',
    subjectId: 'ial-maths-suite',
    unitCode: 'WMA12',
    unitLabel: 'P2 · Pure Mathematics 2',
    code: 'WMA12.3',
    title: 'Logarithms, Exponential Models & Laws of Logs',
    difficulty: 'standard',
    estimatedMinutes: 50,
    keyFormulasAndPitfalls: [
      'log_a(xy) = log_a(x) + log_a(y), log_a(x/y) = log_a(x) − log_a(y), log_a(x^k) = k log_a(x).',
      'Change of base formula: log_a(b) = log_c(b) / log_c(a).',
      'Reject any root where the argument of a logarithm is ≤ 0.',
    ],
    defaultStatus: 'mastered',
    subtopics: [
      {
        id: 'sub-wma12-3a',
        code: '3.1',
        title: 'Equivalence of y = a^x and x = log_a(y)',
        defaultCompleted: true,
      },
      {
        id: 'sub-wma12-3b',
        code: '3.2',
        title: 'Solving logarithmic equations and change of base',
        defaultCompleted: true,
      },
      {
        id: 'sub-wma12-3c',
        code: '3.3',
        title: 'Linearising y = ax^n and y = ab^x using log graphs',
        defaultCompleted: true,
      },
    ],
  },
  {
    id: 'topic-wma12-6',
    subjectId: 'ial-maths-suite',
    unitCode: 'WMA12',
    unitLabel: 'P2 · Pure Mathematics 2',
    code: 'WMA12.6',
    title: 'Definite Integration, Area Between Curves & Trapezium Rule',
    difficulty: 'standard',
    estimatedMinutes: 60,
    keyFormulasAndPitfalls: [
      'Trapezium strip width h = (b − a) / n where n is the number of strips (n + 1 ordinates).',
      'Concave-up curves give an overestimate with the trapezium rule; concave-down curves give an underestimate.',
    ],
    defaultStatus: 'in_progress',
    defaultNote:
      'Practice Jan 2025 Q9 where the line intersects the curve at two points and requires subtracting triangle area.',
    subtopics: [
      {
        id: 'sub-wma12-6a',
        code: '6.1',
        title: 'Fundamental Theorem of Calculus for definite integrals',
        defaultCompleted: true,
      },
      {
        id: 'sub-wma12-6b',
        code: '6.2',
        title: 'Area bounded by a curve, coordinate axes, and intersecting lines',
        defaultCompleted: true,
      },
      {
        id: 'sub-wma12-6c',
        code: '6.3',
        title: 'Trapezium rule numerical approximation and error bounds',
        defaultCompleted: false,
      },
    ],
  },
  {
    id: 'topic-wma13-5',
    subjectId: 'ial-maths-suite',
    unitCode: 'WMA13',
    unitLabel: 'P3 · Pure Mathematics 3',
    code: 'WMA13.5',
    title: 'Chain, Product & Quotient Rules + Exponential/Trig Calculus',
    difficulty: 'stretch',
    estimatedMinutes: 75,
    keyFormulasAndPitfalls: [
      'Quotient rule: d/dx(u/v) = (v du/dx − u dv/dx) / v² — always start with v du/dx in the numerator.',
      'For x = f(y), use dx/dy and invert: dy/dx = 1 / (dx/dy).',
    ],
    defaultStatus: 'in_progress',
    subtopics: [
      {
        id: 'sub-wma13-5a',
        code: '5.1',
        title: 'Derivatives of e^(kx), ln(x), sin(kx), cos(kx), tan(kx)',
        defaultCompleted: true,
      },
      {
        id: 'sub-wma13-5b',
        code: '5.2',
        title: 'Chain, product, and quotient rules in factored form',
        defaultCompleted: true,
      },
      {
        id: 'sub-wma13-5c',
        code: '5.3',
        title: 'Connected rates of change and dx/dy inversion',
        defaultCompleted: false,
      },
      {
        id: 'sub-wma13-5d',
        code: '5.4',
        title: 'Reverse chain rule integration of f′(x)/f(x) and f′(x)[f(x)]^n',
        defaultCompleted: false,
      },
    ],
  },
  {
    id: 'topic-wma14-7',
    subjectId: 'ial-maths-suite',
    unitCode: 'WMA14',
    unitLabel: 'P4 · Pure Mathematics 4',
    code: 'WMA14.7',
    title: 'Parametric Calculus, Integration by Parts & Separable ODEs',
    difficulty: 'stretch',
    estimatedMinutes: 80,
    keyFormulasAndPitfalls: [
      'Integration by parts: ∫ u (dv/dx) dx = uv − ∫ v (du/dx) dx (choose u by LATE: Logs, Algebra, Trig, Exp).',
      'Volume of revolution around x-axis: V = π ∫ y² dx; for parametric curves: V = π ∫ y² (dx/dt) dt.',
    ],
    defaultStatus: 'in_progress',
    subtopics: [
      {
        id: 'sub-wma14-7a',
        code: '7.1',
        title: 'Parametric differentiation dy/dx = (dy/dt) / (dx/dt)',
        defaultCompleted: true,
      },
      {
        id: 'sub-wma14-7b',
        code: '7.2',
        title: 'Integration by substitution and integration by parts (repeated)',
        defaultCompleted: false,
      },
      {
        id: 'sub-wma14-7c',
        code: '7.3',
        title: 'First-order separable differential equations and boundary conditions',
        defaultCompleted: false,
      },
      {
        id: 'sub-wma14-7d',
        code: '7.4',
        title: '3D vector lines r = a + λb, scalar product, and skew lines',
        defaultCompleted: false,
      },
    ],
  },
  {
    id: 'topic-wme01-4',
    subjectId: 'ial-maths-suite',
    unitCode: 'WME01',
    unitLabel: 'M1 · Mechanics 1',
    code: 'WME01.4',
    title: 'Dynamics of Connected Particles, Inclined Planes & Pulleys',
    difficulty: 'standard',
    estimatedMinutes: 60,
    keyFormulasAndPitfalls: [
      'Always resolve parallel and perpendicular to the inclined plane: R = mg cos α, component of weight down plane = mg sin α.',
      'Limiting friction F_max = μR acts opposite to the direction of motion (or impending motion).',
      'Use g = 9.8 m s⁻² in Edexcel Mechanics unless specified otherwise.',
    ],
    defaultStatus: 'mastered',
    subtopics: [
      {
        id: 'sub-wme01-4a',
        code: '4.1',
        title: 'Resolving forces on rough inclined planes with F = ma',
        defaultCompleted: true,
      },
      {
        id: 'sub-wme01-4b',
        code: '4.2',
        title: 'Connected particles over smooth pulleys and tow-bars',
        defaultCompleted: true,
      },
      {
        id: 'sub-wme01-4c',
        code: '4.3',
        title: 'Impulse J = mv − mu and conservation of linear momentum',
        defaultCompleted: true,
      },
    ],
  },
  {
    id: 'topic-wme02-2',
    subjectId: 'ial-maths-suite',
    unitCode: 'WME02',
    unitLabel: 'M2 · Mechanics 2',
    code: 'WME02.2',
    title: 'Projectiles, Work-Energy-Power & Centres of Mass of Laminae',
    difficulty: 'stretch',
    estimatedMinutes: 65,
    keyFormulasAndPitfalls: [
      'Horizontal velocity u_x = U cos α is constant; vertical motion uses constant acceleration a_y = −g.',
      'Work-Energy Principle: Work done by non-gravitational forces = ΔKE + ΔGPE.',
    ],
    defaultStatus: 'not_started',
    subtopics: [
      {
        id: 'sub-wme02-2a',
        code: '2.1',
        title: 'Projectile trajectory equation, time of flight, and range',
        defaultCompleted: false,
      },
      {
        id: 'sub-wme02-2b',
        code: '2.2',
        title: 'Work-energy theorem on rough slopes and tractive power P = Fv',
        defaultCompleted: false,
      },
      {
        id: 'sub-wme02-2c',
        code: '2.3',
        title: 'Centre of mass of composite laminae and wire frameworks',
        defaultCompleted: false,
      },
    ],
  },
  {
    id: 'topic-wst01-6',
    subjectId: 'ial-maths-suite',
    unitCode: 'WST01',
    unitLabel: 'S1 · Statistics 1',
    code: 'WST01.6',
    title: 'Continuous Normal Distribution & Z-Score Standardisation',
    difficulty: 'standard',
    estimatedMinutes: 50,
    keyFormulasAndPitfalls: [
      'Standardise X ~ N(μ, σ²) via Z = (X − μ) / σ ~ N(0, 1).',
      'Use percentage points table (page 28 of formula booklet) for inverse normal probabilities.',
    ],
    defaultStatus: 'not_started',
    subtopics: [
      {
        id: 'sub-wst01-6a',
        code: '6.1',
        title: 'Standardising X ~ N(μ, σ²) to Z = (X − μ)/σ',
        defaultCompleted: false,
      },
      {
        id: 'sub-wst01-6b',
        code: '6.2',
        title: 'Inverse normal lookups for unknown μ or σ simultaneously',
        defaultCompleted: false,
      },
      {
        id: 'sub-wst01-6c',
        code: '6.3',
        title: 'Discrete random variables E(X), Var(X), and linear coding',
        defaultCompleted: false,
      },
    ],
  },
  {
    id: 'topic-wfm01-1',
    subjectId: 'ial-maths-suite',
    unitCode: 'WFM01',
    unitLabel: 'FP1 · Further Pure 1',
    code: 'WFM01.1',
    title: 'Complex Numbers, Argand Diagrams, Matrices & Proof by Induction',
    difficulty: 'stretch',
    estimatedMinutes: 70,
    keyFormulasAndPitfalls: [
      'For real-coefficient polynomials, complex roots always occur in conjugate pairs (z and z*).',
      'Mathematical induction requires an explicit conclusion sentence linking n = 1 and n = k ⇒ n = k + 1.',
    ],
    defaultStatus: 'not_started',
    subtopics: [
      {
        id: 'sub-wfm01-1a',
        code: '1.1',
        title: 'Modulus-argument form and conjugate root theorem',
        defaultCompleted: false,
      },
      {
        id: 'sub-wfm01-1b',
        code: '1.2',
        title: '2×2 matrix transformations, determinants, and inverses',
        defaultCompleted: false,
      },
      {
        id: 'sub-wfm01-1c',
        code: '1.3',
        title: 'Proof by mathematical induction for series, divisibility, and matrices',
        defaultCompleted: false,
      },
    ],
  },
  {
    id: 'topic-wdm11-3',
    subjectId: 'ial-maths-suite',
    unitCode: 'WDM11',
    unitLabel: 'D1 · Decision Mathematics 1',
    code: 'WDM11.3',
    title: 'Kruskal, Prim & Dijkstra Graph Algorithms + Critical Path Analysis',
    difficulty: 'standard',
    estimatedMinutes: 55,
    keyFormulasAndPitfalls: [
      'In Kruskal’s algorithm, explicitly write down each edge weight in ascending order and state when an edge is rejected due to forming a cycle.',
      'Total float of activity (i, j) = Latest finish time − Earliest start time − Duration.',
    ],
    defaultStatus: 'not_started',
    subtopics: [
      {
        id: 'sub-wdm11-3a',
        code: '3.1',
        title: 'Minimum spanning trees via Kruskal and Prim (network & matrix)',
        defaultCompleted: false,
      },
      {
        id: 'sub-wdm11-3b',
        code: '3.2',
        title: 'Dijkstra’s shortest path algorithm and route backtracking',
        defaultCompleted: false,
      },
      {
        id: 'sub-wdm11-3c',
        code: '3.3',
        title: 'Activity networks, early/late event times, critical path, and Gantt charts',
        defaultCompleted: false,
      },
    ],
  },

  // =========================================================================
  // 2. Edexcel IAL Physics (ial-physics · WPH11-16)
  // =========================================================================
  {
    id: 'topic-wph11-2',
    subjectId: 'ial-physics',
    unitCode: 'WPH11',
    unitLabel: 'Unit 1 · Mechanics and Materials',
    code: 'WPH11.2',
    title: 'Fluid Drag, Stokes’ Law, Terminal Velocity & Hooke’s Law',
    difficulty: 'standard',
    estimatedMinutes: 50,
    keyFormulasAndPitfalls: [
      'Stokes’ Law F = 6πηrv applies ONLY to small spherical objects moving at low laminar speeds.',
      'At terminal velocity: Weight W = Upthrust U + Viscous Drag F.',
    ],
    defaultStatus: 'mastered',
    defaultNote:
      'Remember to state "laminar flow and small sphere" whenever a 2-mark question asks why Stokes’ Law fails.',
    subtopics: [
      {
        id: 'sub-wph11-2a',
        code: '2.1',
        title: 'Laminar vs turbulent flow and viscosity temperature dependence',
        defaultCompleted: true,
      },
      {
        id: 'sub-wph11-2b',
        code: '2.2',
        title: 'Stokes’ Law derivation of terminal velocity',
        defaultCompleted: true,
      },
      {
        id: 'sub-wph11-2c',
        code: '2.3',
        title: 'Stress-strain curves, Young modulus E = σ/ε, and elastic strain energy',
        defaultCompleted: true,
      },
    ],
  },
  {
    id: 'topic-wph12-3',
    subjectId: 'ial-physics',
    unitCode: 'WPH12',
    unitLabel: 'Unit 2 · Waves and Electricity',
    code: 'WPH12.3',
    title: 'Superposition, Stationary Waves, Diffraction Gratings & Photoelectric Effect',
    difficulty: 'standard',
    estimatedMinutes: 60,
    keyFormulasAndPitfalls: [
      'Diffraction grating equation: d sin θ = nλ where d = 1 / N (slit spacing in metres).',
      'Einstein’s photoelectric equation: hf = φ + ½mv²_max; threshold frequency f_0 = φ / h.',
    ],
    defaultStatus: 'in_progress',
    subtopics: [
      {
        id: 'sub-wph12-3a',
        code: '3.1',
        title: 'Phase difference, path difference, and stationary wave nodes/antinodes',
        defaultCompleted: true,
      },
      {
        id: 'sub-wph12-3b',
        code: '3.2',
        title: 'Diffraction gratings d sin θ = nλ and maximum visible order',
        defaultCompleted: true,
      },
      {
        id: 'sub-wph12-3c',
        code: '3.3',
        title: 'Photoelectric stopping potential, work function, and de Broglie wavelength',
        defaultCompleted: false,
      },
    ],
  },
  {
    id: 'topic-wph14-2',
    subjectId: 'ial-physics',
    unitCode: 'WPH14',
    unitLabel: 'Unit 4 · Further Mechanics, Fields and Particles',
    code: 'WPH14.2',
    title: 'Capacitor RC Discharge, Radial Electric Fields & Faraday/Lenz Induction',
    difficulty: 'stretch',
    estimatedMinutes: 70,
    keyFormulasAndPitfalls: [
      'Capacitor discharge: Q = Q_0 e^(−t/RC), V = V_0 e^(−t/RC), time constant τ = RC.',
      'Lenz’s Law: The direction of induced e.m.f. opposes the change in magnetic flux linkage that produces it.',
    ],
    defaultStatus: 'not_started',
    subtopics: [
      {
        id: 'sub-wph14-2a',
        code: '2.1',
        title: 'Energy stored in a capacitor W = ½QV = ½CV² and RC log graphs',
        defaultCompleted: false,
      },
      {
        id: 'sub-wph14-2b',
        code: '2.2',
        title: 'Coulomb’s Law, radial vs uniform electric fields, and equipotentials',
        defaultCompleted: false,
      },
      {
        id: 'sub-wph14-2c',
        code: '2.3',
        title: 'Magnetic flux linkage NΦ = BAN cos θ and Faraday/Lenz laws',
        defaultCompleted: false,
      },
    ],
  },

  // =========================================================================
  // 3. Edexcel IAL Chemistry (ial-chemistry · WCH11-16)
  // =========================================================================
  {
    id: 'topic-wch12-3',
    subjectId: 'ial-chemistry',
    unitCode: 'WCH12',
    unitLabel: 'Unit 2 · Energetics, Group Chemistry & Organics',
    code: 'WCH12.3',
    title: 'Hess’s Law Enthalpy Cycles, Mean Bond Enthalpies & Intermolecular Forces',
    difficulty: 'standard',
    estimatedMinutes: 55,
    keyFormulasAndPitfalls: [
      'q = mcΔT (in Joules; divide by 1000 × moles of limiting reactant for ΔH in kJ mol⁻¹ with correct ± sign).',
      'Arrows in combustion cycles point DOWN to CO₂ + H₂O; arrows in formation cycles point UP from elements.',
    ],
    defaultStatus: 'mastered',
    subtopics: [
      {
        id: 'sub-wch12-3a',
        code: '3.1',
        title: 'Standard enthalpy changes Δ_rH°, Δ_fH°, Δ_cH°, and calorimetry',
        defaultCompleted: true,
      },
      {
        id: 'sub-wch12-3b',
        code: '3.2',
        title: 'Hess’s Law cycles and bond enthalpy limitations',
        defaultCompleted: true,
      },
      {
        id: 'sub-wch12-3c',
        code: '3.3',
        title: 'London dispersion, permanent dipole, and hydrogen bonding boiling point trends',
        defaultCompleted: true,
      },
    ],
  },
  {
    id: 'topic-wch14-4',
    subjectId: 'ial-chemistry',
    unitCode: 'WCH14',
    unitLabel: 'Unit 4 · Rates, Equilibria and Further Organic Chemistry',
    code: 'WCH14.4',
    title: 'Brønsted-Lowry Acids, Ka, Acid-Base Buffers & Titration Curves',
    difficulty: 'stretch',
    estimatedMinutes: 65,
    keyFormulasAndPitfalls: [
      'For buffer calculations, do NOT assume [H⁺] = [A⁻]; use [H⁺] = Ka × [HA] / [A⁻].',
      'At the half-equivalence point of a weak acid–strong base titration, pH = pKa.',
    ],
    defaultStatus: 'in_progress',
    subtopics: [
      {
        id: 'sub-wch14-4a',
        code: '4.1',
        title: 'Strong vs weak acids, Kw temperature variation, and Ka/pKa',
        defaultCompleted: true,
      },
      {
        id: 'sub-wch14-4b',
        code: '4.2',
        title: 'Acidic and basic buffer calculations upon adding small H⁺/OH⁻',
        defaultCompleted: false,
      },
      {
        id: 'sub-wch14-4c',
        code: '4.3',
        title: 'Titration pH curves and indicator pK_in selection',
        defaultCompleted: false,
      },
    ],
  },

  // =========================================================================
  // 4. Cambridge IGCSE Mathematics (igcse-maths-0580 · 0580)
  // =========================================================================
  {
    id: 'topic-0580-e2',
    subjectId: 'igcse-maths-0580',
    unitCode: '0580/42',
    unitLabel: 'Paper 42 · Extended Structured',
    code: '0580.E2',
    title: 'Algebraic Fractions, Composite/Inverse Functions & Turning Points',
    difficulty: 'standard',
    estimatedMinutes: 50,
    keyFormulasAndPitfalls: [
      'fg(x) means apply g first, then substitute g(x) into f(x).',
      'To find f⁻¹(x), write y = f(x), swap x and y, and rearrange to make y the subject.',
    ],
    defaultStatus: 'mastered',
    subtopics: [
      {
        id: 'sub-0580-e2a',
        code: 'E2.1',
        title: 'Simplifying algebraic fractions by factorising quadratics',
        defaultCompleted: true,
      },
      {
        id: 'sub-0580-e2b',
        code: 'E2.2',
        title: 'Composite fg(x) and inverse f⁻¹(x) functions',
        defaultCompleted: true,
      },
      {
        id: 'sub-0580-e2c',
        code: 'E2.3',
        title: 'Differentiation of polynomials for stationary turning points',
        defaultCompleted: true,
      },
    ],
  },
  {
    id: 'topic-0580-e7',
    subjectId: 'igcse-maths-0580',
    unitCode: '0580/42',
    unitLabel: 'Paper 42 · Extended Structured',
    code: '0580.E7',
    title: '3D Trigonometry, Sine/Cosine Rules & Vector Collinearity Proofs',
    difficulty: 'stretch',
    estimatedMinutes: 55,
    keyFormulasAndPitfalls: [
      'Cosine rule for an angle: cos A = (b² + c² − a²) / (2bc).',
      'To prove three points A, B, C are collinear: show AB = k BC (parallel) AND state they share common point B.',
    ],
    defaultStatus: 'in_progress',
    subtopics: [
      {
        id: 'sub-0580-e7a',
        code: 'E7.1',
        title: 'Sine rule ambiguous case and Cosine rule in bearings',
        defaultCompleted: true,
      },
      {
        id: 'sub-0580-e7b',
        code: 'E7.2',
        title: 'Angle between a line and a plane in 3D cuboids/pyramids',
        defaultCompleted: true,
      },
      {
        id: 'sub-0580-e7c',
        code: 'E7.3',
        title: 'Position vectors, ratio division, and collinearity proofs',
        defaultCompleted: false,
      },
    ],
  },

  // =========================================================================
  // 5. Cambridge IGCSE Physics (igcse-physics-0625 · 0625)
  // =========================================================================
  {
    id: 'topic-0625-4',
    subjectId: 'igcse-physics-0625',
    unitCode: '0625/42',
    unitLabel: 'Paper 42 · Extended Theory',
    code: '0625.4',
    title: 'Electromagnetic Induction, AC Generators, Transformers & Grid Transmission',
    difficulty: 'standard',
    estimatedMinutes: 45,
    keyFormulasAndPitfalls: [
      'Transformer turns ratio: V_p / V_s = N_p / N_s; for 100% efficiency, I_p V_p = I_s V_s.',
      'High-voltage transmission reduces current I, which reduces power loss P_loss = I²R in cables.',
    ],
    defaultStatus: 'in_progress',
    subtopics: [
      {
        id: 'sub-0625-4a',
        code: '4.1',
        title: 'Fleming’s right-hand (generator) vs left-hand (motor) rules',
        defaultCompleted: true,
      },
      {
        id: 'sub-0625-4b',
        code: '4.2',
        title: 'Step-up and step-down transformer calculations and laminated iron core',
        defaultCompleted: false,
      },
    ],
  },

  // =========================================================================
  // 6. Cambridge Int'l A-Level Mathematics (cie-maths-9709 · 9709)
  // =========================================================================
  {
    id: 'topic-9709-p3-7',
    subjectId: 'cie-maths-9709',
    unitCode: '9709/32',
    unitLabel: 'Paper 3 · Pure Mathematics 3',
    code: '9709.P3.7',
    title: 'Complex Numbers Loci on Argand Diagrams & Differential Equations',
    difficulty: 'stretch',
    estimatedMinutes: 70,
    keyFormulasAndPitfalls: [
      '|z − z₁| = r is a circle centred at z₁; |z − z₁| = |z − z₂| is the perpendicular bisector of z₁ and z₂.',
      'arg(z − z₁) = θ is a half-line starting at (excluding) z₁ at angle θ to the positive real axis.',
    ],
    defaultStatus: 'in_progress',
    subtopics: [
      {
        id: 'sub-9709-p3-7a',
        code: '7.1',
        title: 'Exponential form r e^(iθ) and Argand loci sketches',
        defaultCompleted: true,
      },
      {
        id: 'sub-9709-p3-7b',
        code: '7.2',
        title: 'Forming and solving separable differential equations from word rates',
        defaultCompleted: false,
      },
    ],
  },

  // =========================================================================
  // 7. Edexcel International GCSE Mathematics A (edexcel-igcse-4ma1 · 4MA1)
  // =========================================================================
  {
    id: 'topic-4ma1-3-4',
    subjectId: 'edexcel-igcse-4ma1',
    unitCode: '4MA1/2H',
    unitLabel: 'Paper 2H · Higher Tier',
    code: '4MA1.3.4',
    title: 'Differentiation of Polynomials, Kinematics (s-v-a) & Circle Theorems',
    difficulty: 'standard',
    estimatedMinutes: 50,
    keyFormulasAndPitfalls: [
      'Displacement s(t) → differentiate for velocity v = ds/dt → differentiate for acceleration a = dv/dt.',
      'Alternate Segment Theorem: Angle between tangent and chord equals angle subtended by chord in alternate segment.',
    ],
    defaultStatus: 'mastered',
    subtopics: [
      {
        id: 'sub-4ma1-3-4a',
        code: '3.4a',
        title: 'Kinematics displacement, velocity, and acceleration via calculus',
        defaultCompleted: true,
      },
      {
        id: 'sub-4ma1-3-4b',
        code: '3.4b',
        title: 'Circle theorem proofs and intersecting chord/secant lengths',
        defaultCompleted: true,
      },
    ],
  },
];

export function createDefaultStudyTopicsState(): StudyTopicsPersistedState {
  const completedSubtopicIds: string[] = [];
  const notesByTopicId: Record<string, string> = {};
  const xpAwardedTopicIds: string[] = [];

  for (const topic of MOCK_SYLLABUS_TOPICS) {
    if (topic.defaultNote) {
      notesByTopicId[topic.id] = topic.defaultNote;
    }
    for (const sub of topic.subtopics) {
      if (sub.defaultCompleted) {
        completedSubtopicIds.push(sub.id);
      }
    }
    if (
      topic.subtopics.length > 0 &&
      topic.subtopics.every((s) => s.defaultCompleted)
    ) {
      xpAwardedTopicIds.push(topic.id);
    }
  }

  return {
    version: 1,
    completedSubtopicIds,
    statusOverrideByTopicId: {},
    notesByTopicId,
    xpAwardedTopicIds,
  };
}

