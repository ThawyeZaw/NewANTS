export * from './helpers';
export * from './auth';
export * from './profiles';
export * from './organization';
export * from './curriculums';
export * from './study_tools';
export * from './learning';
export * from './planner';
export * from './system';
export * from './relations';

import * as authSchema from './auth';
import * as profilesSchema from './profiles';
import * as organizationSchema from './organization';
import * as curriculumsSchema from './curriculums';
import * as studyToolsSchema from './study_tools';
import * as learningSchema from './learning';
import * as plannerSchema from './planner';
import * as systemSchema from './system';
import * as relationsSchema from './relations';

/**
 * Canonical schema registry passed into `drizzle(d1, { schema })` so relational
 * queries (`db.query.*`) work across every table without duplicate table keys.
 */
export const schema = {
  // auth
  user: authSchema.user,
  session: authSchema.session,
  account: authSchema.account,
  verification: authSchema.verification,
  // profiles
  profiles: profilesSchema.profiles,
  studentProfiles: profilesSchema.studentProfiles,
  tutorProfiles: profilesSchema.tutorProfiles,
  contributorProfiles: profilesSchema.contributorProfiles,
  certifications: profilesSchema.certifications,
  roleUpgradeRequests: profilesSchema.roleUpgradeRequests,
  // organization
  orgSettings: organizationSchema.orgSettings,
  orgTeamMembers: organizationSchema.orgTeamMembers,
  orgActivities: organizationSchema.orgActivities,
  orgArticles: organizationSchema.orgArticles,
  // curriculums
  curriculums: curriculumsSchema.curriculums,
  subjects: curriculumsSchema.subjects,
  topics: curriculumsSchema.topics,
  userCurriculums: curriculumsSchema.userCurriculums,
  topicProgress: curriculumsSchema.topicProgress,
  // study_tools
  exams: studyToolsSchema.exams,
  examSchedules: studyToolsSchema.examSchedules,
  examCountdowns: studyToolsSchema.examCountdowns,
  userEnrollments: studyToolsSchema.userEnrollments,
  userExamOverrides: studyToolsSchema.userExamOverrides,
  userExamHistory: studyToolsSchema.userExamHistory,
  subjectComponentRoutes: studyToolsSchema.subjectComponentRoutes,
  userCashInEnrollments: studyToolsSchema.userCashInEnrollments,
  userComponentSelections: studyToolsSchema.userComponentSelections,
  pastPapers: studyToolsSchema.pastPapers,
  subjectGradeBoundaries: studyToolsSchema.subjectGradeBoundaries,
  paperGradeBoundaries: studyToolsSchema.paperGradeBoundaries,
  userPastPaperRecords: studyToolsSchema.userPastPaperRecords,
  gradeEntries: studyToolsSchema.gradeEntries,
  examDataAuditLog: studyToolsSchema.examDataAuditLog,
  userXpLedger: studyToolsSchema.userXpLedger,
  userBadges: studyToolsSchema.userBadges,
  userStreaks: studyToolsSchema.userStreaks,
  // learning
  studyNotes: learningSchema.studyNotes,
  flashcardDecks: learningSchema.flashcardDecks,
  flashcards: learningSchema.flashcards,
  flashcardReviews: learningSchema.flashcardReviews,
  quizzes: learningSchema.quizzes,
  quizQuestions: learningSchema.quizQuestions,
  quizAttempts: learningSchema.quizAttempts,
  quizLiveSessions: learningSchema.quizLiveSessions,
  // planner
  timetableEvents: plannerSchema.timetableEvents,
  tasks: plannerSchema.tasks,
  pomodoroUserSettings: plannerSchema.pomodoroUserSettings,
  pomodoroSessions: plannerSchema.pomodoroSessions,
  // system
  notifications: systemSchema.notifications,
  notificationQueue: systemSchema.notificationQueue,
  notificationPreferences: systemSchema.notificationPreferences,
  reviewQueue: systemSchema.reviewQueue,
  versionHistory: systemSchema.versionHistory,
  activityFeed: systemSchema.activityFeed,
  // relations
  ...relationsSchema,
};
