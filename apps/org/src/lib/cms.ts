/**
 * Pure CMS state model, CRUD helpers, JSON import/export, and defensive `localStorage`
 * synchronization for `apps/org` (`/cms` Content Studio -> `/`, `/team`, `/activities`, `/articles`).
 *
 * Zero `@ants/db`, server actions, or Next.js router dependencies so both Zay's pure `*View.tsx`
 * prototypes and Vitest tests run deterministically.
 */
import {
  createEmptyTutorSchedule,
  type TutorScheduleMap,
  type WeekdayKey,
} from '@ants/ui';
import {
  MOCK_ORG_ACTIVITIES,
  MOCK_ORG_ARTICLES,
  type OrgActivityCategory,
  type OrgActivityMock,
  type OrgArticleCategory,
  type OrgArticleMock,
  type OrgArtworkTheme,
} from '../mocks/showcase-content.mock';
import {
  MOCK_ORG_HOME_DATA,
  type OrgActivityPreview,
  type OrgFeaturedMemberPreview,
  type OrgHomeLandingMockData,
} from '../mocks/showcase-home.mock';
import {
  MOCK_ORG_TEAM_MEMBERS,
  type OrgCurriculumBoard,
  type OrgMemberRoleCategory,
  type OrgTeamMemberMock,
} from '../mocks/showcase-team.mock';

export const ORG_CMS_STORAGE_KEY = 'ants-org-cms-v1';
export const ORG_CMS_CHANGE_EVENT = 'ants-org-cms-change';

export type OrgCmsSectionId = 'home' | 'team' | 'activities' | 'articles';

export interface OrgCmsState {
  version: 1;
  updatedAt: string;
  home: OrgHomeLandingMockData;
  team: OrgTeamMemberMock[];
  activities: OrgActivityMock[];
  articles: OrgArticleMock[];
}

export interface OrgCmsStorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export type OrgCmsImportResult =
  | { ok: true; state: OrgCmsState }
  | { ok: false; error: string };

export interface OrgLocalMediaAsset {
  src: string;
  label: string;
  defaultAlt: string;
  artworkTheme: OrgArtworkTheme;
}

export const ORG_LOCAL_MEDIA_ASSETS: OrgLocalMediaAsset[] = [
  {
    src: '/images/org/tutoring-session.jpg',
    label: 'Tutoring Session',
    defaultAlt:
      'Tutor pointing to an integration problem on a dark classroom chalkboard while a student takes notes over an open workbook.',
    artworkTheme: 'tutoring',
  },
  {
    src: '/images/org/students-meet.jpg',
    label: "Student's Meet",
    defaultAlt:
      'Group of students and mentors seated around wooden tables with open notebooks, laptops, and printed worksheets near sunlit windows.',
    artworkTheme: 'meetup',
  },
  {
    src: '/images/org/exam-venue.jpg',
    label: 'Exam Venue Walkthrough',
    defaultAlt:
      'Sunlit terrazzo school corridor outside an examination classroom with check-in clipboards and clear pencil cases on a table.',
    artworkTheme: 'venue',
  },
  {
    src: '/images/org/science-lab.jpg',
    label: 'Science Practical Lab',
    defaultAlt:
      'School science bench with wooden stand, analog voltmeter and ammeter circuit, stopwatch, brass weights, and open graph lab book.',
    artworkTheme: 'tutoring',
  },
  {
    src: '/images/org/hackathon-table.jpg',
    label: 'Hackathon Sprint Table',
    defaultAlt:
      'Warm brass desk lamp over laptops, hand-drawn paper wireframes, and sticky notes arranged on a team hackathon table.',
    artworkTheme: 'hackathon',
  },
  {
    src: '/images/org/study-desk-notes.jpg',
    label: 'Study Desk Notes',
    defaultAlt:
      'Clean mechanics incline plane force diagram drawn on grid paper with ruler, eraser, and mechanical pencil.',
    artworkTheme: 'article-maths',
  },
];

const VALID_WEEKDAYS: readonly WeekdayKey[] = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];

const VALID_ROLE_CATEGORIES: readonly OrgMemberRoleCategory[] = [
  'founder',
  'tutor',
  'contributor',
  'alumni',
];

const VALID_CURRICULUMS: readonly OrgCurriculumBoard[] = [
  'Edexcel IAL',
  'Cambridge AS & A-Level',
  'Cambridge IGCSE',
];

const VALID_ACTIVITY_CATEGORIES: readonly OrgActivityCategory[] = [
  'Tutoring',
  "Student's Meet",
  'Exam Venue Visit',
  'Hackathon',
];

