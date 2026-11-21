import { relations } from 'drizzle-orm';
import { account, session, user } from './auth';
import {
  curriculums,
  subjects,
  topicProgress,
  topics,
  userCurriculums,
} from './curriculums';
import {
  flashcardDecks,
  flashcardReviews,
  flashcards,
  quizAttempts,
  quizLiveSessions,
  quizQuestions,
  quizzes,
  studyNotes,
} from './learning';
import { orgSettings, orgTeamMembers } from './organization';
import {
  pomodoroSessions,
  pomodoroUserSettings,
  tasks,
  timetableEvents,
} from './planner';
import {
  certifications,
  contributorProfiles,
  profiles,
  roleUpgradeRequests,
  studentProfiles,
  tutorProfiles,
} from './profiles';
import {
  examCountdowns,
  examDataAuditLog,
  exams,
  examSchedules,
  gradeEntries,
  paperGradeBoundaries,
  pastPapers,
  subjectComponentRoutes,
  subjectGradeBoundaries,
  userBadges,
  userCashInEnrollments,
  userComponentSelections,
  userEnrollments,
  userExamHistory,
  userExamOverrides,
  userPastPaperRecords,
  userStreaks,
  userXpLedger,
} from './study_tools';
import {
  activityFeed,
  notificationPreferences,
  notificationQueue,
  notifications,
  reviewQueue,
  versionHistory,
} from './system';

export const userRelations = relations(user, ({ one, many }) => ({
  sessions: many(session),
  accounts: many(account),
  profile: one(profiles, { fields: [user.id], references: [profiles.userId] }),
  studentProfile: one(studentProfiles, {
    fields: [user.id],
    references: [studentProfiles.userId],
  }),
  tutorProfile: one(tutorProfiles, {
    fields: [user.id],
    references: [tutorProfiles.userId],
  }),
  contributorProfile: one(contributorProfiles, {
    fields: [user.id],
    references: [contributorProfiles.userId],
  }),
  certifications: many(certifications),
  roleUpgradeRequests: many(roleUpgradeRequests, {
    relationName: 'roleRequestApplicant',
  }),
  reviewedRoleUpgradeRequests: many(roleUpgradeRequests, {
    relationName: 'roleRequestReviewer',
  }),
  enrollments: many(userEnrollments),
  cashInEnrollments: many(userCashInEnrollments),
  pastPaperRecords: many(userPastPaperRecords),
  examCountdowns: many(examCountdowns),
  studyNotes: many(studyNotes),
  flashcardDecks: many(flashcardDecks),
  quizzes: many(quizzes),
  timetableEvents: many(timetableEvents),
  tasks: many(tasks),
  pomodoroSettings: one(pomodoroUserSettings, {
    fields: [user.id],
    references: [pomodoroUserSettings.userId],
  }),
  pomodoroSessions: many(pomodoroSessions),
  notifications: many(notifications),
  notificationQueue: many(notificationQueue),
  notificationPreferences: one(notificationPreferences, {
    fields: [user.id],
    references: [notificationPreferences.userId],
  }),
  streak: one(userStreaks, {
    fields: [user.id],
    references: [userStreaks.userId],
  }),
  xpLedger: many(userXpLedger),
  badges: many(userBadges),
  activityFeed: many(activityFeed),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(user, { fields: [profiles.userId], references: [user.id] }),
}));

export const studentProfilesRelations = relations(studentProfiles, ({ one }) => ({
  user: one(user, { fields: [studentProfiles.userId], references: [user.id] }),
}));

export const tutorProfilesRelations = relations(tutorProfiles, ({ one }) => ({
  user: one(user, { fields: [tutorProfiles.userId], references: [user.id] }),
}));

export const contributorProfilesRelations = relations(
  contributorProfiles,
  ({ one }) => ({
    user: one(user, { fields: [contributorProfiles.userId], references: [user.id] }),
  })
);

export const certificationsRelations = relations(certifications, ({ one }) => ({
  user: one(user, { fields: [certifications.userId], references: [user.id] }),
}));

export const roleUpgradeRequestsRelations = relations(
  roleUpgradeRequests,
  ({ one }) => ({
    applicant: one(user, {
      fields: [roleUpgradeRequests.userId],
      references: [user.id],
      relationName: 'roleRequestApplicant',
    }),
    reviewer: one(user, {
      fields: [roleUpgradeRequests.reviewedByUserId],
      references: [user.id],
      relationName: 'roleRequestReviewer',
    }),
  })
);

export const orgSettingsRelations = relations(orgSettings, ({ one }) => ({
  updatedBy: one(user, { fields: [orgSettings.updatedByUserId], references: [user.id] }),
}));

export const orgTeamMembersRelations = relations(orgTeamMembers, ({ one }) => ({
  user: one(user, { fields: [orgTeamMembers.userId], references: [user.id] }),
}));

