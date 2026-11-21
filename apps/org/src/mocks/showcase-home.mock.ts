export interface OrgNavLink {
  label: string;
  href: string;
  badge?: string;
}

export interface OrgImpactStat {
  id: string;
  value: string;
  label: string;
  detail: string;
}

export interface OrgMissionPillar {
  id: string;
  code: string;
  title: string;
  description: string;
}

export interface OrgProductCardMock {
  id: 'study' | 'flow' | 'calculator';
  name: string;
  endorsement?: string;
  domainLabel: string;
  href: string;
  localHref: string;
  badge: string;
  headline: string;
  description: string;
  highlights: string[];
  ctaLabel: string;
}

export interface OrgFeaturedMemberPreview {
  username: string;
  name: string;
  roleBadge: string;
  title: string;
  specialization: string;
  availabilityLabel: string;
}

export interface OrgActivityPreview {
  slug: string;
  category: 'Tutoring' | "Student's Meet" | 'Exam Venue Visit' | 'Hackathon';
  title: string;
  dateLabel: string;
  location: string;
  summary: string;
}

export interface OrgHomeLandingMockData {
  heroBadge: string;
  heroTitle: string;
  heroHighlight: string;
  heroDescription: string;
  missionStatement: string;
  navLinks: OrgNavLink[];
  impactStats: OrgImpactStat[];
  missionPillars: OrgMissionPillar[];
  products: OrgProductCardMock[];
  featuredMembers: OrgFeaturedMemberPreview[];
  recentActivities: OrgActivityPreview[];
}

export const MOCK_ORG_NAV_LINKS: OrgNavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Team & Tutors', href: '/team' },
  { label: 'Activities', href: '/activities' },
  { label: 'Articles', href: '/articles' },
];