const VALID_ARTICLE_CATEGORIES: readonly OrgArticleCategory[] = [
  'Study Guide',
  'Exam Strategy',
  'Productivity',
  'Announcement',
];

const VALID_ARTWORK_THEMES: readonly OrgArtworkTheme[] = [
  'tutoring',
  'meetup',
  'venue',
  'hackathon',
  'article-ums',
  'article-focus',
  'article-maths',
];

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createDefaultOrgCmsState(
  updatedAt = new Date().toISOString()
): OrgCmsState {
  return {
    version: 1,
    updatedAt,
    home: cloneJson(MOCK_ORG_HOME_DATA),
    team: cloneJson(MOCK_ORG_TEAM_MEMBERS),
    activities: cloneJson(MOCK_ORG_ACTIVITIES),
    articles: cloneJson(MOCK_ORG_ARTICLES),
  };
}

export function slugifyCmsText(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'untitled-entry';
}

export function ensureUniqueSlug(
  desiredSlug: string,
  existingSlugs: readonly string[],
  ignoreSlug?: string
): string {
  const base = slugifyCmsText(desiredSlug);
  const used = new Set(
    existingSlugs
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && s !== ignoreSlug?.trim().toLowerCase())
  );
  if (!used.has(base)) return base;
  let counter = 2;
  while (used.has(`${base}-${counter}`)) {
    counter += 1;
  }
  return `${base}-${counter}`;
}

export function normalizeUsernameInput(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
}

export function ensureUniqueUsername(
  desiredUsername: string,
  existingUsernames: readonly string[],
  ignoreUsername?: string
): string {
  const base = normalizeUsernameInput(desiredUsername) || 'member';
  const used = new Set(
    existingUsernames
      .map((u) => u.trim().toLowerCase())
      .filter((u) => u && u !== ignoreUsername?.trim().toLowerCase())
  );
  if (!used.has(base)) return base;
  let counter = 2;
  while (used.has(`${base}${counter}`)) {
    counter += 1;
  }
  return `${base}${counter}`;
}

