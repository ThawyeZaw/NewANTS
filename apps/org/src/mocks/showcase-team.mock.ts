/**
 * Realistic mock fixtures for `/team` and `/team/[username]` (`[ZYY-2.2]` & `[ZYY-2.3]`).
 * Aligned with `showcase-home.mock.ts` and `@ants/ui` `TutorScheduleMap` contracts.
 */
import {
  applyTutorSchedulePreset,
  createEmptyTutorSchedule,
  type TutorScheduleMap,
} from '@ants/ui';

export type OrgMemberRoleCategory = 'founder' | 'tutor' | 'contributor' | 'alumni';

export type OrgCurriculumBoard =
  | 'Edexcel IAL'
  | 'Cambridge AS & A-Level'
  | 'Cambridge IGCSE';

export interface OrgTeamMemberMock {
  id: string;
  username: string;
  name: string;
  initials: string;
  roleCategories: OrgMemberRoleCategory[];
  /** Primary display title shown under the member's name */
  roleBadge: string;
  /** Whether the member carries a Founder gold badge on showcase cards */
  isFounder: boolean;
  /** Whether the member offers active tutoring & a weekly Sun–Sat availability grid */
  isTutor: boolean;
  headline: string;
  bio: string;
  institution: string;
  specialization: string;
  curriculums: OrgCurriculumBoard[];
  taughtSubjects: string[];
  hourlyRateLabel?: string;
  timezoneLabel: string;
  tutorTelegramUsername?: string;
  weeklySchedule: TutorScheduleMap;
  achievements: string[];
  joinedLabel: string;
}

function buildCustomTutorSchedule(
  blocks: Array<{ day: keyof TutorScheduleMap; hours: number[]; status: 'available' | 'flexible' }>
): TutorScheduleMap {
  const schedule = createEmptyTutorSchedule();
  for (const block of blocks) {
    for (const h of block.hours) {
      if (h in schedule[block.day]) {
        schedule[block.day][h] = block.status;
      }
    }
  }
  return schedule;
}

