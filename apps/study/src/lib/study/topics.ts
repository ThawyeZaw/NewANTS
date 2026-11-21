/**
 * Study Syllabus Topic Tracker Engine & Persistence (`[ZYY-4.3]`).
 *
 * Pure TypeScript module with zero React, Next.js, or database dependencies.
 * Handles subtopic checklist state, automatic + manual confidence status derivation
 * (`not_started` | `in_progress` | `mastered`), unit-code filtering, personal topic notes,
 * and XP rewards (`+10 XP` per mastered topic)ready for `[THAW-4.2]` D1 wiring.
 */

import type { CurriculumSubjectItem } from './curriculum';

export const STUDY_TOPICS_STORAGE_KEY = 'ants-study-topics-v1';
export const TOPIC_MASTERY_XP = 10;

export type TopicConfidenceStatus = 'not_started' | 'in_progress' | 'mastered';
export type TopicDifficultyLevel = 'foundation' | 'standard' | 'stretch';
export type TopicTrackerLayoutMode = 'both' | 'accordion' | 'grid';

export interface SyllabusSubtopicItem {
  id: string;
  code: string;
  title: string;
  defaultCompleted: boolean;
}

export interface SyllabusTopicItem {
  id: string;
  subjectId: string;
  unitCode: string;
  unitLabel: string;
  code: string;
  title: string;
  difficulty: TopicDifficultyLevel;
  estimatedMinutes: number;
  keyFormulasAndPitfalls: string[];
  defaultStatus: TopicConfidenceStatus;
  defaultNote?: string;
  subtopics: SyllabusSubtopicItem[];
}

export interface StudyTopicsPersistedState {
  version: 1;
  completedSubtopicIds: string[];
  statusOverrideByTopicId: Record<string, TopicConfidenceStatus>;
  notesByTopicId: Record<string, string>;
  xpAwardedTopicIds: string[];
}

export interface SubjectTopicMasteryStats {
  totalTopics: number;
  masteredCount: number;
  inProgressCount: number;
  notStartedCount: number;
  masteryPercent: number;
  completedSubtopics: number;
  totalSubtopics: number;
  earnedTopicXp: number;
}

/**
 * Maps Dashboard subject IDs (`sub_wma11_set`, `sub_0580`, etc.) or syllabus codes (`WMA11-SET`, `9709`)
 * to canonical Curriculum Catalog subject IDs (`ial-maths-suite`, `igcse-maths-0580`, etc.).
 */
const DASHBOARD_SUBJECT_ALIASES: Record<string, string> = {
  sub_wma11_set: 'ial-maths-suite',
  sub_wph_ial: 'ial-physics',
  sub_wch_ial: 'ial-chemistry',
  sub_0580: 'igcse-maths-0580',
  sub_0625: 'igcse-physics-0625',
  sub_0620: 'igcse-chemistry-0620',
  sub_0500: 'igcse-cs-0478',
};

export function resolveSubjectIdFromParam(
  rawParam: string | null | undefined,
  subjects: readonly CurriculumSubjectItem[]
): string {
  if (!rawParam) return subjects[0]?.id ?? 'ial-maths-suite';
  const cleaned = decodeURIComponent(rawParam).trim();
  if (!cleaned) return subjects[0]?.id ?? 'ial-maths-suite';

  const aliasHit = DASHBOARD_SUBJECT_ALIASES[cleaned.toLowerCase()];
  if (aliasHit && subjects.some((s) => s.id === aliasHit)) {
    return aliasHit;
  }

  const directHit = subjects.find(
    (s) =>
      s.id.toLowerCase() === cleaned.toLowerCase() ||
      s.code.toLowerCase() === cleaned.toLowerCase()
  );
  return directHit?.id ?? subjects[0]?.id ?? 'ial-maths-suite';
}

/**
 * Derives a topic's effective confidence status from explicit override or subtopic completion ratio.
 */
export function deriveTopicStatus(
  topic: SyllabusTopicItem,
  completedSubtopicIds: readonly string[],
  statusOverrideByTopicId: Readonly<Record<string, TopicConfidenceStatus>> = {}
): TopicConfidenceStatus {
  const override = statusOverrideByTopicId[topic.id];
  if (override) {
    return override;
  }

  if (topic.subtopics.length === 0) {
    return topic.defaultStatus;
  }

  const completedSet = new Set(completedSubtopicIds);
  const doneCount = topic.subtopics.filter((sub) => completedSet.has(sub.id)).length;

  if (doneCount === 0) return 'not_started';
  if (doneCount >= topic.subtopics.length) return 'mastered';
  return 'in_progress';
}

/**
 * Returns the count of completed subtopics for a given topic.
 */
export function getTopicCompletedSubtopicCount(
  topic: SyllabusTopicItem,
  completedSubtopicIds: readonly string[]
): number {
  const completedSet = new Set(completedSubtopicIds);
  return topic.subtopics.filter((sub) => completedSet.has(sub.id)).length;
}

/**
 * Toggles a single subtopic checkbox and updates parent topic status & mastery XP automatically.
 */