export function deriveInitials(name: string): string {
  const cleaned = name.replace(/\(.*?\)/g, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AN';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

export function formatAvailabilityDaysLabel(schedule: TutorScheduleMap): string {
  const activeDays = VALID_WEEKDAYS.filter((day) => {
    const daySlots = schedule[day];
    if (!daySlots) return false;
    return Object.values(daySlots).some(
      (status) => status === 'available' || status === 'flexible'
    );
  });
  return activeDays.length > 0 ? activeDays.join(' · ') : 'By request';
}

export function estimateArticleReadMinutes(article: Pick<OrgArticleMock, 'title' | 'subtitle' | 'summary' | 'sections'>): number {
  const words = [
    article.title,
    article.subtitle,
    article.summary,
    ...article.sections.flatMap((sec) => [
      sec.heading,
      ...sec.paragraphs,
      sec.callout?.title ?? '',
      sec.callout?.body ?? '',
      ...(sec.checklist ?? []),
    ]),
  ]
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(2, Math.round(words / 180));
}

function sanitizeTutorScheduleMap(raw: unknown): TutorScheduleMap {
  const fallback = createEmptyTutorSchedule();
  if (!raw || typeof raw !== 'object') return fallback;
  const record = raw as Record<string, unknown>;

  for (const day of VALID_WEEKDAYS) {
    const rawDay = record[day];
    if (!rawDay || typeof rawDay !== 'object') continue;
    const dayObj = rawDay as Record<string, unknown>;
    for (const hourKey of Object.keys(fallback[day])) {
      const hourNum = Number(hourKey);
      const val = dayObj[hourKey];
      if (val === 'available' || val === 'flexible' || val === 'unavailable') {
        fallback[day][hourNum] = val;
      }
    }
  }
  return fallback;
}

function sanitizeStringArray(raw: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(raw)) return [...fallback];
  return raw
    .map((item) => (typeof item === 'string' ? item : String(item ?? '')))
    .filter((item) => item.trim().length > 0);
}

function sanitizeHomeData(raw: unknown): OrgHomeLandingMockData {
  const defaults = cloneJson(MOCK_ORG_HOME_DATA);
  if (!raw || typeof raw !== 'object') return defaults;
  const obj = raw as Record<string, unknown>;

  return {
    heroBadge:
      typeof obj.heroBadge === 'string' ? obj.heroBadge : defaults.heroBadge,
    heroTitle:
      typeof obj.heroTitle === 'string' && obj.heroTitle.trim()
        ? obj.heroTitle
        : defaults.heroTitle,
    heroHighlight:
      typeof obj.heroHighlight === 'string'
        ? obj.heroHighlight
        : defaults.heroHighlight,
    heroDescription:
      typeof obj.heroDescription === 'string'
        ? obj.heroDescription
        : defaults.heroDescription,
    missionStatement:
      typeof obj.missionStatement === 'string'
        ? obj.missionStatement
        : defaults.missionStatement,
    navLinks: defaults.navLinks,
    impactStats: Array.isArray(obj.impactStats)
      ? obj.impactStats
          .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
          .map((s, idx) => ({
            id: typeof s.id === 'string' && s.id ? s.id : `stat_${idx + 1}`,
            value: typeof s.value === 'string' ? s.value : '0',
            label: typeof s.label === 'string' ? s.label : 'Metric',
            detail: typeof s.detail === 'string' ? s.detail : '',
          }))
      : defaults.impactStats,
    missionPillars: Array.isArray(obj.missionPillars)
      ? obj.missionPillars
          .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === 'object'))
          .map((p, idx) => ({
            id: typeof p.id === 'string' && p.id ? p.id : `pillar_${idx + 1}`,
            code: typeof p.code === 'string' ? p.code : 'Pillar',
            title: typeof p.title === 'string' ? p.title : 'Untitled Pillar',
            description:
              typeof p.description === 'string' ? p.description : '',
          }))
      : defaults.missionPillars,
    products: Array.isArray(obj.products) && obj.products.length > 0
      ? obj.products
          .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === 'object'))
          .map((p, idx) => {
            const fallbackProduct = defaults.products[idx] ?? defaults.products[0]!;
            const id =
              p.id === 'study' || p.id === 'flow' || p.id === 'calculator'
                ? p.id
                : fallbackProduct.id;
            return {
              id,
              name: typeof p.name === 'string' ? p.name : fallbackProduct.name,
              endorsement:
                typeof p.endorsement === 'string'
                  ? p.endorsement
                  : fallbackProduct.endorsement,
              domainLabel:
                typeof p.domainLabel === 'string'
                  ? p.domainLabel
                  : fallbackProduct.domainLabel,
              href: typeof p.href === 'string' ? p.href : fallbackProduct.href,
              localHref:
                typeof p.localHref === 'string'
                  ? p.localHref
                  : fallbackProduct.localHref,
              badge: typeof p.badge === 'string' ? p.badge : fallbackProduct.badge,
              headline:
                typeof p.headline === 'string'
                  ? p.headline
                  : fallbackProduct.headline,
              description:
                typeof p.description === 'string'
                  ? p.description
                  : fallbackProduct.description,
              highlights: Array.isArray(p.highlights)
                ? sanitizeStringArray(p.highlights, fallbackProduct.highlights)
                : fallbackProduct.highlights,
              ctaLabel:
                typeof p.ctaLabel === 'string'
                  ? p.ctaLabel
                  : fallbackProduct.ctaLabel,
            };
          })
      : defaults.products,
    featuredMembers: Array.isArray(obj.featuredMembers) && obj.featuredMembers.length > 0
      ? obj.featuredMembers
          .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === 'object'))
          .map((m) => ({
            username:
              typeof m.username === 'string' && m.username.trim()
                ? normalizeUsernameInput(m.username)
                : 'member',
            name: typeof m.name === 'string' ? m.name : 'Team Member',
            roleBadge:
              typeof m.roleBadge === 'string' ? m.roleBadge : 'Contributor',
            title: typeof m.title === 'string' ? m.title : '',
            specialization:
              typeof m.specialization === 'string' ? m.specialization : '',
            availabilityLabel:
              typeof m.availabilityLabel === 'string'
                ? m.availabilityLabel
                : 'By request',
          }))
      : defaults.featuredMembers,
    recentActivities: Array.isArray(obj.recentActivities)
      ? obj.recentActivities
          .filter((a): a is Record<string, unknown> => Boolean(a && typeof a === 'object'))
          .map((a) => ({
            slug:
              typeof a.slug === 'string' && a.slug.trim()
                ? slugifyCmsText(a.slug)
                : 'activity',
            category: VALID_ACTIVITY_CATEGORIES.includes(
              a.category as OrgActivityCategory
            )
              ? (a.category as OrgActivityCategory)
              : 'Tutoring',
            title: typeof a.title === 'string' ? a.title : 'Untitled Activity',
            dateLabel: typeof a.dateLabel === 'string' ? a.dateLabel : '',
            location: typeof a.location === 'string' ? a.location : '',
            summary: typeof a.summary === 'string' ? a.summary : '',
          }))
      : defaults.recentActivities,
  };
}

