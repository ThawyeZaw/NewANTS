/**
 * Mock editorial & event fixtures for `[ZYY-2.4]` (`/activities`, `/articles`).
 * Every slug referenced by `MOCK_ORG_HOME_DATA` (`showcase-home.mock.ts`) resolves cleanly here.
 */

export type OrgArtworkTheme =
  | 'tutoring'
  | 'meetup'
  | 'venue'
  | 'hackathon'
  | 'article-ums'
  | 'article-focus'
  | 'article-maths';

export type OrgActivityCategory =
  | 'Tutoring'
  | "Student's Meet"
  | 'Exam Venue Visit'
  | 'Hackathon';

export interface OrgActivityExternalLinkMock {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary';
}

export interface OrgActivityPhaseMock {
  window: string;
  phase: string;
  mode: string;
  summary: string;
}

export interface OrgActivityPhotoMock {
  id: string;
  imageSrc: string;
  imageAlt: string;
  caption: string;
  locationTag: string;
  shotLabel: string;
  artworkTheme: OrgArtworkTheme;
}

export interface OrgActivityMock {
  id: string;
  slug: string;
  category: OrgActivityCategory;
  isUpcoming?: boolean;
  title: string;
  dateLabel: string;
  location: string;
  attendanceLabel: string;
  facilitators: string[];
  summary: string;
  recapParagraphs: string[];
  highlights: string[];
  externalLinks?: OrgActivityExternalLinkMock[];
  schedulePhases?: OrgActivityPhaseMock[];
  coverImageSrc: string;
  coverAlt: string;
  artworkTheme: OrgArtworkTheme;
  gallery: OrgActivityPhotoMock[];
}

export type OrgArticleCategory =
  | 'Study Guide'
  | 'Exam Strategy'
  | 'Productivity'
  | 'Announcement';

export interface OrgArticleSectionMock {
  id: string;
  heading: string;
  paragraphs: string[];
  callout?: {
    title: string;
    body: string;
  };
  codeSnippet?: string;
  checklist?: string[];
}

export interface OrgArticleMock {
  id: string;
  slug: string;
  category: OrgArticleCategory;
  title: string;
  subtitle: string;
  publishedLabel: string;
  readMinutes: number;
  authorUsername: string;
  authorName: string;
  authorRole: string;
  summary: string;
  tags: string[];
  artworkTheme: OrgArtworkTheme;
  /** Optional syllabus/domain code displayed on the typographic cover */
  coverCode?: string;
  /** Optional formula or technical expression displayed on the typographic cover */
  coverFormula?: string;
  /** Optional quantitative callout pill displayed on the typographic cover */
  coverMetric?: string;
  sections: OrgArticleSectionMock[];
}