export function toggleSubtopicCompletion(
  state: StudyTopicsPersistedState,
  topic: SyllabusTopicItem,
  subtopicId: string
): StudyTopicsPersistedState {
  const exists = state.completedSubtopicIds.includes(subtopicId);
  const nextCompleted = exists
    ? state.completedSubtopicIds.filter((id) => id !== subtopicId)
    : [...state.completedSubtopicIds, subtopicId];

  // Clear manual override on this topic so subtopic progress drives status naturally
  const nextOverrides = { ...state.statusOverrideByTopicId };
  delete nextOverrides[topic.id];

  const nextStatus = deriveTopicStatus(topic, nextCompleted, nextOverrides);
  const nextXpIds =
    nextStatus === 'mastered' && !state.xpAwardedTopicIds.includes(topic.id)
      ? [...state.xpAwardedTopicIds, topic.id]
      : state.xpAwardedTopicIds;

  return {
    ...state,
    completedSubtopicIds: nextCompleted,
    statusOverrideByTopicId: nextOverrides,
    xpAwardedTopicIds: nextXpIds,
  };
}

/**
 * Explicitly sets a topic's confidence status (`not_started` | `in_progress` | `mastered`)
 * and synchronizes its subtopic checkboxes accordingly.
 */
export function setTopicConfidenceStatus(
  state: StudyTopicsPersistedState,
  topic: SyllabusTopicItem,
  nextStatus: TopicConfidenceStatus
): StudyTopicsPersistedState {
  const topicSubIds = new Set(topic.subtopics.map((s) => s.id));
  let nextCompleted = state.completedSubtopicIds.filter((id) => !topicSubIds.has(id));

  if (nextStatus === 'mastered') {
    nextCompleted = [...nextCompleted, ...Array.from(topicSubIds)];
  } else if (nextStatus === 'in_progress') {
    // Keep existing checked subtopics if partial; if 0 or all, check the first subtopic
    const currentlyChecked = topic.subtopics.filter((s) =>
      state.completedSubtopicIds.includes(s.id)
    );
    if (
      currentlyChecked.length > 0 &&
      currentlyChecked.length < topic.subtopics.length
    ) {
      nextCompleted = [
        ...nextCompleted,
        ...currentlyChecked.map((s) => s.id),
      ];
    } else if (topic.subtopics[0]) {
      nextCompleted = [...nextCompleted, topic.subtopics[0].id];
    }
  }

  const nextOverrides = {
    ...state.statusOverrideByTopicId,
    [topic.id]: nextStatus,
  };

  const nextXpIds =
    nextStatus === 'mastered' && !state.xpAwardedTopicIds.includes(topic.id)
      ? [...state.xpAwardedTopicIds, topic.id]
      : state.xpAwardedTopicIds;

  return {
    ...state,
    completedSubtopicIds: Array.from(new Set(nextCompleted)),
    statusOverrideByTopicId: nextOverrides,
    xpAwardedTopicIds: nextXpIds,
  };
}

/**
 * Cycles confidence status (`not_started` -> `in_progress` -> `mastered` -> `not_started`).
 */
export function cycleTopicConfidenceStatus(
  current: TopicConfidenceStatus
): TopicConfidenceStatus {
  if (current === 'not_started') return 'in_progress';
  if (current === 'in_progress') return 'mastered';
  return 'not_started';
}

/**
 * Saves or updates personal study notes for a syllabus topic.
 */
export function saveTopicNote(
  state: StudyTopicsPersistedState,
  topicId: string,
  noteText: string
): StudyTopicsPersistedState {
  const nextNotes = { ...state.notesByTopicId };
  if (noteText.trim().length === 0) {
    delete nextNotes[topicId];
  } else {
    nextNotes[topicId] = noteText;
  }
  return {
    ...state,
    notesByTopicId: nextNotes,
  };
}

/**
 * Filters syllabus topics by subject, unit code, allowed unit subset, confidence status, difficulty, and search query.
 */
export function filterSyllabusTopics(
  topics: readonly SyllabusTopicItem[],
  state: StudyTopicsPersistedState,
  options: {
    subjectId: string;
    unitCode?: string;
    allowedUnitCodes?: readonly string[];
    status?: 'all' | TopicConfidenceStatus;
    difficulty?: 'all' | TopicDifficultyLevel;
    searchQuery?: string;
  }
): SyllabusTopicItem[] {
  const {
    subjectId,
    unitCode = 'all',
    allowedUnitCodes,
    status = 'all',
    difficulty = 'all',
    searchQuery = '',
  } = options;

  const allowedSet =
    allowedUnitCodes && allowedUnitCodes.length > 0
      ? new Set(allowedUnitCodes)
      : null;
  const q = searchQuery.trim().toLowerCase();

  return topics.filter((topic) => {
    if (topic.subjectId !== subjectId) return false;
    if (allowedSet && !allowedSet.has(topic.unitCode)) return false;
    if (unitCode !== 'all' && topic.unitCode !== unitCode) return false;
    if (difficulty !== 'all' && topic.difficulty !== difficulty) return false;

    const derivedStatus = deriveTopicStatus(
      topic,
      state.completedSubtopicIds,
      state.statusOverrideByTopicId
    );
    if (status !== 'all' && derivedStatus !== status) return false;

    if (!q) return true;

    const noteText = (state.notesByTopicId[topic.id] ?? '').toLowerCase();
    const subtopicMatch = topic.subtopics.some(
      (sub) =>
        sub.code.toLowerCase().includes(q) || sub.title.toLowerCase().includes(q)
    );
    const formulaMatch = topic.keyFormulasAndPitfalls.some((f) =>
      f.toLowerCase().includes(q)
    );

    return (
      topic.code.toLowerCase().includes(q) ||
      topic.title.toLowerCase().includes(q) ||
      topic.unitCode.toLowerCase().includes(q) ||
      topic.unitLabel.toLowerCase().includes(q) ||
      noteText.includes(q) ||
      subtopicMatch ||
      formulaMatch
    );
  });
}