function sanitizeTeamMember(raw: unknown, idx: number): OrgTeamMemberMock | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const name =
    typeof obj.name === 'string' && obj.name.trim()
      ? obj.name.trim()
      : `Team Member ${idx + 1}`;
  const username =
    typeof obj.username === 'string' && obj.username.trim()
      ? normalizeUsernameInput(obj.username)
      : `member_${idx + 1}`;
  const rawRoles = Array.isArray(obj.roleCategories)
    ? obj.roleCategories.filter((r): r is OrgMemberRoleCategory =>
        VALID_ROLE_CATEGORIES.includes(r as OrgMemberRoleCategory)
      )
    : [];
  const roleCategories: OrgMemberRoleCategory[] =
    rawRoles.length > 0 ? rawRoles : ['contributor'];

  const curriculums = Array.isArray(obj.curriculums)
    ? obj.curriculums.filter((c): c is OrgCurriculumBoard =>
        VALID_CURRICULUMS.includes(c as OrgCurriculumBoard)
      )
    : [];

  return {
    id: typeof obj.id === 'string' && obj.id ? obj.id : `mem_${username}`,
    username,
    name,
    initials:
      typeof obj.initials === 'string' && obj.initials.trim()
        ? obj.initials.trim().slice(0, 3).toUpperCase()
        : deriveInitials(name),
    roleCategories,
    roleBadge:
      typeof obj.roleBadge === 'string' && obj.roleBadge.trim()
        ? obj.roleBadge
        : 'Contributor',
    isFounder:
      typeof obj.isFounder === 'boolean'
        ? obj.isFounder
        : roleCategories.includes('founder'),
    isTutor:
      typeof obj.isTutor === 'boolean'
        ? obj.isTutor
        : roleCategories.includes('tutor'),
    headline: typeof obj.headline === 'string' ? obj.headline : '',
    bio: typeof obj.bio === 'string' ? obj.bio : '',
    institution:
      typeof obj.institution === 'string' ? obj.institution : 'The ANTs',
    specialization:
      typeof obj.specialization === 'string' ? obj.specialization : '',
    curriculums,
    taughtSubjects: sanitizeStringArray(obj.taughtSubjects),
    hourlyRateLabel:
      typeof obj.hourlyRateLabel === 'string' && obj.hourlyRateLabel.trim()
        ? obj.hourlyRateLabel
        : undefined,
    timezoneLabel:
      typeof obj.timezoneLabel === 'string' && obj.timezoneLabel.trim()
        ? obj.timezoneLabel
        : 'Asia/Yangon (UTC+06:30)',
    tutorTelegramUsername:
      typeof obj.tutorTelegramUsername === 'string' &&
      obj.tutorTelegramUsername.trim()
        ? obj.tutorTelegramUsername.trim().startsWith('@')
          ? obj.tutorTelegramUsername.trim()
          : `@${obj.tutorTelegramUsername.trim()}`
        : undefined,
    weeklySchedule: sanitizeTutorScheduleMap(obj.weeklySchedule),
    achievements: sanitizeStringArray(obj.achievements),
    joinedLabel:
      typeof obj.joinedLabel === 'string' && obj.joinedLabel.trim()
        ? obj.joinedLabel
        : 'Member · 2026',
  };
}

