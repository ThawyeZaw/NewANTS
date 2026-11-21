/**
 * Pure filtering, lookup, and editorial helpers for Stage Z2 Organization Showcase views.
 *
 * Keeping search, role/category filtering, and TOC extraction pure allows both
 * Zyy's client `*View.tsx` components and Vitest suites to verify behavior
 * deterministically without backend or Next.js router dependencies.
 */
import type {
  OrgActivityCategory,
  OrgActivityMock,
  OrgArticleCategory,
  OrgArticleMock,
} from '../mocks/showcase-content.mock';
import type {
  OrgCurriculumBoard,
  OrgMemberRoleCategory,
  OrgTeamMemberMock,
} from '../mocks/showcase-team.mock';

export interface TeamFilterCriteria {
  roleFilter: 'all' | OrgMemberRoleCategory;
  boardFilter: 'all' | OrgCurriculumBoard;
  searchQuery: string;
}

export interface ActivityFilterCriteria {
  category: 'all' | OrgActivityCategory;
  searchQuery: string;
}

export type ArticleSortOrder = 'newest' | 'shortest' | 'title';

export interface ArticleFilterCriteria {
  category: 'all' | OrgArticleCategory;
  searchQuery: string;
  sortBy?: ArticleSortOrder;
}

export interface ArticleTocEntry {
  id: string;
  heading: string;
}

function normalizeHandleParam(raw: string): string {
  try {
    return decodeURIComponent(raw).trim().replace(/^@+/, '').toLowerCase();
  } catch {
    return raw.trim().replace(/^@+/, '').toLowerCase();
  }
}

/**
 * Multi-stage filtering pipeline for `/team`:
 * 1. Role category chip (`all` | `founder` | `tutor` | `contributor` | `alumni`)
 * 2. Curriculum board chip (`all` | `Edexcel IAL` | `Cambridge AS & A-Level` | `Cambridge IGCSE`)
 * 3. Free-text query matched across display name, `@username`, headline, institution, and taught subjects.
 */