export const curriculumsRelations = relations(curriculums, ({ many }) => ({
  subjects: many(subjects),
  userCurriculums: many(userCurriculums),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  curriculum: one(curriculums, {
    fields: [subjects.curriculumId],
    references: [curriculums.id],
  }),
  topics: many(topics),
  exams: many(exams),
  componentRoutes: many(subjectComponentRoutes),
  pastPapers: many(pastPapers),
  gradeBoundaries: many(subjectGradeBoundaries),
  enrollments: many(userEnrollments),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  subject: one(subjects, { fields: [topics.subjectId], references: [subjects.id] }),
  progressEntries: many(topicProgress),
}));

export const userCurriculumsRelations = relations(userCurriculums, ({ one }) => ({
  user: one(user, { fields: [userCurriculums.userId], references: [user.id] }),
  curriculum: one(curriculums, {
    fields: [userCurriculums.curriculumId],
    references: [curriculums.id],
  }),
}));

export const topicProgressRelations = relations(topicProgress, ({ one }) => ({
  user: one(user, { fields: [topicProgress.userId], references: [user.id] }),
  subject: one(subjects, { fields: [topicProgress.subjectId], references: [subjects.id] }),
  topic: one(topics, { fields: [topicProgress.topicId], references: [topics.id] }),
}));

export const examsRelations = relations(exams, ({ one, many }) => ({
  subject: one(subjects, { fields: [exams.subjectId], references: [subjects.id] }),
  schedules: many(examSchedules),
}));

export const examSchedulesRelations = relations(examSchedules, ({ one, many }) => ({
  exam: one(exams, { fields: [examSchedules.examId], references: [exams.id] }),
  overrides: many(userExamOverrides),
  countdowns: many(examCountdowns),
}));

export const examCountdownsRelations = relations(examCountdowns, ({ one }) => ({
  user: one(user, { fields: [examCountdowns.userId], references: [user.id] }),
  subject: one(subjects, { fields: [examCountdowns.subjectId], references: [subjects.id] }),
  schedule: one(examSchedules, {
    fields: [examCountdowns.examScheduleId],
    references: [examSchedules.id],
  }),
}));

export const userEnrollmentsRelations = relations(userEnrollments, ({ one }) => ({
  user: one(user, { fields: [userEnrollments.userId], references: [user.id] }),
  subject: one(subjects, { fields: [userEnrollments.subjectId], references: [subjects.id] }),
}));

export const userExamOverridesRelations = relations(userExamOverrides, ({ one }) => ({
  user: one(user, { fields: [userExamOverrides.userId], references: [user.id] }),
  examSchedule: one(examSchedules, {
    fields: [userExamOverrides.examScheduleId],
    references: [examSchedules.id],
  }),
}));

export const userExamHistoryRelations = relations(userExamHistory, ({ one }) => ({
  user: one(user, { fields: [userExamHistory.userId], references: [user.id] }),
  subject: one(subjects, { fields: [userExamHistory.subjectId], references: [subjects.id] }),
}));

export const subjectComponentRoutesRelations = relations(
  subjectComponentRoutes,
  ({ one, many }) => ({
    subject: one(subjects, {
      fields: [subjectComponentRoutes.subjectId],
      references: [subjects.id],
    }),
    enrollments: many(userCashInEnrollments),
  })
);

export const userCashInEnrollmentsRelations = relations(
  userCashInEnrollments,
  ({ one, many }) => ({
    user: one(user, { fields: [userCashInEnrollments.userId], references: [user.id] }),
    subject: one(subjects, {
      fields: [userCashInEnrollments.subjectId],
      references: [subjects.id],
    }),
    route: one(subjectComponentRoutes, {
      fields: [userCashInEnrollments.routeId],
      references: [subjectComponentRoutes.id],
    }),
    selections: many(userComponentSelections),
  })
);

export const userComponentSelectionsRelations = relations(
  userComponentSelections,
  ({ one }) => ({
    cashInEnrollment: one(userCashInEnrollments, {
      fields: [userComponentSelections.cashInEnrollmentId],
      references: [userCashInEnrollments.id],
    }),
    user: one(user, {
      fields: [userComponentSelections.userId],
      references: [user.id],
    }),
  })
);

export const pastPapersRelations = relations(pastPapers, ({ one, many }) => ({
  subject: one(subjects, { fields: [pastPapers.subjectId], references: [subjects.id] }),
  boundaries: many(paperGradeBoundaries),
  records: many(userPastPaperRecords),
}));

export const subjectGradeBoundariesRelations = relations(
  subjectGradeBoundaries,
  ({ one }) => ({
    subject: one(subjects, {
      fields: [subjectGradeBoundaries.subjectId],
      references: [subjects.id],
    }),
  })
);

export const paperGradeBoundariesRelations = relations(
  paperGradeBoundaries,
  ({ one }) => ({
    pastPaper: one(pastPapers, {
      fields: [paperGradeBoundaries.pastPaperId],
      references: [pastPapers.id],
    }),
  })
);

export const userPastPaperRecordsRelations = relations(
  userPastPaperRecords,
  ({ one }) => ({
    user: one(user, { fields: [userPastPaperRecords.userId], references: [user.id] }),
    subject: one(subjects, {
      fields: [userPastPaperRecords.subjectId],
      references: [subjects.id],
    }),
    pastPaper: one(pastPapers, {
      fields: [userPastPaperRecords.pastPaperId],
      references: [pastPapers.id],
    }),
  })
);