function sanitizeActivity(raw: unknown, idx: number): OrgActivityMock | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const title =
    typeof obj.title === 'string' && obj.title.trim()
      ? obj.title.trim()
      : `Community Activity ${idx + 1}`;
  const slug =
    typeof obj.slug === 'string' && obj.slug.trim()
      ? slugifyCmsText(obj.slug)
      : slugifyCmsText(title);
  const category = VALID_ACTIVITY_CATEGORIES.includes(
    obj.category as OrgActivityCategory
  )
    ? (obj.category as OrgActivityCategory)
    : 'Tutoring';
  const artworkTheme = VALID_ARTWORK_THEMES.includes(
    obj.artworkTheme as OrgArtworkTheme
  )
    ? (obj.artworkTheme as OrgArtworkTheme)
    : 'tutoring';
  const defaultAsset = ORG_LOCAL_MEDIA_ASSETS[0]!;

  const gallery = Array.isArray(obj.gallery)
    ? obj.gallery
        .filter((g): g is Record<string, unknown> => Boolean(g && typeof g === 'object'))
        .map((g, gIdx) => ({
          id: typeof g.id === 'string' && g.id ? g.id : `gal_${idx}_${gIdx + 1}`,
          imageSrc:
            typeof g.imageSrc === 'string' && g.imageSrc.trim()
              ? g.imageSrc.trim()
              : defaultAsset.src,
          imageAlt:
            typeof g.imageAlt === 'string' && g.imageAlt.trim()
              ? g.imageAlt.trim()
              : defaultAsset.defaultAlt,
          caption: typeof g.caption === 'string' ? g.caption : '',
          locationTag:
            typeof g.locationTag === 'string' ? g.locationTag : 'Study Room',
          shotLabel: typeof g.shotLabel === 'string' ? g.shotLabel : 'Photo',
          artworkTheme: VALID_ARTWORK_THEMES.includes(
            g.artworkTheme as OrgArtworkTheme
          )
            ? (g.artworkTheme as OrgArtworkTheme)
            : artworkTheme,
        }))
    : [];

  const externalLinks = Array.isArray(obj.externalLinks)
    ? obj.externalLinks
        .filter((e): e is Record<string, unknown> => Boolean(e && typeof e === 'object'))
        .filter((e) => typeof e.label === 'string' && typeof e.href === 'string')
        .map((e) => ({
          label: String(e.label),
          href: String(e.href),
          variant:
            e.variant === 'secondary'
              ? ('secondary' as const)
              : ('primary' as const),
        }))
    : undefined;

  const schedulePhases = Array.isArray(obj.schedulePhases)
    ? obj.schedulePhases
        .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === 'object'))
        .map((p) => ({
          window: typeof p.window === 'string' ? p.window : '',
          phase: typeof p.phase === 'string' ? p.phase : '',
          mode: typeof p.mode === 'string' ? p.mode : '',
          summary: typeof p.summary === 'string' ? p.summary : '',
        }))
    : undefined;

  return {
    id: typeof obj.id === 'string' && obj.id ? obj.id : `act_${slug}`,
    slug,
    category,
    isUpcoming: Boolean(obj.isUpcoming),
    title,
    dateLabel: typeof obj.dateLabel === 'string' ? obj.dateLabel : '2026',
    location:
      typeof obj.location === 'string' ? obj.location : 'Yangon & Online',
    attendanceLabel:
      typeof obj.attendanceLabel === 'string' ? obj.attendanceLabel : 'Open',
    facilitators: sanitizeStringArray(obj.facilitators, ['The ANTs']),
    summary: typeof obj.summary === 'string' ? obj.summary : '',
    recapParagraphs: sanitizeStringArray(obj.recapParagraphs),
    highlights: sanitizeStringArray(obj.highlights),
    externalLinks:
      externalLinks && externalLinks.length > 0 ? externalLinks : undefined,
    schedulePhases:
      schedulePhases && schedulePhases.length > 0 ? schedulePhases : undefined,
    coverImageSrc:
      typeof obj.coverImageSrc === 'string' && obj.coverImageSrc.trim()
        ? obj.coverImageSrc.trim()
        : defaultAsset.src,
    coverAlt:
      typeof obj.coverAlt === 'string' && obj.coverAlt.trim()
        ? obj.coverAlt.trim()
        : defaultAsset.defaultAlt,
    artworkTheme,
    gallery,
  };
}