export const MOCK_ORG_ACTIVITIES: OrgActivityMock[] = [
  {
    id: 'act_hackathon_2026',
    slug: 'edtech-students-hackathon-2026',
    category: 'Hackathon',
    isUpcoming: true,
    title: 'EdTech Students Hackathon 2026',
    dateLabel: 'Nov 23 – Dec 6, 2026',
    location: 'Hinthar International School, Yangon & Online',
    attendanceLabel: '12 Teams · Ages 14–20',
    facilitators: ['The ANTs', 'Hinthar International School'],
    summary:
      'A 2-week hybrid launchpad where student builders aged 14–20 turn practical education and community ideas into working AI prototypes. Free entry with workshops, catering, and certificates.',
    recapParagraphs: [
      'Organized by The ANTs with Hinthar International School (Shwe Pone Nyat Campus), the EdTech Students Hackathon 2026 gives high-school and pre-university learners a structured 2-week sprint from initial problem framing to a live Demo Day.',
      'No prior hackathon experience is required. Accepted squads of 4 to 6 (or solo builders matched into teams) complete five evening online workshops before gathering on campus for kickoff mentoring, a remote build sprint, and final stage demos. Full details are available on edtechhackathon.dev.',
    ],
    highlights: [
      '100% free participation including evening workshops, campus lunches (Nov 29 & Dec 6), mentoring, and certificates',
      'Apply by Nov 15, 2026 as a school squad (4–6 students) or Solo Builder',
      'Hybrid format pairing 5 online training evenings with 2 in-person campus days at Hinthar International School',
    ],
    externalLinks: [
      {
        label: 'Register for Free',
        href: 'https://edtechhackathon.dev/register',
        variant: 'primary',
      },
    ],
    schedulePhases: [
      {
        window: 'Nov 23 – 27',
        phase: '5-Day Evening Training',
        mode: 'Online (8:00 – 10:00 PM MMT)',
        summary:
          'UI/UX prototyping, proposal framing, and prompt-to-product AI build workflows.',
      },
      {
        window: 'Sun, Nov 29',
        phase: 'Campus Day 1: Kickoff',
        mode: 'Hinthar International School (9 AM – 4 PM)',
        summary:
          'Squad introductions, ice-breaking order picks, catered lunch, and mentor consultations.',
      },
      {
        window: 'Nov 30 – Dec 5',
        phase: 'Remote Build Sprint',
        mode: 'Freeze Dec 5 @ 10:00 PM MMT',
        summary:
          'Continuous mentor check-ins leading up to the repository and prototype submission lock.',
      },
      {
        window: 'Sun, Dec 6',
        phase: 'Campus Day 2: Demo Day',
        mode: 'Hinthar International School (9 AM – 4 PM)',
        summary:
          "Live prototype pitches from 12 teams, judges' Q&A, trophies, and completion certificates.",
      },
    ],
    coverImageSrc: '/images/org/hackathon-table.jpg',
    coverAlt:
      'Warm brass desk lamp over laptops, hand-drawn paper wireframes, and sticky notes arranged on a team hackathon table.',
    artworkTheme: 'hackathon',
    gallery: [
      {
        id: 'gal_h1',
        imageSrc: '/images/org/hackathon-table.jpg',
        imageAlt:
          'Student sprint table lit by a brass desk lamp with laptops, wireframes, and sticky notes.',
        caption: 'Evening wireframing and live AI prototype iteration during sprint prep.',
        locationTag: 'Build Sprint Table',
        shotLabel: 'Prototype Prep',
        artworkTheme: 'hackathon',
      },
      {
        id: 'gal_h2',
        imageSrc: '/images/org/students-meet.jpg',
        imageAlt:
          'Students and mentors collaborating across wooden tables with open laptops and notebooks.',
        caption: 'Squad scoping and mentor office hours around shared project tables.',
        locationTag: 'Campus Kickoff',
        shotLabel: 'Mentor Review',
        artworkTheme: 'meetup',
      },
      {
        id: 'gal_h3',
        imageSrc: '/images/org/study-desk-notes.jpg',
        imageAlt:
          'Hand-drawn diagrams and structured architecture notes on grid paper beside a drafting pencil.',
        caption: 'Early user flow sketches and architecture checklists before Demo Day.',
        locationTag: 'Design Notes',
        shotLabel: 'System Sketch',
        artworkTheme: 'article-maths',
      },
    ],
  },
  {
    id: 'act_venue_2025',
    slug: 'oct-nov-exam-venue-visit-2025',
    category: 'Exam Venue Visit',
    title: 'Pre-Session Exam Venue Walkthrough & Candidate Briefing',
    dateLabel: 'Oct 2025',
    location: 'British Council & Partner Centres',
    attendanceLabel: '95 candidates',
    facilitators: ['Thaw Ye Zaw', 'Zay Lynn Htet', 'Su Yadanar'],
    summary:
      'Walked first-time private IGCSE and IAL candidates through gate arrival windows, calculator reset checks, and lab room layouts ahead of Paper 1.',
    recapParagraphs: [
      'Walking into an unfamiliar examination centre for the first time adds needless stress on morning papers. Ahead of the October/November sitting, our mentors scheduled pre-exam walkthroughs across partner test centres so private candidates could see the exact check-in tables, waiting areas, and classroom corridors beforehand.',
      'During the briefing, tutors went through transparent pencil-case requirements, Statement of Entry checks, and how invigilators verify scientific calculator modes before seating.',
    ],
    highlights: [
      'Walked gate entry paths, bag storage counters, and waiting halls across three partner venues',
      'Checked Casio fx-991EX and fx-991CW mode resets and permitted stationery cases',
      'Answered thirty minutes of pacing and exam-morning logistics questions outside the hall',
    ],
    coverImageSrc: '/images/org/exam-venue.jpg',
    coverAlt:
      'Sunlit terrazzo school corridor outside an examination classroom with check-in clipboards and clear pencil cases on a table.',
    artworkTheme: 'venue',
    gallery: [
      {
        id: 'gal_v1',
        imageSrc: '/images/org/exam-venue.jpg',
        imageAlt:
          'Check-in corridor table holding clear exam pencil cases and candidate roster clipboards outside glass classroom doors.',
        caption: 'Morning check-in desk setup and transparent stationery check outside the exam corridor.',
        locationTag: 'Main Hall Corridor',
        shotLabel: 'Check-In Desk',
        artworkTheme: 'venue',
      },
      {
        id: 'gal_v2',
        imageSrc: '/images/org/study-desk-notes.jpg',
        imageAlt:
          'Hand-drawn physics mechanics slope diagram on graph paper beside a steel mechanical pencil and plastic ruler.',
        caption: 'Stationery and formula reference sheet reviewed during the pre-session desk checklist.',
        locationTag: 'Briefing Room 2B',
        shotLabel: 'Stationery Check',
        artworkTheme: 'article-maths',
      },
      {
        id: 'gal_v3',
        imageSrc: '/images/org/science-lab.jpg',
        imageAlt:
          'Science practical wooden bench arranged with an analog ammeter, circuit leads, stopwatch, and slotted weights.',
        caption: 'Bench check covering timing, electrical circuit continuity, and unit labels before Paper 3.',
        locationTag: 'Science Wing Lab',
        shotLabel: 'Lab Bench Check',
        artworkTheme: 'tutoring',
      },
      {
        id: 'gal_v4',
        imageSrc: '/images/org/students-meet.jpg',
        imageAlt:
          'Students and mentors sitting around wooden tables with open notebooks discussing paper schedules.',
        caption: 'Post-walkthrough Q&A around the courtyard study tables with printed timetable cards.',
        locationTag: 'Courtyard Tables',
        shotLabel: 'Group Q&A',
        artworkTheme: 'meetup',
      },
    ],
  },
  {
    id: 'act_tutor_ial_maths',
    slug: 'ial-modular-maths-intensive-tutoring',
    category: 'Tutoring',
    title: 'Edexcel WMA11 & WMA12 Past Paper Marathon',
    dateLabel: 'Sep 2025',
    location: 'Yangon Study Room & Online',
    attendanceLabel: '140 students',
    facilitators: ['Aung Khant Kyaw', 'Thaw Ye Zaw', 'Zay Lynn Htet'],
    summary:
      'Timed runs through six past series of Pure 1 and Pure 2 with line-by-line mark scheme review and UMS target planning.',
    recapParagraphs: [
      'Edexcel International A-Level Pure Mathematics rewards tidy algebraic working and clear separation between method marks (M1) and final accuracy marks (A1). Over two weekends, senior maths tutors worked through six recent examination papers from January 2023 through May/June 2025.',
      'Each block paired a timed 45-minute problem set with group inspection of the examiner report, tracing common sign slips and substitution shortcuts.',
    ],
    highlights: [
      'Worked six full WMA11 and WMA12 papers under timed exam pacing',
      'Checked live raw-mark-to-UMS targets using The ANTs Grade Calculator',
      'Shared an annotated mistake log template so students could track recurring errors',
    ],
    coverImageSrc: '/images/org/tutoring-session.jpg',
    coverAlt:
      'Tutor pointing to an integration problem on a dark classroom chalkboard while a student takes notes over an open workbook.',
    artworkTheme: 'tutoring',
    gallery: [
      {
        id: 'gal_t1',
        imageSrc: '/images/org/tutoring-session.jpg',
        imageAlt:
          'Peer tutor solving a definite integral on a chalkboard beside a seated student taking notes.',
        caption: 'Chalkboard walkthrough of Pure integration methods during the Saturday problem session.',
        locationTag: 'Study Room Chalkboard',
        shotLabel: 'Chalkboard Review',
        artworkTheme: 'tutoring',
      },
      {
        id: 'gal_t2',
        imageSrc: '/images/org/study-desk-notes.jpg',
        imageAlt:
          'Graph notebook showing free-body force resolution next to a drafting pencil and transparent ruler.',
        caption: 'Handwritten worked working showing clear step-by-step force and algebraic substitutions.',
        locationTag: 'Worked Solutions Desk',
        shotLabel: 'Method Marks Draft',
        artworkTheme: 'article-maths',
      },
      {
        id: 'gal_t3',
        imageSrc: '/images/org/students-meet.jpg',
        imageAlt:
          'Students discussing marked past papers around wooden study tables.',
        caption: 'Small-table review comparing examiner report notes after the afternoon mock paper.',
        locationTag: 'Main Study Tables',
        shotLabel: 'Group Marking',
        artworkTheme: 'meetup',
      },
    ],
  },
  {
    id: 'act_students_meet_2025',
    slug: 'annual-ants-students-meet-2025',
    category: "Student's Meet",
    title: "The ANTs Annual Student's Meet & Subject Panels",
    dateLabel: 'Aug 2025',
    location: 'Community Hall, Yangon',
    attendanceLabel: '185 attendees',
    facilitators: ['May Thu Zar', 'Thaw Ye Zaw', 'Zay Lynn Htet'],
    summary:
      'An afternoon gathering with students, peer tutors, and university alumni covering AS subject combinations, admissions, and live Study demos.',
    recapParagraphs: [
      'Studying independently as a private or school candidate can get repetitive. Our August Student Meet brought Year 10 learners, sitting A-Level candidates, subject tutors, and returning university students into the same hall for an afternoon of candid conversation.',
      'Sessions covered choosing between modular cash-in maths units and linear A-Level paths, subject Q&A tables across Sciences and Maths, and early feedback on Flow’s weekly planner.',
    ],
    highlights: [
      'University admissions panel with alumni studying computing, engineering, and medicine',
      'Five small-group subject tables pairing younger students with senior tutors',
      'Student feedback notes collected for Study’s past paper matrix and Flow’s timetable',
    ],
    coverImageSrc: '/images/org/students-meet.jpg',
    coverAlt:
      'Group of students and mentors seated around wooden tables with open notebooks, laptops, and printed worksheets near sunlit windows.',
    artworkTheme: 'meetup',
    gallery: [
      {
        id: 'gal_m1',
        imageSrc: '/images/org/students-meet.jpg',
        imageAlt:
          'Mentors and students collaborating across two large wooden study tables filled with papers and laptops.',
        caption: 'Subject combination table where rising AS students spoke with university mentors.',
        locationTag: 'North Study Tables',
        shotLabel: 'Subject Tables',
        artworkTheme: 'meetup',
      },
      {
        id: 'gal_m2',
        imageSrc: '/images/org/tutoring-session.jpg',
        imageAlt:
          'Tutor sketching calculus notes on a chalkboard for a small student group.',
        caption: 'Drop-in Pure Maths corner during the afternoon breakout sessions.',
        locationTag: 'Board Corner',
        shotLabel: 'Maths Corner',
        artworkTheme: 'tutoring',
      },
      {
        id: 'gal_m3',
        imageSrc: '/images/org/hackathon-table.jpg',
        imageAlt:
          'Open laptops alongside pencil wireframes and sticky notes lit by a warm desk lamp.',
        caption: 'Live student feedback station testing early Study topic checklists and Flow blocks.',
        locationTag: 'Tool Demo Table',
        shotLabel: 'Demo Station',
        artworkTheme: 'hackathon',
      },
    ],
  },
  {
    id: 'act_physics_clinic',
    slug: 'cambridge-9702-mechanics-waves-clinic',
    category: 'Tutoring',
    title: 'Cambridge 9702 AS Physics: Paper 2 & Uncertainty Clinic',
    dateLabel: 'Nov 2025',
    location: 'Online Cohort Room',
    attendanceLabel: '78 candidates',
    facilitators: ['Zay Lynn Htet', 'Su Yadanar'],
    summary:
      'Focused problem clinic targeting percentage uncertainties, stationary waves, and Paper 2 written explanations.',
    recapParagraphs: [
      'Paper 2 structured questions frequently drop marks over missing direction signs or loose wording around stationary wave nodes and momentum conservation. We ran a focused three-hour workshop working through difficult 9702/22 questions from recent exam series.',
      'Students practiced writing three-line explanation answers keyed directly to official Cambridge marking points.',
    ],
    highlights: [
      'Error-bar and percentage uncertainty propagation drills on sample datasets',
      'Step-by-step free-body slope and stationary wave boundary sketches',
      'Three-point structured answer checklist for Paper 2 explain questions',
    ],
    coverImageSrc: '/images/org/study-desk-notes.jpg',
    coverAlt:
      'Clean mechanics incline plane force diagram drawn on grid paper with ruler, eraser, and mechanical pencil.',
    artworkTheme: 'article-maths',
    gallery: [
      {
        id: 'gal_p1',
        imageSrc: '/images/org/study-desk-notes.jpg',
        imageAlt:
          'Inclined plane diagram drawn neatly in red and black ink showing angle 32 degrees and resolved weight components.',
        caption: 'Clean force resolution layout on grid paper emphasized during Mechanics Paper 2 drills.',
        locationTag: 'Worksheet Packet',
        shotLabel: 'Force Diagrams',
        artworkTheme: 'article-maths',
      },
      {
        id: 'gal_p2',
        imageSrc: '/images/org/science-lab.jpg',
        imageAlt:
          'Lab table holding analog electrical meters, stopwatch, and graph notebook.',
        caption: 'Connecting Paper 2 uncertainty rules back to real ammeter and stopwatch scale divisions.',
        locationTag: 'Lab Reference Bench',
        shotLabel: 'Scale Precision',
        artworkTheme: 'venue',
      },
      {
        id: 'gal_p3',
        imageSrc: '/images/org/tutoring-session.jpg',
        imageAlt:
          'Tutor discussing derivation steps beside a student at a wooden desk.',
        caption: 'Live derivation checking and mark-scheme keyword comparison.',
        locationTag: 'Clinic Session',
        shotLabel: 'Keyword Check',
        artworkTheme: 'tutoring',
      },
    ],
  },
  {
    id: 'act_post_exam_social',
    slug: 'may-june-post-exam-study-social',
    category: "Student's Meet",
    title: 'May/June Post-Exam Reflection & Subject Transition Meet',
    dateLabel: 'Jun 2025',
    location: 'Yangon Study Lounge',
    attendanceLabel: '110 attendees',
    facilitators: ['Aung Khant Kyaw', 'Hnin Wai Lwin'],
    summary:
      'Helped finishing IGCSE candidates compare AS and Edexcel IAL subject combinations before August classes began.',
    recapParagraphs: [
      'Moving from IGCSE to AS-Level or Pearson Edexcel IAL subjects brings a real jump in pace and independent reading. This informal afternoon meetup paired finishing Year 11 students with older candidates and tutors to inspect sample syllabuses side by side.',
      'Attendees walked through modular versus linear examination routes and traded annotated revision notes and past-paper binders.',
    ],
    highlights: [
      'Side-by-side comparison of Cambridge A-Level and Edexcel IAL assessment schedules',
      'UMS and cash-in walk-through for incoming Pure and Mechanics candidates',
      'Peer textbook and printed past-paper folder swap after the exam season',
    ],
    coverImageSrc: '/images/org/hackathon-table.jpg',
    coverAlt:
      'Warm lamp illuminating laptops, hand-drawn schedule sketches, and sticky notes across a wooden table.',
    artworkTheme: 'hackathon',
    gallery: [
      {
        id: 'gal_s1',
        imageSrc: '/images/org/hackathon-table.jpg',
        imageAlt:
          'Table lamp lighting paper plans and open laptops during student group planning.',
        caption: 'Tabletop planning notes comparing Year 12 subject hours and mock test windows.',
        locationTag: 'Planning Table',
        shotLabel: 'Subject Map',
        artworkTheme: 'hackathon',
      },
      {
        id: 'gal_s2',
        imageSrc: '/images/org/students-meet.jpg',
        imageAlt:
          'Students chatting across long wooden study tables with binders and notebooks.',
        caption: 'Group discussion exchanging IGCSE books and planning August transition study pairs.',
        locationTag: 'Main Hall',
        shotLabel: 'Book Swap',
        artworkTheme: 'meetup',
      },
      {
        id: 'gal_s3',
        imageSrc: '/images/org/study-desk-notes.jpg',
        imageAlt:
          'Graph notebook with worked physics force problem and steel drafting pencil.',
        caption: 'Sample AS Mechanics bridge exercise handed out for summer self-study.',
        locationTag: 'Resource Desk',
        shotLabel: 'Bridge Sheet',
        artworkTheme: 'article-maths',
      },
    ],
  },
  {
    id: 'act_lab_visit_2026',
    slug: 'as-practical-venue-familiarization-2026',
    category: 'Exam Venue Visit',
    title: 'AS Science Paper 3 Lab Familiarization & Timing Run',
    dateLabel: 'Apr 2026',
    location: 'Partner Science Wing',
    attendanceLabel: '64 candidates',
    facilitators: ['Su Yadanar', 'Zay Lynn Htet'],
    summary:
      'Walked private A-Level candidates through titration benches, circuit setups, and two-hour Paper 3 station rotation timing.',
    recapParagraphs: [
      'Private candidates often have limited lab hours ahead of Cambridge Paper 3 practical exams. Our sciences tutors ran a guided familiarization session covering burette eye-level meniscus readings, circuit continuity checks, and bench-swap rules between Question 1 and Question 2.',
      'Each participant practiced recording raw tables to consistent significant figures before exam week.',
    ],
    highlights: [
      'Hands-on look at burette, pipette, ammeter, and micrometer screw gauge setups',
      'Station-swap timing reminders covering the 60-minute changeover bell',
      'Table precision and unit-heading checklist for Paper 3 data logging',
    ],
    coverImageSrc: '/images/org/science-lab.jpg',
    coverAlt:
      'School science bench with wooden stand, analog voltmeter and ammeter circuit, stopwatch, brass weights, and open graph lab book.',
    artworkTheme: 'tutoring',
    gallery: [
      {
        id: 'gal_l1',
        imageSrc: '/images/org/science-lab.jpg',
        imageAlt:
          'Wooden laboratory bench arranged with electrical circuit components, stopwatch, masses, and lab notebook.',
        caption: 'Physics circuit station setup used to practice continuity checking and rapid table logging.',
        locationTag: 'Lab Bench Row B',
        shotLabel: 'Circuit Station',
        artworkTheme: 'tutoring',
      },
      {
        id: 'gal_l2',
        imageSrc: '/images/org/exam-venue.jpg',
        imageAlt:
          'Exam centre hallway outside classroom doors with clear pencil case check table.',
        caption: 'Hallway entry check confirming lab coat rules and permitted calculator models.',
        locationTag: 'Wing Entrance',
        shotLabel: 'Hall Entry',
        artworkTheme: 'venue',
      },
      {
        id: 'gal_l3',
        imageSrc: '/images/org/study-desk-notes.jpg',
        imageAlt:
          'Clean physics graph notebook page with ruler and pencil.',
        caption: 'Graph-scaling and gradient triangle convention checked during post-lab review.',
        locationTag: 'Debrief Table',
        shotLabel: 'Graph Scaling',
        artworkTheme: 'article-maths',
      },
    ],
  },
];

