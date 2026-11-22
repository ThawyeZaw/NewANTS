import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { OrgActivityCategory, OrgMemberCategory } from '@ants/shared-types';
import { user } from './auth';
import { booleanFlag, isoTimestamps } from './helpers';
import type { TutorWeeklyScheduleRecord } from './profiles';

export interface OrgMissionPillarRecord {
  id: string;
  title: string;
  description: string;
}

export interface OrgHackathonBannerRecord {
  title: string;
  dateLabel: string;
  location: string;
  summary: string;
  externalUrl: string;
  ctaLabel: string;
}

export interface OrgActivityExternalLinkRecord {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary';
}

export interface OrgActivityPhaseRecord {
  window: string;
  phase: string;
  mode: string;
  summary: string;
}

export interface OrgActivityPhotoRecord {
  id: string;
  imageSrc: string;
  imageAlt: string;
  caption: string;
  locationTag: string;
  shotLabel: string;
}

export interface OrgArticleSectionRecord {
  id: string;
  heading?: string;
  paragraphs: string[];
  callout?: string;
  codeBlock?: string;
  checklist?: string[];
}

/**
 * Organization-wide showcase settings managed via `/admin` CMS (`the-ants.org`).
 */
export const orgSettings = sqliteTable('org_settings', {
  id: text('id').primaryKey(),
  heroHeadline: text('hero_headline').notNull(),
  heroSubheadline: text('hero_subheadline').notNull(),
  missionStatement: text('mission_statement').notNull(),
  missionPillarsJson: text('mission_pillars_json', { mode: 'json' })
    .$type<OrgMissionPillarRecord[]>()
    .notNull()
    .default([]),
  hackathonBannerJson: text('hackathon_banner_json', { mode: 'json' })
    .$type<OrgHackathonBannerRecord | null>()
    .default(null),
  socialLinksJson: text('social_links_json', { mode: 'json' })
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  updatedByUserId: text('updated_by_user_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  ...isoTimestamps(),
});

/**
 * Public Founders, Tutors, Contributors & Alumni cards rendered on `the-ants.org/team`.
 */
export const orgTeamMembers = sqliteTable('org_team_members', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  username: text('username').notNull().unique(),
  name: text('name').notNull(),
  initials: text('initials').notNull(),
  roleBadge: text('role_badge').notNull(),
  categoriesJson: text('categories_json', { mode: 'json' })
    .$type<OrgMemberCategory[]>()
    .notNull()
    .default([]),
  isFounder: booleanFlag('is_founder', false),
  isTutor: booleanFlag('is_tutor', false),
  headline: text('headline').notNull().default(''),
  bio: text('bio').notNull().default(''),
  institution: text('institution').notNull().default(''),
  specialization: text('specialization').notNull().default(''),
  curriculumsJson: text('curriculums_json', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  taughtSubjectsJson: text('taught_subjects_json', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  hourlyRateLabel: text('hourly_rate_label'),
  timezoneLabel: text('timezone_label').notNull().default('MMT (UTC+6:30)'),
  tutorTelegramUsername: text('tutor_telegram_username'),
  weeklyScheduleJson: text('weekly_schedule_json', { mode: 'json' })
    .$type<TutorWeeklyScheduleRecord>()
    .notNull()
    .default({}),
  achievementsJson: text('achievements_json', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  joinedLabel: text('joined_label').notNull().default(''),
  displayOrder: integer('display_order').notNull().default(0),
  isPublished: booleanFlag('is_published', true),
  ...isoTimestamps(),
});

/**
 * Community activities, tutoring sessions, meetups, exam venue visits & hackathons.
 */
export const orgActivities = sqliteTable('org_activities', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  category: text('category').$type<OrgActivityCategory>().notNull(),
  isUpcoming: booleanFlag('is_upcoming', false),
  title: text('title').notNull(),
  dateLabel: text('date_label').notNull(),
  location: text('location').notNull(),
  attendanceLabel: text('attendance_label').notNull().default(''),
  facilitatorsJson: text('facilitators_json', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  summary: text('summary').notNull(),
  recapParagraphsJson: text('recap_paragraphs_json', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  highlightsJson: text('highlights_json', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  externalLinksJson: text('external_links_json', { mode: 'json' })
    .$type<OrgActivityExternalLinkRecord[]>()
    .notNull()
    .default([]),
  schedulePhasesJson: text('schedule_phases_json', { mode: 'json' })
    .$type<OrgActivityPhaseRecord[]>()
    .notNull()
    .default([]),
  coverImageSrc: text('cover_image_src').notNull(),
  coverAlt: text('cover_alt').notNull().default(''),
  galleryPhotosJson: text('gallery_photos_json', { mode: 'json' })
    .$type<OrgActivityPhotoRecord[]>()
    .notNull()
    .default([]),
  displayOrder: integer('display_order').notNull().default(0),
  isPublished: booleanFlag('is_published', true),
  ...isoTimestamps(),
});

/**
 * Organization editorial articles, study guides, and community announcements.
 */
export const orgArticles = sqliteTable('org_articles', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  excerpt: text('excerpt').notNull(),
  category: text('category').notNull().default('Study Guide'),
  authorName: text('author_name').notNull(),
  authorUsername: text('author_username').notNull(),
  authorRole: text('author_role').notNull().default('Contributor'),
  publishedAtIso: text('published_at_iso').notNull(),
  readingTimeMinutes: integer('reading_time_minutes').notNull().default(5),
  tagsJson: text('tags_json', { mode: 'json' }).$type<string[]>().notNull().default([]),
  coverImageSrc: text('cover_image_src'),
  sectionsJson: text('sections_json', { mode: 'json' })
    .$type<OrgArticleSectionRecord[]>()
    .notNull()
    .default([]),
  markdownBody: text('markdown_body').notNull().default(''),
  isFeatured: booleanFlag('is_featured', false),
  isPublished: booleanFlag('is_published', true),
  ...isoTimestamps(),
});

export const org_settings = orgSettings;
export const org_team_members = orgTeamMembers;
export const org_activities = orgActivities;
export const org_articles = orgArticles;