function sanitizeArticle(raw: unknown, idx: number): OrgArticleMock | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const title =
    typeof obj.title === 'string' && obj.title.trim()
      ? obj.title.trim()
      : `Untitled Article ${idx + 1}`;
  const slug =
    typeof obj.slug === 'string' && obj.slug.trim()
      ? slugifyCmsText(obj.slug)
      : slugifyCmsText(title);
  const category = VALID_ARTICLE_CATEGORIES.includes(
    obj.category as OrgArticleCategory
  )
    ? (obj.category as OrgArticleCategory)
    : 'Study Guide';
  const artworkTheme = VALID_ARTWORK_THEMES.includes(
    obj.artworkTheme as OrgArtworkTheme
  )
    ? (obj.artworkTheme as OrgArtworkTheme)
    : 'article-ums';

  const sections = Array.isArray(obj.sections)
    ? obj.sections
        .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
        .map((s, sIdx) => {
          const heading =
            typeof s.heading === 'string' && s.heading.trim()
              ? s.heading.trim()
              : `Section ${sIdx + 1}`;
          const rawCallout =
            s.callout && typeof s.callout === 'object'
              ? (s.callout as Record<string, unknown>)
              : null;
          const callout =
            rawCallout &&
            (typeof rawCallout.title === 'string' ||
              typeof rawCallout.body === 'string')
              ? {
                  title:
                    typeof rawCallout.title === 'string'
                      ? rawCallout.title
                      : 'Note',
                  body:
                    typeof rawCallout.body === 'string' ? rawCallout.body : '',
                }
              : undefined;
          const checklist = sanitizeStringArray(s.checklist);

          return {
            id:
              typeof s.id === 'string' && s.id
                ? slugifyCmsText(s.id)
                : slugifyCmsText(heading),
            heading,
            paragraphs: sanitizeStringArray(s.paragraphs),
            callout:
              callout && (callout.title.trim() || callout.body.trim())
                ? callout
                : undefined,
            codeSnippet:
              typeof s.codeSnippet === 'string' && s.codeSnippet.trim()
                ? s.codeSnippet
                : undefined,
            checklist: checklist.length > 0 ? checklist : undefined,
          };
        })
    : [];

  return {
    id: typeof obj.id === 'string' && obj.id ? obj.id : `art_${slug}`,
    slug,
    category,
    title,
    subtitle: typeof obj.subtitle === 'string' ? obj.subtitle : '',
    publishedLabel:
      typeof obj.publishedLabel === 'string' && obj.publishedLabel.trim()
        ? obj.publishedLabel
        : 'Nov 2026',
    readMinutes:
      typeof obj.readMinutes === 'number' && Number.isFinite(obj.readMinutes)
        ? Math.max(1, Math.round(obj.readMinutes))
        : 5,
    authorUsername:
      typeof obj.authorUsername === 'string' && obj.authorUsername.trim()
        ? normalizeUsernameInput(obj.authorUsername)
        : 'thawyezaw',
    authorName:
      typeof obj.authorName === 'string' && obj.authorName.trim()
        ? obj.authorName
        : 'The ANTs Team',
    authorRole:
      typeof obj.authorRole === 'string' && obj.authorRole.trim()
        ? obj.authorRole
        : 'Contributor',
    summary: typeof obj.summary === 'string' ? obj.summary : '',
    tags: sanitizeStringArray(obj.tags),
    artworkTheme,
    coverCode:
      typeof obj.coverCode === 'string' && obj.coverCode.trim()
        ? obj.coverCode
        : undefined,
    coverFormula:
      typeof obj.coverFormula === 'string' && obj.coverFormula.trim()
        ? obj.coverFormula
        : undefined,
    coverMetric:
      typeof obj.coverMetric === 'string' && obj.coverMetric.trim()
        ? obj.coverMetric
        : undefined,
    sections:
      sections.length > 0
        ? sections
        : [
            {
              id: 'overview',
              heading: 'Overview',
              paragraphs: ['Add your article content here.'],
            },
          ],
  };
}

export function sanitizeOrgCmsState(raw: unknown): OrgCmsState {
  const defaults = createDefaultOrgCmsState();
  if (!raw || typeof raw !== 'object') return defaults;
  const obj = raw as Record<string, unknown>;

  const team = Array.isArray(obj.team)
    ? obj.team
        .map((item, idx) => sanitizeTeamMember(item, idx))
        .filter((item): item is OrgTeamMemberMock => item !== null)
    : defaults.team;

  const activities = Array.isArray(obj.activities)
    ? obj.activities
        .map((item, idx) => sanitizeActivity(item, idx))
        .filter((item): item is OrgActivityMock => item !== null)
    : defaults.activities;

  const articles = Array.isArray(obj.articles)
    ? obj.articles
        .map((item, idx) => sanitizeArticle(item, idx))
        .filter((item): item is OrgArticleMock => item !== null)
    : defaults.articles;

  return {
    version: 1,
    updatedAt:
      typeof obj.updatedAt === 'string' && obj.updatedAt
        ? obj.updatedAt
        : defaults.updatedAt,
    home: sanitizeHomeData(obj.home),
    team: team.length > 0 ? team : defaults.team,
    activities,
    articles,
  };
}

function resolveBrowserStorage(): OrgCmsStorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadOrgCmsState(storage?: OrgCmsStorageLike | null): OrgCmsState {
  const target = storage === undefined ? resolveBrowserStorage() : storage;
  if (!target) return createDefaultOrgCmsState();
  try {
    const raw = target.getItem(ORG_CMS_STORAGE_KEY);
    if (!raw) return createDefaultOrgCmsState();
    const parsed: unknown = JSON.parse(raw);
    return sanitizeOrgCmsState(parsed);
  } catch {
    return createDefaultOrgCmsState();
  }
}

export function saveOrgCmsState(
  state: OrgCmsState,
  storage?: OrgCmsStorageLike | null
): OrgCmsState {
  const stamped: OrgCmsState = {
    ...state,
    version: 1,
    updatedAt: new Date().toISOString(),
  };
  const target = storage === undefined ? resolveBrowserStorage() : storage;
  if (target) {
    try {
      target.setItem(ORG_CMS_STORAGE_KEY, JSON.stringify(stamped));
    } catch {
      // Ignore quota errors in restricted browser contexts
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ORG_CMS_CHANGE_EVENT));
  }
  return stamped;
}

