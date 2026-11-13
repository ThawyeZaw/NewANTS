export type EcosystemAppId = 'org' | 'flow' | 'study';

export type UserRole =
  | 'student'
  | 'tutor'
  | 'teacher'
  | 'contributor'
  | 'main_contributor'
  | 'admin';

export interface EcosystemAppItem {
  id: EcosystemAppId;
  name: string;
  tagline: string;
  description: string;
  domain: string;
  localUrl: string;
  prodUrl: string;
  badgeText: string;
}

export interface EcosystemQuickShortcut {
  id: string;
  label: string;
  href: string;
  appId: EcosystemAppId;
  badge: string;
}

export interface MockUserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  roles: UserRole[];
  xp: number;
  streakDays: number;
  telegramConnected: boolean;
  curriculumLabel?: string;
}

export const MOCK_ECOSYSTEM_APPS: EcosystemAppItem[] = [
  {
    id: 'org',
    name: 'The ANTs',
    tagline: 'Organization & Community Showcase',
    description: 'Mission, Tutors & Weekly Availability, Activities, Articles & Grade Calculator.',
    domain: 'the-ants.org',
    localUrl: 'http://localhost:3000',
    prodUrl: 'https://the-ants.org',
    badgeText: 'SHOWCASE',
  },
  {
    id: 'flow',
    name: 'Flow',
    tagline: 'Smart Timetable & Focus Studio',
    description: '24h Time-Blocking Calendar, P1–P4 Task Planner, Telegram Reminders & Pomodoro.',
    domain: 'flow.the-ants.org',
    localUrl: 'http://localhost:3002',
    prodUrl: 'https://flow.the-ants.org',
    badgeText: 'PRODUCTIVITY',
  },
  {
    id: 'study',
    name: 'Study',
    tagline: 'IGCSE & IAL Academic Tracker',
    description: 'Syllabus Topic Tracker, Excel Past Paper Matrix, UMS Calculator & Exam Countdowns.',
    domain: 'study.the-ants.org',
    localUrl: 'http://localhost:3001',
    prodUrl: 'https://study.the-ants.org',
    badgeText: 'ACADEMIC',
  },
];

export const MOCK_ECOSYSTEM_SHORTCUTS: EcosystemQuickShortcut[] = [
  {
    id: 'calculator',
    label: 'IGCSE & IAL Grade Calculator',
    href: '/calculator',
    appId: 'org',
    badge: 'GUEST READY',
  },
  {
    id: 'pomodoro',
    label: 'Pomodoro Focus Timer',
    href: 'http://localhost:3002/pomodoro',
    appId: 'flow',
    badge: '25:00',
  },
];

export const MOCK_AUTHENTICATED_USER: MockUserProfile = {
  id: 'usr_zyy_01',
  name: 'Zay Lynn Htet',
  username: 'zaylynnhtet',
  email: 'zay@the-ants.org',
  role: 'tutor',
  roles: ['student', 'tutor', 'contributor'],
  xp: 2840,
  streakDays: 14,
  telegramConnected: false,
  curriculumLabel: 'Pearson Edexcel IAL · WMA11',
};

export const MOCK_ADMIN_USER: MockUserProfile = {
  id: 'usr_thaw_01',
  name: 'Thaw Ye Zaw',
  username: 'thawyezaw',
  email: 'thaw@the-ants.org',
  role: 'admin',
  roles: ['admin', 'main_contributor', 'tutor'],
  xp: 5420,
  streakDays: 32,
  telegramConnected: false,
  curriculumLabel: 'Platform Admin · Full-Stack',
};

