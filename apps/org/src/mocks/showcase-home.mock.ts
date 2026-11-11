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

export interface OrgHackathonSpotlightMock {
  badge: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  locationLabel: string;
  participantCount: string;
  prizePoolLabel: string;
  tracks: string[];
  externalWebsiteUrl: string;
  showcaseRoute: string;
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
  category: 'Tutoring' | "Student's Meet" | 'Exam Venue Visit';
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
  hackathon: OrgHackathonSpotlightMock;
  featuredMembers: OrgFeaturedMemberPreview[];
  recentActivities: OrgActivityPreview[];
}

export const MOCK_ORG_NAV_LINKS: OrgNavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Team & Tutors', href: '/team' },
  { label: 'Activities', href: '/activities' },
  { label: 'Articles', href: '/articles' },
  { label: 'Hackathon', href: '/hackathon', badge: 'SPOTLIGHT' },
];

export const MOCK_ORG_HOME_DATA: OrgHomeLandingMockData = {
  heroBadge: 'THE ANTS · ACADEMIC NETWORK & TUTORS',
  heroTitle: 'Rigorous Scholarship Meets',
  heroHighlight: 'Communal Momentum.',
  heroDescription:
    'The ANTs is a student-and-educator-led academic organization building open-access IGCSE & IAL study ecosystems, peer tutoring networks, community meetups, and student hackathons.',
  missionStatement:
    'We believe every ambitious IGCSE and A-Level student deserves structured syllabus clarity, transparent grade calculation tools, and accessible mentorship—without paywalls or academic clutter.',
  navLinks: MOCK_ORG_NAV_LINKS,
  impactStats: [
    {
      id: 'students',
      value: '4,800+',
      label: 'Students Reached',
      detail: 'Across Cambridge IGCSE, AS/A-Level & Pearson Edexcel IAL',
    },
    {
      id: 'tutors',
      value: '35+',
      label: 'Verified Tutors & Mentors',
      detail: 'A* achievers & university scholars with live weekly schedules',
    },
    {
      id: 'papers',
      value: '1,250+',
      label: 'Indexed Past Papers & Boundaries',
      detail: 'Real-time UMS & raw mark conversion matrices',
    },
    {
      id: 'events',
      value: '28',
      label: 'Community Activities & Meets',
      detail: 'Peer tutoring cohorts, Student Meets & Exam Venue Visits',
    },
  ],
  missionPillars: [
    {
      id: 'pillar-mentorship',
      code: 'PILLAR 01',
      title: 'Peer & Expert Academic Tutoring',
      description:
        'Connect directly with verified IGCSE and IAL tutors. Inspect live Sun–Sat availability grids, subject specializations, and inquire in one click via Telegram.',
    },
    {
      id: 'pillar-tools',
      code: 'PILLAR 02',
      title: 'Purpose-Built Study & Focus Software',
      description:
        'From our modular Edexcel UMS Grade Calculator to Study (Topic & Past Paper Tracker) and Flow (24h Smart Timetable & Pomodoro), our tools are crafted for deep focus.',
    },
    {
      id: 'pillar-community',
      code: 'PILLAR 03',
      title: 'Student Meetups, Venue Visits & Hackathons',
      description:
        'We guide students beyond the textbook—hosting pre-exam venue walkthroughs, collaborative study meets, and flagship student engineering hackathons.',
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
      badge: 'IGCSE & IAL ACADEMIC HUB',
      headline: 'Master Every Syllabus Topic & Past Paper Variant.',
      description:
        'Built specifically for Cambridge IGCSE, AS/A-Level, and Pearson Edexcel IAL students—including full support for the 14-unit Edexcel Modular Maths Suite (WMA11).',
      highlights: [
        'Interactive Syllabus Topic Tracker with confidence pills & notes',
        'Excel-style Past Paper Variant × Series Matrix with auto UMS derivation',
        'Live Exam Countdowns synced directly to your Flow calendar',
        'Spaced-Repetition Flashcards, Topical Quizzes & Scholar XP Leaderboard',
      ],
      ctaLabel: 'Launch Study Tracker',
    },
    {
      id: 'flow',
      name: 'Flow',
      endorsement: 'by The ANTs',
      domainLabel: 'flow.the-ants.org',
      href: 'https://flow.the-ants.org',
      localHref: 'http://localhost:3002',
      badge: 'SLEEK PRODUCTIVITY STUDIO',
      headline: 'Time-Block Your Week, Crush P1–P4 Tasks & Stay Focused.',
      description:
        'A tactile TickTick-inspired productivity workspace designed for students and everyday planners who want structure without distraction.',
      highlights: [
        'Interactive Day, Week (24h grid) & Month Smart Timetable',
        'Priority Task Planner (P1–P4) with subtasks & Today Focus side panel',
        'Guest-accessible Pomodoro Timer with Amber progress arc & D1 sync',
        'Automated 5-minute Telegram Bot reminders for classes & deadlines',
      ],
      ctaLabel: 'Open Flow Workspace',
    },
  ],
  hackathon: {
    badge: 'FLAGSHIP INITIATIVE · HACKATHON SHOWCASE',
    title: 'The ANTs Student Builders Hackathon 2026',
    subtitle:
      '48 hours of rapid prototyping, mentorship, and live demos where secondary and university builders ship real tools for education, productivity, and community impact.',
    dateLabel: 'NOV 2026 · 48H SPRINT',
    locationLabel: 'Hybrid · Yangon & Global Discord',
    participantCount: '320+ Builders',
    prizePoolLabel: 'Awards, Cloud Credits & Mentorship',
    tracks: [
      'EdTech & AI Tutors',
      'Student Productivity',
      'Open Community Tools',
      'First-Time Builders Track',
    ],
    externalWebsiteUrl: 'https://hackathon.the-ants.org',
    showcaseRoute: '/hackathon',
  },
  featuredMembers: [
    {
      username: 'thawyezaw',
      name: 'Thaw Ye Zaw (Thorin)',
      roleBadge: 'Founder & Lead Architect',
      title: 'Platform Admin & IAL Mathematics / Physics Mentor',
      specialization: 'Edexcel IAL Further Maths · Full-Stack Systems',
      availabilityLabel: 'Available Tue · Thu · Sat',
    },
    {
      username: 'zyylinnhtet',
      name: 'Zyy Linn Htet',
      roleBadge: 'Co-Founder & Design Lead',
      title: 'UI Architecture & IGCSE / IAL Sciences Tutor',
      specialization: 'Cambridge 9702 Physics · Design Systems',
      availabilityLabel: 'Available Mon · Wed · Sat',
    },
    {
      username: 'aungkhant',
      name: 'Aung Khant Kyaw',
      roleBadge: 'Verified Senior Tutor',
      title: 'Pearson Edexcel IAL Pure & Mechanics Specialist',
      specialization: 'WMA11–WMA14 · WME01–WME03',
      availabilityLabel: 'Available Wed · Fri · Sun',
    },
  ],
  recentActivities: [
    {
      slug: 'oct-nov-exam-venue-visit-2025',
      category: 'Exam Venue Visit',
      title: 'Pre-Session Exam Venue Walkthrough & Candidate Briefing',
      dateLabel: 'OCT 2025',
      location: 'British Council & Partner Centres',
      summary:
        'Guided first-time IGCSE and IAL candidates through check-in protocols, lab seating, and calm exam-day routines.',
    },
    {
      slug: 'ial-modular-maths-intensive-tutoring',
      category: 'Tutoring',
      title: 'Edexcel WMA11 & WMA12 Past Paper Marathon Cohort',
      dateLabel: 'SEP 2025',
      location: 'Live Online & Hybrid Studio',
      summary:
        'Solved 6 full series of P1 and P2 papers live with step-by-step mark scheme breakdowns and UMS target tracking.',
    },
    {
      slug: 'annual-ants-students-meet-2025',
      category: "Student's Meet",
      title: "The ANTs Annual Scholars & Alumni Student's Meet",
      dateLabel: 'AUG 2025',
      location: 'Community Hall',
      summary:
        'Over 180 students, alumni, and tutors gathered for university application panels, subject study circles, and Q&A.',
    },
  ],
};