export const gradeEntriesRelations = relations(gradeEntries, ({ one }) => ({
  user: one(user, { fields: [gradeEntries.userId], references: [user.id] }),
  subject: one(subjects, { fields: [gradeEntries.subjectId], references: [subjects.id] }),
}));

export const examDataAuditLogRelations = relations(examDataAuditLog, ({ one }) => ({
  actor: one(user, { fields: [examDataAuditLog.actorUserId], references: [user.id] }),
}));

export const userXpLedgerRelations = relations(userXpLedger, ({ one }) => ({
  user: one(user, { fields: [userXpLedger.userId], references: [user.id] }),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(user, { fields: [userBadges.userId], references: [user.id] }),
}));

export const userStreaksRelations = relations(userStreaks, ({ one }) => ({
  user: one(user, { fields: [userStreaks.userId], references: [user.id] }),
}));

export const studyNotesRelations = relations(studyNotes, ({ one }) => ({
  user: one(user, { fields: [studyNotes.userId], references: [user.id] }),
  subject: one(subjects, { fields: [studyNotes.subjectId], references: [subjects.id] }),
}));

export const flashcardDecksRelations = relations(flashcardDecks, ({ one, many }) => ({
  user: one(user, { fields: [flashcardDecks.userId], references: [user.id] }),
  subject: one(subjects, { fields: [flashcardDecks.subjectId], references: [subjects.id] }),
  cards: many(flashcards),
}));

export const flashcardsRelations = relations(flashcards, ({ one, many }) => ({
  deck: one(flashcardDecks, { fields: [flashcards.deckId], references: [flashcardDecks.id] }),
  reviews: many(flashcardReviews),
}));

export const flashcardReviewsRelations = relations(flashcardReviews, ({ one }) => ({
  flashcard: one(flashcards, {
    fields: [flashcardReviews.flashcardId],
    references: [flashcards.id],
  }),
  user: one(user, { fields: [flashcardReviews.userId], references: [user.id] }),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  author: one(user, { fields: [quizzes.authorUserId], references: [user.id] }),
  subject: one(subjects, { fields: [quizzes.subjectId], references: [subjects.id] }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
  liveSessions: many(quizLiveSessions),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  quiz: one(quizzes, { fields: [quizQuestions.quizId], references: [quizzes.id] }),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  quiz: one(quizzes, { fields: [quizAttempts.quizId], references: [quizzes.id] }),
  user: one(user, { fields: [quizAttempts.userId], references: [user.id] }),
}));

export const quizLiveSessionsRelations = relations(quizLiveSessions, ({ one }) => ({
  quiz: one(quizzes, { fields: [quizLiveSessions.quizId], references: [quizzes.id] }),
  user: one(user, { fields: [quizLiveSessions.userId], references: [user.id] }),
}));

export const timetableEventsRelations = relations(timetableEvents, ({ one, many }) => ({
  user: one(user, { fields: [timetableEvents.userId], references: [user.id] }),
  linkedTasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(user, { fields: [tasks.userId], references: [user.id] }),
  linkedBlock: one(timetableEvents, {
    fields: [tasks.linkedBlockId],
    references: [timetableEvents.id],
  }),
  pomodoroSessions: many(pomodoroSessions),
}));

export const pomodoroUserSettingsRelations = relations(
  pomodoroUserSettings,
  ({ one }) => ({
    user: one(user, { fields: [pomodoroUserSettings.userId], references: [user.id] }),
  })
);

export const pomodoroSessionsRelations = relations(pomodoroSessions, ({ one }) => ({
  user: one(user, { fields: [pomodoroSessions.userId], references: [user.id] }),
  task: one(tasks, { fields: [pomodoroSessions.taskId], references: [tasks.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, { fields: [notifications.userId], references: [user.id] }),
}));

export const notificationQueueRelations = relations(notificationQueue, ({ one }) => ({
  user: one(user, { fields: [notificationQueue.userId], references: [user.id] }),
}));

export const notificationPreferencesRelations = relations(
  notificationPreferences,
  ({ one }) => ({
    user: one(user, { fields: [notificationPreferences.userId], references: [user.id] }),
  })
);

export const reviewQueueRelations = relations(reviewQueue, ({ one }) => ({
  submittedBy: one(user, {
    fields: [reviewQueue.submittedByUserId],
    references: [user.id],
    relationName: 'reviewSubmitter',
  }),
  reviewedBy: one(user, {
    fields: [reviewQueue.reviewedByUserId],
    references: [user.id],
    relationName: 'reviewReviewer',
  }),
}));

export const versionHistoryRelations = relations(versionHistory, ({ one }) => ({
  changedBy: one(user, { fields: [versionHistory.changedByUserId], references: [user.id] }),
}));

export const activityFeedRelations = relations(activityFeed, ({ one }) => ({
  user: one(user, { fields: [activityFeed.userId], references: [user.id] }),
}));