export const MOCK_ORG_TEAM_MEMBERS: OrgTeamMemberMock[] = [
  {
    id: 'mem_thaw',
    username: 'thawyezaw',
    name: 'Thaw Ye Zaw (Thorin)',
    initials: 'TZ',
    roleCategories: ['founder', 'tutor', 'contributor'],
    roleBadge: 'Founder & Lead Architect',
    isFounder: true,
    isTutor: true,
    headline: 'IAL Further Maths & Mechanics Tutor',
    bio: 'Builds The ANTs backend and teaches Edexcel IAL Pure, Further Pure, and Mechanics with an emphasis on worked derivations and method-mark habits.',
    institution: 'The ANTs Core Studio',
    specialization: 'Edexcel IAL Further Maths · Full-Stack Systems',
    curriculums: ['Edexcel IAL', 'Cambridge AS & A-Level'],
    taughtSubjects: [
      'WFM01 Further Pure 1',
      'WMA13 / WMA14 Pure',
      'WME01 / WME02 Mechanics',
      '9709 Further Mathematics',
    ],
    hourlyRateLabel: '35,000 MMK / hr',
    timezoneLabel: 'Asia/Yangon (UTC+06:30)',
    tutorTelegramUsername: '@thorin_ants',
    weeklySchedule: buildCustomTutorSchedule([
      { day: 'Tue', hours: [19, 20], status: 'available' },
      { day: 'Thu', hours: [19, 20], status: 'available' },
      { day: 'Thu', hours: [21], status: 'flexible' },
      { day: 'Sat', hours: [9, 10, 11, 14, 15], status: 'available' },
      { day: 'Sat', hours: [16], status: 'flexible' },
      { day: 'Sun', hours: [10, 11], status: 'flexible' },
    ]),
    achievements: [
      'Pearson Edexcel IAL Further Mathematics (YFM01): A*',
      'Architect of The ANTs Cloudflare HONC & WMA11-SET Rule Engine',
      'Mentored 40+ IAL Mathematics & Physics candidates across 2024–2026',
    ],
    joinedLabel: 'Founding Member · 2025',
  },
  {
    id: 'mem_zyy',
    username: 'zaylynnhtet',
    name: 'Zay Lynn Htet',
    initials: 'ZL',
    roleCategories: ['founder', 'tutor', 'contributor'],
    roleBadge: 'Co-Founder & Design Lead',
    isFounder: true,
    isTutor: true,
    headline: 'IGCSE / IAL Physics & Pure Maths Tutor',
    bio: 'Designs the interfaces across The ANTs, Study, and Flow while running structured past-paper practice groups for Cambridge 9702 Physics and Edexcel Pure units.',
    institution: 'The ANTs Studio',
    specialization: 'Cambridge 9702 Physics · Front-End Systems',
    curriculums: ['Edexcel IAL', 'Cambridge AS & A-Level', 'Cambridge IGCSE'],
    taughtSubjects: [
      'WMA11 / WMA12 Pure',
      '9702 AS & A-Level Physics',
      '0625 IGCSE Physics',
      '0580 IGCSE Maths',
    ],
    hourlyRateLabel: '25,000 MMK / hr',
    timezoneLabel: 'Asia/Yangon (UTC+06:30)',
    tutorTelegramUsername: '@zay_ants',
    weeklySchedule: applyTutorSchedulePreset('balanced-mentor'),
    achievements: [
      'Pearson Edexcel IAL Mathematics (YMA01): A*',
      'UI lead across the-ants.org, Flow, and Study',
      'Led 12+ weekend past-paper revision cohorts',
    ],
    joinedLabel: 'Co-Founder · 2025',
  },
  {
    id: 'mem_aungkhant',
    username: 'aungkhant',
    name: 'Aung Khant Kyaw',
    initials: 'AK',
    roleCategories: ['tutor'],
    roleBadge: 'Senior Maths Tutor',
    isFounder: false,
    isTutor: true,
    headline: 'Edexcel IAL Pure & Mechanics Tutor',
    bio: 'Helps Year 11 and AS students bridge the step up from IGCSE Extended Maths to modular IAL Pure and Mechanics through timed drills and error tracking.',
    institution: 'Yangon Study Group',
    specialization: 'WMA11–WMA14 · WME01–WME03',
    curriculums: ['Edexcel IAL', 'Cambridge IGCSE'],
    taughtSubjects: [
      'WMA11 Pure 1',
      'WMA12 Pure 2',
      'WME01 Mechanics 1',
      '0580 Extended Maths',
    ],
    hourlyRateLabel: '22,000 MMK / hr',
    timezoneLabel: 'Asia/Yangon (UTC+06:30)',
    tutorTelegramUsername: '@aungkhant_ants',
    weeklySchedule: buildCustomTutorSchedule([
      { day: 'Wed', hours: [18, 19, 20], status: 'available' },
      { day: 'Fri', hours: [18, 19, 20], status: 'available' },
      { day: 'Fri', hours: [21], status: 'flexible' },
      { day: 'Sun', hours: [9, 10, 11, 14, 15], status: 'available' },
      { day: 'Mon', hours: [20], status: 'flexible' },
    ]),
    achievements: [
      '600/600 UMS across Edexcel IAL Mathematics (YMA01)',
      'Lead host for The ANTs WMA11 & WMA12 Past Paper Marathon',
    ],
    joinedLabel: 'Tutor Cohort · 2025',
  },
  {
    id: 'mem_suyadanar',
    username: 'suyadanar',
    name: 'Su Yadanar',
    initials: 'SY',
    roleCategories: ['tutor', 'contributor'],
    roleBadge: 'Sciences Tutor',
    isFounder: false,
    isTutor: true,
    headline: 'Cambridge IGCSE & AS Chemistry / Biology Tutor',
    bio: 'Focuses on Cambridge Paper 3 lab practicals and Paper 5 planning questions, walking students through exact wording from recent examiner reports.',
    institution: 'The ANTs Sciences Circle',
    specialization: '9701 Chemistry · 9700 Biology · 0620 IGCSE',
    curriculums: ['Cambridge AS & A-Level', 'Cambridge IGCSE'],
    taughtSubjects: [
      '9701 AS Chemistry',
      '9700 AS Biology',
      '0620 IGCSE Chemistry',
      '0610 IGCSE Biology',
    ],
    hourlyRateLabel: '24,000 MMK / hr',
    timezoneLabel: 'Asia/Yangon (UTC+06:30)',
    tutorTelegramUsername: '@suyadanar_ants',
    weeklySchedule: buildCustomTutorSchedule([
      { day: 'Mon', hours: [18, 19], status: 'available' },
      { day: 'Wed', hours: [18, 19], status: 'flexible' },
      { day: 'Thu', hours: [18, 19, 20], status: 'available' },
      { day: 'Sat', hours: [13, 14, 15, 16], status: 'available' },
      { day: 'Sun', hours: [16, 17], status: 'flexible' },
    ]),
    achievements: [
      'Cambridge Outstanding Learner: Top in Region Chemistry',
      'Author of The ANTs Paper 5 Experimental Design Reference',
    ],
    joinedLabel: 'Tutor & Author · 2025',
  },
  {
    id: 'mem_hninwai',
    username: 'hninwai',
    name: 'Hnin Wai Lwin',
    initials: 'HW',
    roleCategories: ['contributor'],
    roleBadge: 'Syllabus Data Contributor',
    isFounder: false,
    isTutor: false,
    headline: 'Exam Boundary & Syllabus Archive Maintainer',
    bio: 'Checks historical Cambridge and Pearson Edexcel grade-boundary PDFs and verifies topic trees used by the Grade Calculator and Study Topic Tracker.',
    institution: 'Academic Data Team',
    specialization: 'Grade Boundaries · Syllabus Indexing',
    curriculums: ['Edexcel IAL', 'Cambridge AS & A-Level', 'Cambridge IGCSE'],
    taughtSubjects: ['Boundary Auditing', 'WST01–02 Statistics Notes'],
    timezoneLabel: 'Asia/Yangon (UTC+06:30)',
    weeklySchedule: createEmptyTutorSchedule(),
    achievements: [
      'Checked 1,250+ historical past paper variants and UMS conversion tables',
      'Maintains May/June 2025 and Jan 2025 calculator presets',
    ],
    joinedLabel: 'Contributor · 2025',
  },
  {
    id: 'mem_kyawzin',
    username: 'kyawzin',
    name: 'Kyaw Zin Htet',
    initials: 'KZ',
    roleCategories: ['contributor'],
    roleBadge: 'Content & Flashcard Author',
    isFounder: false,
    isTutor: false,
    headline: 'Topical Flashcard & Revision Sheet Writer',
    bio: 'Writes concise formula decks, common-mistake notes, and topic summaries for late-term IGCSE and IAL exam preparation.',
    institution: 'Study Content Team',
    specialization: 'Physics Notes · Active Recall',
    curriculums: ['Edexcel IAL', 'Cambridge IGCSE'],
    taughtSubjects: ['WPH11–12 Physics Decks', '0625 Formula Cards'],
    timezoneLabel: 'Asia/Yangon (UTC+06:30)',
    weeklySchedule: createEmptyTutorSchedule(),
    achievements: [
      'Wrote 480+ Physics and Maths revision flashcards',
      'Co-organizes Student Builders Hackathon mentoring clinics',
    ],
    joinedLabel: 'Contributor · 2026',
  },
  {
    id: 'mem_maythuzar',
    username: 'maythuzar',
    name: 'May Thu Zar',
    initials: 'MT',
    roleCategories: ['alumni'],
    roleBadge: 'Alumni Mentor',
    isFounder: false,
    isTutor: false,
    headline: 'BEng Computing Undergraduate · Former Physics Tutor',
    bio: 'Taught our early 2024 tutoring cohorts and Student Meets before starting university in London; joins seasonal sessions to answer admissions and MAT/STEP questions.',
    institution: 'Imperial College London',
    specialization: 'University Admissions · Further Mechanics',
    curriculums: ['Edexcel IAL', 'Cambridge AS & A-Level'],
    taughtSubjects: ['UCAS Personal Statements', 'MAT / STEP Prep'],
    timezoneLabel: 'Europe/London (UTC+00:00)',
    weeklySchedule: createEmptyTutorSchedule(),
    achievements: [
      '4 A* at Cambridge International A-Level (Maths, Further Maths, Physics, CS)',
      'Panel speaker at The ANTs Annual Student Meet',
    ],
    joinedLabel: 'Alumni · Cohort 2024',
  },
];