export function resetOrgCmsState(
  storage?: OrgCmsStorageLike | null
): OrgCmsState {
  const defaults = createDefaultOrgCmsState();
  const target = storage === undefined ? resolveBrowserStorage() : storage;
  if (target) {
    try {
      target.removeItem(ORG_CMS_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ORG_CMS_CHANGE_EVENT));
  }
  return defaults;
}

export function subscribeOrgCmsChanges(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handleCustom = () => onChange();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === ORG_CMS_STORAGE_KEY) {
      onChange();
    }
  };
  window.addEventListener(ORG_CMS_CHANGE_EVENT, handleCustom);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(ORG_CMS_CHANGE_EVENT, handleCustom);
    window.removeEventListener('storage', handleStorage);
  };
}

export function exportOrgCmsJson(state: OrgCmsState): string {
  return JSON.stringify(state, null, 2);
}

export function importOrgCmsJson(jsonText: string): OrgCmsImportResult {
  const trimmed = jsonText.trim();
  if (!trimmed) {
    return { ok: false, error: 'Paste or upload a valid JSON backup first.' };
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        ok: false,
        error: 'Expected a JSON object containing home, team, activities, and articles.',
      };
    }
    const record = parsed as Record<string, unknown>;
    if (
      !('home' in record) &&
      !('team' in record) &&
      !('activities' in record) &&
      !('articles' in record)
    ) {
      return {
        ok: false,
        error: 'JSON does not match The ANTs CMS format (missing home, team, activities, or articles).',
      };
    }
    return {
      ok: true,
      state: sanitizeOrgCmsState({
        ...record,
        updatedAt: new Date().toISOString(),
      }),
    };
  } catch {
    return {
      ok: false,
      error: 'Invalid JSON syntax. Check quotes, commas, and brackets before importing.',
    };
  }
}

export function createBlankTeamMember(
  existingUsernames: readonly string[]
): OrgTeamMemberMock {
  const username = ensureUniqueUsername('new-member', existingUsernames);
  return {
    id: `mem_${Date.now().toString(36)}`,
    username,
    name: 'New Team Member',
    initials: 'NM',
    roleCategories: ['tutor'],
    roleBadge: 'Peer Tutor',
    isFounder: false,
    isTutor: true,
    headline: 'IGCSE & IAL Subject Tutor',
    bio: 'Add a short academic bio covering subjects taught and past-paper mentoring approach.',
    institution: 'The ANTs',
    specialization: 'Edexcel IAL · Cambridge IGCSE',
    curriculums: ['Edexcel IAL'],
    taughtSubjects: ['WMA11 Pure 1'],
    hourlyRateLabel: '20,000 MMK / hr',
    timezoneLabel: 'Asia/Yangon (UTC+06:30)',
    tutorTelegramUsername: `@${username}`,
    weeklySchedule: createEmptyTutorSchedule(),
    achievements: ['Verified peer mentor'],
    joinedLabel: 'Joined · 2026',
  };
}

export function createBlankActivity(
  existingSlugs: readonly string[]
): OrgActivityMock {
  const slug = ensureUniqueSlug('new-community-activity', existingSlugs);
  const asset = ORG_LOCAL_MEDIA_ASSETS[1]!;
  return {
    id: `act_${Date.now().toString(36)}`,
    slug,
    category: 'Tutoring',
    isUpcoming: true,
    title: 'New Community Activity',
    dateLabel: 'Dec 2026',
    location: 'Yangon Study Room & Online',
    attendanceLabel: 'Open cohort',
    facilitators: ['The ANTs'],
    summary:
      'Describe the purpose, target candidates, and key takeaways from this event.',
    recapParagraphs: [
      'Add full overview paragraphs describing what students and tutors cover during this session.',
    ],
    highlights: ['Interactive group review and Q&A'],
    coverImageSrc: asset.src,
    coverAlt: asset.defaultAlt,
    artworkTheme: asset.artworkTheme,
    gallery: [
      {
        id: `gal_${Date.now().toString(36)}`,
        imageSrc: asset.src,
        imageAlt: asset.defaultAlt,
        caption: 'Group collaboration around study tables.',
        locationTag: 'Main Hall',
        shotLabel: 'Session Overview',
        artworkTheme: asset.artworkTheme,
      },
    ],
  };
}