export function filterTeamMembers(
  members: readonly OrgTeamMemberMock[],
  criteria: TeamFilterCriteria
): OrgTeamMemberMock[] {
  const query = criteria.searchQuery.trim().toLowerCase();

  return members.filter((member) => {
    if (
      criteria.roleFilter !== 'all' &&
      !member.roleCategories.includes(criteria.roleFilter)
    ) {
      return false;
    }

    if (
      criteria.boardFilter !== 'all' &&
      !member.curriculums.includes(criteria.boardFilter)
    ) {
      return false;
    }

    if (!query) return true;

    const haystack = [
      member.name,
      member.username,
      member.roleBadge,
      member.headline,
      member.institution,
      member.specialization,
      ...member.taughtSubjects,
      ...member.curriculums,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

/** Computes category counts rendered on `/team` filter pills. */
export function countTeamMembersByRole(
  members: readonly OrgTeamMemberMock[]
): Record<'all' | OrgMemberRoleCategory, number> {
  const counts: Record<'all' | OrgMemberRoleCategory, number> = {
    all: members.length,
    founder: 0,
    tutor: 0,
    contributor: 0,
    alumni: 0,
  };

  for (const member of members) {
    for (const role of member.roleCategories) {
      counts[role] += 1;
    }
  }

  return counts;
}

export function findTeamMemberByUsername(
  members: readonly OrgTeamMemberMock[],
  rawUsername: string
): OrgTeamMemberMock | null {
  const target = normalizeHandleParam(rawUsername);
  if (!target) return null;
  return members.find((m) => m.username.toLowerCase() === target) ?? null;
}

/** Filters community activities by category (`Tutoring`, `Student's Meet`, `Exam Venue Visit`, `Hackathon`) & search text. */
export function filterActivities(
  activities: readonly OrgActivityMock[],
  criteria: ActivityFilterCriteria
): OrgActivityMock[] {
  const query = criteria.searchQuery.trim().toLowerCase();

  return activities.filter((act) => {
    if (criteria.category !== 'all' && act.category !== criteria.category) {
      return false;
    }
    if (!query) return true;

    const haystack = [
      act.title,
      act.category,
      act.location,
      act.dateLabel,
      act.summary,
      ...act.highlights,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function countActivitiesByCategory(
  activities: readonly OrgActivityMock[]
): Record<'all' | OrgActivityCategory, number> {
  const counts: Record<'all' | OrgActivityCategory, number> = {
    all: activities.length,
    Tutoring: 0,
    "Student's Meet": 0,
    'Exam Venue Visit': 0,
    Hackathon: 0,
  };

  for (const act of activities) {
    counts[act.category] += 1;
  }

  return counts;
}

export function findActivityBySlug(
  activities: readonly OrgActivityMock[],
  slug: string
): OrgActivityMock | null {
  const clean = slug.trim().toLowerCase();
  return activities.find((act) => act.slug.toLowerCase() === clean) ?? null;
}

const MONTH_INDEX_MAP: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function parsePublishedRank(publishedLabel: string): number {
  const parts = publishedLabel.trim().toLowerCase().split(/\s+/);
  const month = MONTH_INDEX_MAP[parts[0]?.slice(0, 3) ?? ''] ?? 0;
  const year = Number.parseInt(parts[1] ?? '0', 10) || 0;
  return year * 100 + month;
}

/** Computes category counts rendered on `/articles` filter pills. */
export function countArticlesByCategory(
  articles: readonly OrgArticleMock[]
): Record<'all' | OrgArticleCategory, number> {
  const counts: Record<'all' | OrgArticleCategory, number> = {
    all: articles.length,
    'Study Guide': 0,
    'Exam Strategy': 0,
    Productivity: 0,
    Announcement: 0,
  };

  for (const article of articles) {
    counts[article.category] += 1;
  }

  return counts;
}

/** Sorts articles deterministically by publication recency, shortest read time, or title A–Z. */
export function sortArticles(
  articles: readonly OrgArticleMock[],
  sortBy: ArticleSortOrder = 'newest'
): OrgArticleMock[] {
  const copy = [...articles];
  if (sortBy === 'shortest') {
    return copy.sort(
      (a, b) => a.readMinutes - b.readMinutes || a.title.localeCompare(b.title)
    );
  }
  if (sortBy === 'title') {
    return copy.sort((a, b) => a.title.localeCompare(b.title));
  }
  return copy.sort((a, b) => {
    const rankDiff =
      parsePublishedRank(b.publishedLabel) - parsePublishedRank(a.publishedLabel);
    if (rankDiff !== 0) return rankDiff;
    return a.id.localeCompare(b.id);
  });
}

/** Filters articles by category (`Study Guide`, `Exam Strategy`, `Productivity`, `Announcement`), search text & optional sort order. */
export function filterArticles(
  articles: readonly OrgArticleMock[],
  criteria: ArticleFilterCriteria
): OrgArticleMock[] {
  const query = criteria.searchQuery.trim().toLowerCase();

  const matched = articles.filter((article) => {
    if (criteria.category !== 'all' && article.category !== criteria.category) {
      return false;
    }
    if (!query) return true;

    const haystack = [
      article.title,
      article.subtitle,
      article.category,
      article.summary,
      article.authorName,
      article.authorRole,
      ...article.tags,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });

  return criteria.sortBy ? sortArticles(matched, criteria.sortBy) : matched;
}

export function findArticleBySlug(
  articles: readonly OrgArticleMock[],
  slug: string
): OrgArticleMock | null {
  const clean = slug.trim().toLowerCase();
  return articles.find((article) => article.slug.toLowerCase() === clean) ?? null;
}

export function extractArticleToc(article: OrgArticleMock): ArticleTocEntry[] {
  return article.sections.map((section) => ({
    id: section.id,
    heading: section.heading,
  }));
}