export const MOCK_ORG_ARTICLES: OrgArticleMock[] = [
  {
    id: 'art_ums_guide',
    slug: 'edexcel-ial-ums-mastery-guide',
    category: 'Exam Strategy',
    title: 'How Pearson Edexcel IAL UMS & Cash-In Awards Really Work',
    subtitle:
      'A plain breakdown of raw marks, piecewise UMS scaling, and planning clean 6-unit cash-in combinations.',
    publishedLabel: 'Nov 2026',
    readMinutes: 7,
    authorUsername: 'thawyezaw',
    authorName: 'Thaw Ye Zaw (Thorin)',
    authorRole: 'Founder & Lead Architect',
    summary:
      'Stop guessing how a 64/75 raw score in WMA12 turns into UMS. Understand boundary interpolation, the 180/200 P3+P4 rule for A*, and unit retakes.',
    tags: ['Edexcel IAL', 'UMS', 'WMA11-SET', 'Strategy'],
    artworkTheme: 'article-ums',
    coverCode: 'YMA01 · WMA11–14',
    coverFormula: 'UMS = 80 + 20 × ΔRaw',
    coverMetric: '480/600 A · 180/200 P3+P4 A*',
    sections: [
      {
        id: 'why-ums-exists',
        heading: 'Why Raw Marks Cannot Be Compared Directly Across Series',
        paragraphs: [
          'Every January, May/June, and October/November examination paper varies slightly in difficulty. Comparing a 62/75 raw score from a tough June sitting against a 66/75 from a simpler January paper would unfairly penalize students who sat the harder paper.',
          'Pearson Edexcel solves this with the Uniform Mark Scale (UMS). After examiners review marked scripts and set raw grade boundaries (A, B, C, D, E) for each unit, your raw score is scaled onto a standard 100-UMS interval for every mathematics unit.',
        ],
        callout: {
          title: 'Key A and A* thresholds for 6-unit IAL Maths',
          body: 'An overall Grade A requires 480/600 UMS across your 6 units. Earning an A* requires 480/600 overall plus at least 180/200 combined UMS across WMA13 (P3) and WMA14 (P4).',
        },
      },
      {
        id: 'linear-interpolation',
        heading: 'How Piecewise Linear Interpolation Maps Raw Marks to UMS',
        paragraphs: [
          'Between adjacent grade boundaries, Edexcel maps raw marks linearly onto the UMS interval. Checking the slope near the A boundary (80 UMS) shows how many raw marks separate a high B from an A in a given sitting.',
        ],
        codeSnippet:
          'UMS = UMS_lower\n    + ((Raw - Raw_lower) / (Raw_upper - Raw_lower)) * (UMS_upper - UMS_lower)',
        checklist: [
          'Grade A always starts at 80/100 UMS per standard IAL unit',
          'Grade B starts at 70/100 UMS, Grade C at 60/100, and Grade E at 40/100',
          'The full 100/100 UMS threshold scales dynamically above the Grade A raw mark',
        ],
      },
      {
        id: 'modular-cash-in',
        heading: 'Choosing Clean Combinations in the 14-Unit Maths Suite',
        paragraphs: [
          'Candidates aiming for both IAL Mathematics (YMA01) and Further Mathematics (YFM01) draw from 14 units spanning Pure, Further Pure, Mechanics, Statistics, and Decision Maths. Planning cash-in combinations early prevents invalid double-counting when you register.',
          'Use The ANTs Grade Calculator (/calculator) to test historical series boundaries or inspect cash-in routes inside Study.',
        ],
      },
    ],
  },
  {
    id: 'art_focus_blocks',
    slug: 'sustainable-time-blocking-exam-season',
    category: 'Productivity',
    title: 'Sustainable 24-Hour Time Blocking Without Exam Burnout',
    subtitle:
      'Why 15-minute transition buffers, realistic sleep hours, and P1 to P4 task sorting beat packed 12-hour study timetables.',
    publishedLabel: 'Oct 2026',
    readMinutes: 5,
    authorUsername: 'zaylynnhtet',
    authorName: 'Zay Lynn Htet',
    authorRole: 'Co-Founder & Design Lead',
    summary:
      'Pair morning Pomodoro sprints with protected sleep blocks and 15-minute gaps so one slow past paper does not derail your entire week.',
    tags: ['Flow', 'Pomodoro', 'Time Blocking', 'Habits'],
    artworkTheme: 'article-focus',
    coverCode: 'FLOW · 24H STUDIO',
    coverFormula: '2 × 25m Sprint + 15m Buffer',
    coverMetric: '7.5h Protected Sleep · P1–P4',
    sections: [
      {
        id: 'myth-of-full-blocks',
        heading: 'The Problem With Zero-Gap Study Schedules',
        paragraphs: [
          'Most handwritten study timetables fall apart by Wednesday because every hour is booked edge-to-edge. When a Physics Paper 4 takes 12 extra minutes to mark and check, every afternoon block slides late.',
          'In Flow, we encourage building daily timetables around honest 15-minute gaps between heavy papers and locking in a regular overnight sleep window first.',
        ],
      },
      {
        id: 'p1-to-p4-triage',
        heading: 'Using P1 to P4 Priorities to Protect Real Practice',
        paragraphs: [
          'Instead of staring at 20 undifferentiated tasks, mark only one or two P1 items each morning, usually timed past-paper sections or weak syllabus topics, and handle them while your concentration is freshest.',
        ],
        checklist: [
          'Place 7.5 to 8 hours of sleep on your calendar before adding study blocks',
          'Keep P1 urgent tasks strictly tied to active recall or timed papers',
          'Leave low-energy evening slots for flashcard review and copying mistake notes',
        ],
      },
    ],
  },
  {
    id: 'art_igcse_to_ial',
    slug: 'bridging-igcse-maths-to-ial-pure',
    category: 'Study Guide',
    title: 'Bridging Cambridge 0580 IGCSE Maths to Edexcel WMA11 Pure 1',
    subtitle:
      'Five algebra and coordinate geometry habits that make the jump from Year 11 to AS-Level Pure much smoother.',
    publishedLabel: 'Sep 2026',
    readMinutes: 6,
    authorUsername: 'aungkhant',
    authorName: 'Aung Khant Kyaw',
    authorRole: 'Senior Maths Tutor',
    summary:
      'Five core algebra skills including surds, completing the square, discriminant tests, and exact fraction work to sharpen before Day 1 of IAL.',
    tags: ['IGCSE 0580', 'WMA11', 'Pure Maths', 'Transition'],
    artworkTheme: 'article-maths',
    coverCode: '0580 → WMA11 PURE 1',
    coverFormula: 'Δ = b² − 4ac = 0',
    coverMetric: '5 Core Algebra Bridges',
    sections: [
      {
        id: 'algebraic-fluency',
        heading: 'Make Algebraic Manipulation Automatic',
        paragraphs: [
          'At IGCSE, completing the square or factorizing a quadratic is often the final step of a 3-mark problem. In Edexcel WMA11 Pure 1, those exact steps are line one inside a longer circle tangent, stationary point, or integration question.',
          'Spend two focused weeks practicing fractional indices, surd rationalization, and exact fraction arithmetic without leaning on decimal calculator approximations.',
        ],
      },
      {
        id: 'discriminant-geometry',
        heading: 'Link Discriminants Directly to Curve Intersections',
        paragraphs: [
          'Whenever an IAL question asks you to prove a line is tangent to a curve or misses a circle altogether, your immediate first step is substituting the linear expression into the quadratic and setting b^2 - 4ac = 0 or b^2 - 4ac < 0.',
        ],
        codeSnippet: 'Tangent condition: b^2 - 4ac = 0   |   No real intersection: b^2 - 4ac < 0',
      },
    ],
  },
  {
    id: 'art_ecosystem_vision',
    slug: 'why-we-built-ants-open-ecosystem',
    category: 'Announcement',
    title: 'Why We Separated The ANTs Showcase, Study, and Flow',
    subtitle:
      'Keeping public calculators and tutor profiles separate from student logins across the-ants.org.',
    publishedLabel: 'Nov 2026',
    readMinutes: 4,
    authorUsername: 'zaylynnhtet',
    authorName: 'Zay Lynn Htet',
    authorRole: 'Co-Founder & Design Lead',
    summary:
      'Why splitting our public organization site, IGCSE/IAL syllabus tracker, and weekly time-blocking planner keeps every page fast and uncluttered.',
    tags: ['The ANTs', 'Architecture', 'Open Access'],
    artworkTheme: 'hackathon',
    coverCode: 'THE-ANTS.ORG · ARCH',
    coverFormula: 'Showcase · Study · Flow',
    coverMetric: '100% Guest Utility · 0 Walls',
    sections: [
      {
        id: 'calm-separation',
        heading: 'Three Focused Sites Instead of One Crowded Menu',
        paragraphs: [
          'Early drafts tried to squeeze community events, syllabus trackers, focus timers, and tutor directories behind one login bar. Guests just wanting a grade boundary check ran into account screens, while students opening a timer got distracted by blog updates.',
          'By separating the-ants.org (public team showcase, activities, and Grade Calculator), study.the-ants.org (syllabus & past paper trackers), and flow.the-ants.org (timetable, tasks, and Pomodoro timer), each tool stays clean and direct.',
        ],
        callout: {
          title: 'Works without signing in',
          body: 'The Grade Calculator (/calculator) on this site and the browser Pomodoro & Timetable tools on Flow work immediately without creating an account.',
        },
      },
    ],
  },
  {
    id: 'art_physics_uncertainties',
    slug: 'cambridge-9702-paper-3-uncertainty-bench-guide',
    category: 'Study Guide',
    title: 'Cambridge 9702 AS Physics Paper 3: Uncertainty & Practical Bench Guide',
    subtitle:
      'Recording consistent significant figures, combining percentage uncertainties, and drawing worst-fit gradient lines under timed lab rotations.',
    publishedLabel: 'Oct 2026',
    readMinutes: 6,
    authorUsername: 'suyadanar',
    authorName: 'Su Yadanar',
    authorRole: 'Sciences Tutor',
    summary:
      'Master raw table precision, half-scale-division uncertainty rules, and gradient triangle conventions before stepping into the Paper 3 lab.',
    tags: ['Cambridge 9702', 'Paper 3 Lab', 'Uncertainties', 'Physics'],
    artworkTheme: 'tutoring',
    coverCode: 'CAIE 9702/33 · LAB',
    coverFormula: 'ε% = (Δx / x) × 100%',
    coverMetric: '60m Rotation · ±0.5 Div Rule',
    sections: [
      {
        id: 'raw-table-precision',
        heading: 'Match Raw Table Decimal Places to Instrument Resolution',
        paragraphs: [
          'Examiners check that every raw measurement in a column shares the exact decimal resolution of the measuring instrument: 1 mm (0.1 cm) for a metre rule, 0.01 mm for a micrometer screw gauge, and 0.1 s or 0.01 s consistently for digital stopwatches.',
          'Calculated quantities such as T^2 or 1/R must then be recorded to the same number of significant figures as the least precise raw input, or one more.',
        ],
      },
      {
        id: 'combining-uncertainties',
        heading: 'Adding Fractional & Percentage Uncertainties Cleanly',
        paragraphs: [
          'Whenever a quantity is formed by multiplication, division, or powers, add the percentage uncertainties multiplied by each exponent rather than adding absolute errors.',
        ],
        codeSnippet:
          'If g = (4 * pi^2 * L) / T^2   =>   %Uncertainty(g) = %Uncertainty(L) + 2 * %Uncertainty(T)',
        checklist: [
          'Repeat stopwatch timings over at least 10 oscillations (20T) to halve human reaction error',
          'Draw gradient triangles spanning more than half of the plotted best-fit line',
          'Label every table column header with Quantity / Unit in solidus notation (e.g., L / cm)',
        ],
      },
    ],
  },
];