export const MOCK_ORG_HOME_DATA: OrgHomeLandingMockData = {
  heroBadge: 'The ANTs · Academic Network & Tutors',
  heroTitle: 'ACE With Us — open study tools, past papers and peer tutoring.',
  heroHighlight: '',
  heroDescription:
    'Check Cambridge IGCSE and Edexcel IAL grade boundaries with zero login walls, track past papers and book verified Sun–Sat tutors.',
  missionStatement:
    'Students preparing for Cambridge and Pearson Edexcel exams often spend hours digging through scattered PDFs and inconsistent mark schemes. We keep boundary calculators, syllabus checklists, and tutor schedules open in one quiet place.',
  navLinks: MOCK_ORG_NAV_LINKS,
  impactStats: [
    {
      id: 'students',
      value: '4,800+',
      label: 'Candidates using our calculators',
      detail: 'Cambridge IGCSE, AS/A-Level & Edexcel IAL',
    },
    {
      id: 'tutors',
      value: '35+',
      label: 'Tutors with live weekly hours',
      detail: 'Verified instructors listing Sun–Sat slots',
    },
    {
      id: 'papers',
      value: '1,250+',
      label: 'Paper boundary tables indexed',
      detail: 'January, May/June, and Oct/Nov series',
    },
    {
      id: 'events',
      value: '28',
      label: 'In-person meets and venue walks',
      detail: 'Revision clinics, Student Meets, and hall briefings',
    },
  ],
  missionPillars: [
    {
      id: 'pillar-mentorship',
      code: 'Tutoring',
      title: 'Direct weekly tutor schedules',
      description:
        'Check each tutor’s open Sun–Sat hours, see the exact unit codes they teach, and send a prefilled Telegram message from the schedule drawer.',
    },
    {
      id: 'pillar-tools',
      code: 'Software',
      title: 'Calculators, topic trackers, and timers',
      description:
        'Run instant raw-to-UMS conversions here on the-ants.org, track syllabus units in Study, or plan your revision week inside Flow.',
    },
    {
      id: 'pillar-community',
      code: 'Community',
      title: 'Venue briefings and Student Meets',
      description:
        'Before each exam series, mentors walk new private candidates through centre check-in routines, lab benches, and timing checkpoints.',
    },
  ],
  products: [
    {
      id: 'study',
      name: 'Study',
      endorsement: 'by The ANTs',
      domainLabel: 'study.the-ants.org',
      href: 'https://study.the-ants.org',
      localHref: 'http://localhost:3001',
      badge: 'Academic Tracker',
      headline: 'Syllabus checklists and past-paper matrices by exam board.',
      description:
        'Tracks Cambridge IGCSE, Cambridge AS/A-Level, and Pearson Edexcel IAL topics alongside historical series grade boundaries, including the 14-unit WMA11 Maths suite.',
      highlights: [
        'Topic & subtopic confidence logs',
        'Past paper series × variant matrix with UMS lookup',
        'Exam countdowns synced into Flow',
      ],
      ctaLabel: 'Open Study',
    },
    {
      id: 'flow',
      name: 'Flow',
      endorsement: 'by The ANTs',
      domainLabel: 'flow.the-ants.org',
      href: 'https://flow.the-ants.org',
      localHref: 'http://localhost:3002',
      badge: 'Daily Planner',
      headline: '24-hour weekly timetable, P1–P4 tasks, and Pomodoro timer.',
      description:
        'A straightforward time-blocking planner and Pomodoro clock that works offline in the browser, with optional Telegram reminders before scheduled blocks.',
      highlights: [
        'Week, Day, and Month drag-and-drop scheduling',
        'Priority task list with subtasks and Today Focus',
        'Standalone Pomodoro timer and focus scenes',
      ],
      ctaLabel: 'Open Flow',
    },
  ],
  featuredMembers: [
    {
      username: 'thawyezaw',
      name: 'Thaw Ye Zaw (Thorin)',
      roleBadge: 'Founder · Lead Architect',
      title: 'Platform Admin & IAL Further Maths Tutor',
      specialization: 'Edexcel Further Pure & Mechanics',
      availabilityLabel: 'Tue · Thu · Sat',
    },
    {
      username: 'zaylynnhtet',
      name: 'Zay Lynn Htet',
      roleBadge: 'Co-Founder · Design Lead',
      title: 'UI Systems & IGCSE / IAL Physics Tutor',
      specialization: '9702 Physics & Pure Maths',
      availabilityLabel: 'Mon · Wed · Sat',
    },
    {
      username: 'aungkhant',
      name: 'Aung Khant Kyaw',
      roleBadge: 'Senior Tutor',
      title: 'Pearson Edexcel Pure & Mechanics',
      specialization: 'WMA11–WMA14 · WME01–WME03',
      availabilityLabel: 'Wed · Fri · Sun',
    },
  ],
  recentActivities: [
    {
      slug: 'edtech-students-hackathon-2026',
      category: 'Hackathon',
      title: 'EdTech Students Hackathon 2026',
      dateLabel: 'Nov 23 – Dec 6, 2026',
      location: 'Hinthar International School & Online',
      summary:
        'A 2-week hybrid launchpad where student builders aged 14–20 build working AI prototypes. Free entry with workshops, campus catering, and certificates.',
    },
    {
      slug: 'oct-nov-exam-venue-visit-2025',
      category: 'Exam Venue Visit',
      title: 'Pre-Session Exam Venue Walkthrough & Candidate Briefing',
      dateLabel: 'Oct 2025',
      location: 'British Council & Partner Centres',
      summary:
        'Walked first-time private candidates through gate arrival windows, calculator checks, and lab seating prior to the October papers.',
    },
    {
      slug: 'ial-modular-maths-intensive-tutoring',
      category: 'Tutoring',
      title: 'Edexcel WMA11 & WMA12 Past Paper Marathon',
      dateLabel: 'Sep 2025',
      location: 'Hybrid Study Room',
      summary:
        'Timed runs through six past series of Pure 1 and Pure 2 with line-by-line mark scheme review and UMS target planning.',
    },
    {
      slug: 'annual-ants-students-meet-2025',
      category: "Student's Meet",
      title: "The ANTs Annual Student's Meet & Subject Panels",
      dateLabel: 'Aug 2025',
      location: 'Yangon Study Hall',
      summary:
        'An afternoon gathering with 185 students, peer tutors, and alumni covering AS subject choices, university applications, and live Study demos.',
    },
  ],
};