export function createBlankArticle(
  existingSlugs: readonly string[],
  author?: OrgTeamMemberMock
): OrgArticleMock {
  const slug = ensureUniqueSlug('new-study-article', existingSlugs);
  return {
    id: `art_${Date.now().toString(36)}`,
    slug,
    category: 'Study Guide',
    title: 'New Study Guide',
    subtitle: 'Clear exam habits and worked examples for IGCSE and IAL learners.',
    publishedLabel: 'Nov 2026',
    readMinutes: 4,
    authorUsername: author?.username ?? 'thawyezaw',
    authorName: author?.name ?? 'Thaw Ye Zaw (Thorin)',
    authorRole: author?.roleBadge ?? 'Founder & Lead Architect',
    summary:
      'Summarize the main exam insight or workflow covered in this article.',
    tags: ['Study Guide', 'IAL'],
    artworkTheme: 'article-ums',
    coverCode: 'THE ANTs · GUIDE',
    coverFormula: 'Method + Precision',
    coverMetric: '4 min read',
    sections: [
      {
        id: 'key-idea',
        heading: 'Key Idea',
        paragraphs: [
          'Write the opening section clearly in plain, practical language for candidates.',
        ],
        checklist: ['Review mark scheme keywords before timed runs'],
      },
    ],
  };
}

function moveItemInArray<T extends { id: string }>(
  items: readonly T[],
  id: string,
  direction: 'up' | 'down'
): T[] {
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) return [...items];
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(idx, 1);
  if (moved) next.splice(targetIdx, 0, moved);
  return next;
}

export function updateCmsHomeData(
  state: OrgCmsState,
  home: OrgHomeLandingMockData
): OrgCmsState {
  return {
    ...state,
    home,
  };
}

export function upsertCmsTeamMember(
  state: OrgCmsState,
  member: OrgTeamMemberMock
): OrgCmsState {
  const exists = state.team.some((m) => m.id === member.id);
  const team = exists
    ? state.team.map((m) => (m.id === member.id ? member : m))
    : [member, ...state.team];
  return { ...state, team };
}

export function deleteCmsTeamMember(
  state: OrgCmsState,
  id: string
): OrgCmsState {
  return {
    ...state,
    team: state.team.filter((m) => m.id !== id),
  };
}

export function moveCmsTeamMember(
  state: OrgCmsState,
  id: string,
  direction: 'up' | 'down'
): OrgCmsState {
  return {
    ...state,
    team: moveItemInArray(state.team, id, direction),
  };
}

export function upsertCmsActivity(
  state: OrgCmsState,
  activity: OrgActivityMock
): OrgCmsState {
  const exists = state.activities.some((a) => a.id === activity.id);
  const activities = exists
    ? state.activities.map((a) => (a.id === activity.id ? activity : a))
    : [activity, ...state.activities];
  return { ...state, activities };
}

export function deleteCmsActivity(
  state: OrgCmsState,
  id: string
): OrgCmsState {
  return {
    ...state,
    activities: state.activities.filter((a) => a.id !== id),
  };
}

export function moveCmsActivity(
  state: OrgCmsState,
  id: string,
  direction: 'up' | 'down'
): OrgCmsState {
  return {
    ...state,
    activities: moveItemInArray(state.activities, id, direction),
  };
}

export function upsertCmsArticle(
  state: OrgCmsState,
  article: OrgArticleMock
): OrgCmsState {
  const exists = state.articles.some((a) => a.id === article.id);
  const articles = exists
    ? state.articles.map((a) => (a.id === article.id ? article : a))
    : [article, ...state.articles];
  return { ...state, articles };
}

export function deleteCmsArticle(
  state: OrgCmsState,
  id: string
): OrgCmsState {
  return {
    ...state,
    articles: state.articles.filter((a) => a.id !== id),
  };
}

export function moveCmsArticle(
  state: OrgCmsState,
  id: string,
  direction: 'up' | 'down'
): OrgCmsState {
  return {
    ...state,
    articles: moveItemInArray(state.articles, id, direction),
  };
}

export function teamMemberToFeaturedPreview(
  member: OrgTeamMemberMock
): OrgFeaturedMemberPreview {
  return {
    username: member.username,
    name: member.name,
    roleBadge: member.roleBadge,
    title: member.headline,
    specialization: member.specialization,
    availabilityLabel: member.isTutor
      ? formatAvailabilityDaysLabel(member.weeklySchedule)
      : member.joinedLabel,
  };
}

export function activityToHomePreview(
  activity: OrgActivityMock
): OrgActivityPreview {
  return {
    slug: activity.slug,
    category: activity.category,
    title: activity.title,
    dateLabel: activity.dateLabel,
    location: activity.location,
    summary: activity.summary,
  };
}