/**
 * Computes mastery rollups for a subject's topics (optionally scoped to a subset of active modular units).
 */
export function computeSubjectTopicStats(
  topics: readonly SyllabusTopicItem[],
  state: StudyTopicsPersistedState,
  subjectId: string,
  allowedUnitCodes?: readonly string[]
): SubjectTopicMasteryStats {
  const allowedSet =
    allowedUnitCodes && allowedUnitCodes.length > 0
      ? new Set(allowedUnitCodes)
      : null;

  const subjectTopics = topics.filter(
    (t) => t.subjectId === subjectId && (!allowedSet || allowedSet.has(t.unitCode))
  );

  let masteredCount = 0;
  let inProgressCount = 0;
  let notStartedCount = 0;
  let completedSubtopics = 0;
  let totalSubtopics = 0;

  const completedSet = new Set(state.completedSubtopicIds);

  for (const topic of subjectTopics) {
    const st = deriveTopicStatus(
      topic,
      state.completedSubtopicIds,
      state.statusOverrideByTopicId
    );
    if (st === 'mastered') masteredCount += 1;
    else if (st === 'in_progress') inProgressCount += 1;
    else notStartedCount += 1;

    totalSubtopics += topic.subtopics.length;
    completedSubtopics += topic.subtopics.filter((s) =>
      completedSet.has(s.id)
    ).length;
  }

  const totalTopics = subjectTopics.length;
  const masteryPercent =
    totalTopics === 0 ? 0 : Math.round((masteredCount / totalTopics) * 100);

  return {
    totalTopics,
    masteredCount,
    inProgressCount,
    notStartedCount,
    masteryPercent,
    completedSubtopics,
    totalSubtopics,
    earnedTopicXp: state.xpAwardedTopicIds.length * TOPIC_MASTERY_XP,
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const VALID_STATUSES: TopicConfidenceStatus[] = [
  'not_started',
  'in_progress',
  'mastered',
];

export function sanitizeStudyTopicsState(
  raw: unknown,
  fallback: StudyTopicsPersistedState
): StudyTopicsPersistedState {
  if (!isObjectRecord(raw)) return fallback;

  const completedSubtopicIds = Array.isArray(raw.completedSubtopicIds)
    ? raw.completedSubtopicIds.filter((v): v is string => typeof v === 'string')
    : fallback.completedSubtopicIds;

  const xpAwardedTopicIds = Array.isArray(raw.xpAwardedTopicIds)
    ? raw.xpAwardedTopicIds.filter((v): v is string => typeof v === 'string')
    : fallback.xpAwardedTopicIds;

  const statusOverrideByTopicId: Record<string, TopicConfidenceStatus> = {
    ...fallback.statusOverrideByTopicId,
  };
  if (isObjectRecord(raw.statusOverrideByTopicId)) {
    for (const [k, v] of Object.entries(raw.statusOverrideByTopicId)) {
      if (VALID_STATUSES.includes(v as TopicConfidenceStatus)) {
        statusOverrideByTopicId[k] = v as TopicConfidenceStatus;
      }
    }
  }

  const notesByTopicId: Record<string, string> = {
    ...fallback.notesByTopicId,
  };
  if (isObjectRecord(raw.notesByTopicId)) {
    for (const [k, v] of Object.entries(raw.notesByTopicId)) {
      if (typeof v === 'string') {
        notesByTopicId[k] = v;
      }
    }
  }

  return {
    version: 1,
    completedSubtopicIds: Array.from(new Set(completedSubtopicIds)),
    statusOverrideByTopicId,
    notesByTopicId,
    xpAwardedTopicIds: Array.from(new Set(xpAwardedTopicIds)),
  };
}

export function loadStudyTopicsState(
  fallback: StudyTopicsPersistedState
): StudyTopicsPersistedState {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STUDY_TOPICS_STORAGE_KEY);
    if (!raw) return fallback;
    return sanitizeStudyTopicsState(JSON.parse(raw), fallback);
  } catch {
    return fallback;
  }
}

export function saveStudyTopicsState(state: StudyTopicsPersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STUDY_TOPICS_STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch {
    // Ignore storage quota errors
  }
}

