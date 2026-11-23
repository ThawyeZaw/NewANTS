import { describe, expect, it } from 'vitest';
import {
  ALLOWED_CORS_ORIGINS,
  ApiErrorResponseSchema,
  ApiHealthResponseSchema,
  AuthSessionBundleSchema,
  AuthSignInEmailInputSchema,
  AuthSignUpInputSchema,
  CalculatorCalculateInputSchema,
  CalculatorCatalogResponseSchema,
  CalculatorRouteOptionSchema,
  CalculatorSavedSnapshotDtoSchema,
  ECOSYSTEM_APPS,
  ECOSYSTEM_APP_LIST,
  EDEXCEL_MATHS_UNITS,
  EDEXCEL_MATHS_YMA01_APPLIED_PAIRS,
  EdexcelMathsSuiteCalculateInputSchema,
  ExamCountdownItemSchema,
  FlowTaskItemSchema,
  GradeCalculationSnapshotSchema,
  PastPaperAttemptInputSchema,
  PomodoroSettingsSchema,
  ROLE_HIERARCHY_WEIGHT,
  STORAGE_BUCKET_PREFIXES,
  StorageFileMetadataDtoSchema,
  StorageUploadDataUrlInputSchema,
  TELEGRAM_VERIFICATION_CODE_REGEX,
  TelegramLinkStartInputSchema,
  TelegramPreferencesUpdateInputSchema,
  TelegramStatusDtoSchema,
  TelegramTestPingInputSchema,
  TelegramWebhookUpdateSchema,
  TimetableEventItemSchema,
  USER_ROLES,
  hasAdminAccess,
  hasContributorAccess,
  hasMainContributorAccess,
  isAllowedCorsOrigin,
  isEducatorRole,
  normalizeUserRoles,
  parseRolesJson,
  serializeRolesJson,
  toCalculatorBoardId,
  toCurriculumBoardId,
  validateEdexcelMathsCashIn,
} from '../index';

describe('@ants/shared-types — roles & permissions', () => {
  it('orders role hierarchy weights monotonically and covers all 6 canonical roles', () => {
    expect(USER_ROLES).toEqual([
      'student',
      'tutor',
      'teacher',
      'contributor',
      'main_contributor',
      'admin',
    ]);
    expect(ROLE_HIERARCHY_WEIGHT.admin).toBeGreaterThan(ROLE_HIERARCHY_WEIGHT.main_contributor);
    expect(ROLE_HIERARCHY_WEIGHT.main_contributor).toBeGreaterThan(ROLE_HIERARCHY_WEIGHT.contributor);
    expect(ROLE_HIERARCHY_WEIGHT.contributor).toBeGreaterThan(ROLE_HIERARCHY_WEIGHT.tutor);
    expect(ROLE_HIERARCHY_WEIGHT.tutor).toBeGreaterThan(ROLE_HIERARCHY_WEIGHT.student);
  });

  it('normalizes and parses D1 JSON role arrays defensively', () => {
    expect(normalizeUserRoles('tutor', ['student', 'tutor'])).toEqual(['tutor', 'student']);
    expect(parseRolesJson('["contributor","tutor"]', 'student')).toEqual([
      'student',
      'contributor',
      'tutor',
    ]);
    expect(parseRolesJson('not-valid-json', 'tutor')).toEqual(['tutor', 'student']);
    expect(parseRolesJson(null)).toEqual(['student']);
    expect(serializeRolesJson(['admin', 'contributor'])).toBe(
      '["admin","contributor","student"]'
    );
  });

  it('evaluates union capability helpers correctly', () => {
    expect(hasContributorAccess(['student'])).toBe(false);
    expect(hasContributorAccess(['student', 'contributor'])).toBe(true);
    expect(hasMainContributorAccess(['contributor'])).toBe(false);
    expect(hasMainContributorAccess(['main_contributor'])).toBe(true);
    expect(hasAdminAccess(['main_contributor'])).toBe(false);
    expect(hasAdminAccess(['admin'])).toBe(true);
    expect(isEducatorRole(['student', 'tutor'])).toBe(true);
    expect(isEducatorRole(['student', 'teacher'])).toBe(true);
    expect(isEducatorRole(['student'])).toBe(false);
  });
});

describe('@ants/shared-types — ecosystem & CORS allowlist', () => {
  it('defines canonical ports and subdomains for org, study, and flow', () => {
    expect(ECOSYSTEM_APP_LIST).toHaveLength(3);
    expect(ECOSYSTEM_APPS.org.port).toBe(3000);
    expect(ECOSYSTEM_APPS.study.port).toBe(3001);
    expect(ECOSYSTEM_APPS.flow.port).toBe(3002);
  });

  it('permits localhost dev ports and *.the-ants.org origins while rejecting untrusted domains', () => {
    for (const origin of ALLOWED_CORS_ORIGINS) {
      expect(isAllowedCorsOrigin(origin)).toBe(true);
    }
    expect(isAllowedCorsOrigin('https://preview.the-ants.org')).toBe(true);
    expect(isAllowedCorsOrigin('https://ants-study.thawyezaw.workers.dev')).toBe(true);
    expect(isAllowedCorsOrigin('https://ants-org.thawyezaw.workers.dev')).toBe(true);
    expect(isAllowedCorsOrigin('https://ants-flow.thawyezaw.workers.dev')).toBe(true);
    expect(isAllowedCorsOrigin('https://evil.workers.dev')).toBe(false);
    expect(isAllowedCorsOrigin('https://evil.example.com')).toBe(false);
    expect(isAllowedCorsOrigin('http://the-ants.org.attacker.com')).toBe(false);
    expect(isAllowedCorsOrigin(undefined)).toBe(false);
  });

  it('validates API health and error response schemas', () => {
    const health = ApiHealthResponseSchema.parse({
      status: 'ok',
      service: '@ants/api',
      version: '0.1.0',
      environment: 'development',
      timestamp: new Date().toISOString(),
      cronSchedule: '*/5 * * * *',
      bindings: { d1: true, r2: false },
      apps: [...ECOSYSTEM_APP_LIST],
    });
    expect(health.status).toBe('ok');

    const err = ApiErrorResponseSchema.parse({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
    expect(err.ok).toBe(false);
  });
});

describe('@ants/shared-types — Edexcel IAL Modular Maths (WMA11-SET)', () => {
  it('catalogs all 14 official Edexcel units and all 5 YMA01 applied pairs', () => {
    expect(EDEXCEL_MATHS_UNITS).toHaveLength(14);
    expect(EDEXCEL_MATHS_YMA01_APPLIED_PAIRS).toHaveLength(5);
  });

  it('validates XMA01 (AS Mathematics) 3-unit combinations', () => {
    const valid = validateEdexcelMathsCashIn('XMA01', ['WMA11', 'WMA12', 'WME01']);
    expect(valid.isValid).toBe(true);
    expect(valid.totalUms).toBe(300);

    const invalidApplied = validateEdexcelMathsCashIn('XMA01', ['WMA11', 'WMA12', 'WME02']);
    expect(invalidApplied.isValid).toBe(false);
  });

  it('validates YMA01 (IAL Mathematics) applied pairs and rejects invalid combinations like M1 + M3', () => {
    const valid = validateEdexcelMathsCashIn('YMA01', [
      'WMA11',
      'WMA12',
      'WMA13',
      'WMA14',
      'WME01',
      'WST01',
    ]);
    expect(valid.isValid).toBe(true);
    expect(valid.matchedPairLabel).toContain('WME01 + WST01');

    const invalidPair = validateEdexcelMathsCashIn('YMA01', [
      'WMA11',
      'WMA12',
      'WMA13',
      'WMA14',
      'WME01',
      'WME03',
    ]);
    expect(invalidPair.isValid).toBe(false);
    expect(invalidPair.matchedPairLabel).toBeNull();
  });

  it('validates XFM01 & YFM01 and enforces no unit overlap with primary Maths awards', () => {
    const validXfm = validateEdexcelMathsCashIn(
      'XFM01',
      ['WFM01', 'WME02', 'WST02'],
      ['WMA11', 'WMA12', 'WME01']
    );
    expect(validXfm.isValid).toBe(true);

    const overlappingYfm = validateEdexcelMathsCashIn(
      'YFM01',
      ['WFM01', 'WFM02', 'WME01', 'WME02', 'WST02', 'WDM11'],
      ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WST01']
    );
    expect(overlappingYfm.isValid).toBe(false);
    expect(overlappingYfm.conflictingUnits).toEqual(['WME01']);

    const validYfm = validateEdexcelMathsCashIn(
      'YFM01',
      ['WFM01', 'WFM02', 'WFM03', 'WME02', 'WST02', 'WDM11'],
      ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WST01']
    );
    expect(validYfm.isValid).toBe(true);
    expect(validYfm.totalUms).toBe(600);
  });
});

describe('@ants/shared-types — cross-app Zod domain contracts', () => {
  it('validates calculator snapshots, past papers, countdowns, tasks, timetable, and pomodoro schemas', () => {
    expect(
      GradeCalculationSnapshotSchema.parse({
        boardId: 'edexcel-ial',
        subjectId: 'ial-maths',
        subjectCode: 'YMA01',
        subjectTitle: 'International A-Level Mathematics',
        seriesId: 'may-june-2025',
        rawMarksByPaper: { WMA11: 68, WMA12: 71 },
        totalRaw: 139,
        maxTotalRaw: 150,
        totalUms: 192,
        maxTotalUms: 200,
        percentage: 92.7,
        finalGrade: 'A*',
      }).finalGrade
    ).toBe('A*');

    expect(
      PastPaperAttemptInputSchema.parse({
        subjectId: 'ial-maths',
        paperCode: 'WMA11',
        seriesId: 'mj-2025',
        rawScore: 69,
        maxRaw: 75,
        timed: true,
        weakTopics: ['Integration'],
      }).timed
    ).toBe(true);

    expect(
      ExamCountdownItemSchema.parse({
        id: 'ex-1',
        boardId: 'edexcel-ial',
        paperCode: 'WMA11',
        title: 'Pure Maths 1',
        examDateIso: '2026-05-14',
        examTime24h: '09:00',
        targetGrade: 'A*',
        category: 'official',
        isCustom: false,
        isMock: false,
        colorTag: 'amber',
      }).pinned
    ).toBe(false);

    expect(
      FlowTaskItemSchema.parse({
        id: 't-1',
        title: 'Finish WMA14 past paper',
        priority: 'P1',
        estimatedMinutes: 90,
        createdAt: new Date().toISOString(),
      }).priority
    ).toBe('P1');

    expect(
      TimetableEventItemSchema.parse({
        id: 'blk-1',
        title: 'Deep Focus Block',
        date: '2026-11-21',
        startMinutes: 360,
        endMinutes: 450,
        category: 'deep-work',
        recurrence: 'weekdays',
        telegramReminder: { enabled: true, leadMinutes: 10 },
      }).category
    ).toBe('deep-work');

    expect(
      PomodoroSettingsSchema.parse({
        workMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        autoStartBreaks: false,
        autoStartWork: false,
        dailyGoal: 8,
        notifications: true,
      }).workMinutes
    ).toBe(25);
  });

  it('validates AuthSignUpInputSchema and enforces strict email-only AuthSignInEmailInputSchema', () => {
    const signUp = AuthSignUpInputSchema.parse({
      name: '  Thaw Ye Zaw  ',
      email: 'THAW@The-ANTs.org ',
      password: 'Password123!',
      username: 'Thaw_Ye',
    });
    expect(signUp.name).toBe('Thaw Ye Zaw');
    expect(signUp.email).toBe('thaw@the-ants.org');
    expect(signUp.username).toBe('thaw_ye');
    expect(signUp.academicTrack).toBe('ial');
    expect(signUp.rememberMe).toBe(true);

    expect(
      AuthSignUpInputSchema.safeParse({
        name: 'A',
        email: 'bad-email',
        password: 'short',
      }).success
    ).toBe(false);

    const signIn = AuthSignInEmailInputSchema.parse({
      email: 'Scholar@the-ants.org',
      password: 'Password123!',
      rememberMe: false,
    });
    expect(signIn.email).toBe('scholar@the-ants.org');
    expect(signIn.rememberMe).toBe(false);

    // Reject @username identifiers on strict email-only sign-in
    expect(
      AuthSignInEmailInputSchema.safeParse({
        email: '@thawyezaw',
        password: 'Password123!',
      }).success
    ).toBe(false);

    expect(
      AuthSessionBundleSchema.parse({
        user: {
          id: 'usr_1',
          name: 'Thaw Ye Zaw',
          email: 'thaw@the-ants.org',
          emailVerified: false,
          image: null,
          username: 'thawyezaw',
          role: 'student',
          roles: ['student'],
          createdAt: '2026-11-21T16:00:00.000Z',
          updatedAt: '2026-11-21T16:00:00.000Z',
        },
        session: {
          id: 'ses_1',
          userId: 'usr_1',
          expiresAt: '2026-12-21T16:00:00.000Z',
          createdAt: '2026-11-21T16:00:00.000Z',
          updatedAt: '2026-11-21T16:00:00.000Z',
          ipAddress: null,
          userAgent: null,
        },
        profile: {
          id: 'prof_1',
          userId: 'usr_1',
          username: 'thawyezaw',
          displayName: 'Thaw Ye Zaw',
          headline: 'Pearson Edexcel IAL & AS/A-Level Scholar',
          bio: '',
          institution: 'The ANTs Academic Community',
          curriculumLabel: 'Pearson Edexcel IAL',
          timezone: 'Asia/Yangon',
          preferredApp: 'study',
          role: 'student',
          roles: ['student'],
          xp: 0,
          streakDays: 0,
          telegramStatus: 'unlinked',
          isTutor: false,
        },
      }).user.username
    ).toBe('thawyezaw');
  });

  it('validates R2 storage and Telegram Zod contracts', () => {
    expect(STORAGE_BUCKET_PREFIXES).toEqual([
      'org',
      'articles',
      'activities',
      'avatars',
      'study',
      'private',
    ]);

    const uploadInput = StorageUploadDataUrlInputSchema.parse({
      dataUrl: 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=',
      prefix: 'activities',
      filename: 'hackathon-cover.webp',
    });
    expect(uploadInput.prefix).toBe('activities');

    expect(
      StorageUploadDataUrlInputSchema.safeParse({
        dataUrl: 'https://example.com/not-a-data-url.png',
      }).success
    ).toBe(false);

    expect(
      StorageFileMetadataDtoSchema.parse({
        key: 'activities/2026/hackathon-cover.webp',
        url: '/api/storage/file/activities/2026/hackathon-cover.webp',
        contentType: 'image/webp',
        size: 38,
        etag: '"etag-123"',
        uploadedAt: '2026-11-21T16:30:00.000Z',
        visibility: 'public',
      }).visibility
    ).toBe('public');

    expect(TELEGRAM_VERIFICATION_CODE_REGEX.test('ANT-7K9P')).toBe(true);
    expect(TELEGRAM_VERIFICATION_CODE_REGEX.test('ANT-01IL')).toBe(false);

    expect(TelegramLinkStartInputSchema.parse({ draftHandle: '@student_tg' }).draftHandle).toBe(
      '@student_tg'
    );
    expect(
      TelegramPreferencesUpdateInputSchema.parse({
        defaultLeadMinutes: 15,
        dailyMorningDigest: true,
      }).defaultLeadMinutes
    ).toBe(15);
    expect(TelegramTestPingInputSchema.parse({}).dispatchImmediately).toBe(true);

    expect(
      TelegramStatusDtoSchema.parse({
        status: 'pending',
        handle: '',
        chatId: null,
        botUsername: 'TheANTsFlowBot',
        verificationCode: 'ANT-7K9P',
        codeExpiresAt: '2026-11-21T17:00:00.000Z',
        linkedAt: null,
        startCommand: '/start ANT-7K9P',
        deepLinkUrl: 'https://t.me/TheANTsFlowBot?start=ANT-7K9P',
        preferences: {
          blockReminders: true,
          defaultLeadMinutes: 10,
          dailyMorningDigest: false,
          digestTime: '07:00',
          examCountdownAlerts: true,
          tutorInquiryAlerts: true,
        },
      }).botUsername
    ).toBe('TheANTsFlowBot');

    expect(
      TelegramWebhookUpdateSchema.parse({
        update_id: 901234,
        message: {
          message_id: 42,
          text: '/start ANT-7K9P',
          chat: { id: 987654321, type: 'private', username: 'ayechan_tg' },
          from: { id: 987654321, username: 'ayechan_tg', first_name: 'Aye' },
        },
      }).message?.text
    ).toBe('/start ANT-7K9P');
  });

  it('validates calculator board mappings, catalog DTOs, and saved snapshot contracts', () => {
    expect(toCalculatorBoardId('cambridge-alevel')).toBe('caie-alevel');
    expect(toCalculatorBoardId('cambridge-igcse')).toBe('caie-igcse');
    expect(toCalculatorBoardId('edexcel-ial')).toBe('edexcel-ial');
    expect(toCurriculumBoardId('caie-alevel')).toBe('cambridge-alevel');
    expect(toCurriculumBoardId('caie-igcse')).toBe('cambridge-igcse');
    expect(toCurriculumBoardId('edexcel-igcse')).toBe('edexcel-igcse');

    const catalog = CalculatorCatalogResponseSchema.parse({
      ok: true,
      data: {
        source: 'd1',
        boards: [
          {
            id: 'edexcel-ial',
            shortName: 'Edexcel IAL',
            fullName: 'Pearson Edexcel International Advanced Level',
            scaleBadge: 'UMS · A*–U',
          },
        ],
        seriesOptions: [{ id: 'mj-2025', label: 'May / June 2025', tag: 'Summer' }],
        subjects: [
          {
            id: 'edexcel-ial-maths',
            boardId: 'edexcel-ial',
            code: 'YMA01',
            title: 'IAL Mathematics',
            levelLabel: '6 Units · 600 UMS',
            gradingScale: 'A*-U',
            isModularUms: true,
            maxTotalRaw: 450,
            maxTotalUms: 600,
            aStarRule: {
              minTotalUms: 480,
              minA2Ums: 180,
              a2PaperCodes: ['WMA13', 'WMA14'],
            },
            papers: [
              {
                id: 'wma11',
                code: 'WMA11',
                unitCode: 'WMA11',
                title: 'Pure Mathematics 1',
                maxRaw: 75,
                maxUms: 100,
                weightLabel: '100 UMS',
                defaultRaw: 64,
                level: 'AS',
                seriesPaperCutoffs: {
                  'mj-2025': { passC: 41, gradeA: 55, topGrade: 63 },
                },
                seriesThresholds: {
                  'mj-2025': { 'A*': 63, A: 55, B: 48, C: 41, D: 33, E: 27 },
                },
              },
            ],
            seriesBoundaries: {
              'mj-2025': [
                { grade: 'A*', minScore: 480 },
                { grade: 'A', minScore: 480 },
              ],
            },
          },
        ],
      },
    });
    expect(catalog.data.source).toBe('d1');

    expect(
      CalculatorCalculateInputSchema.parse({
        subjectId: 'edexcel-ial-maths',
        seriesId: 'mj-2025',
        routeId: 'ial-v2',
        perPaperSeriesById: { WMA11: 'jan-2025' },
        rawMarksByPaper: { WMA11: 63 },
      }).subjectId
    ).toBe('edexcel-ial-maths');

    expect(
      CalculatorRouteOptionSchema.parse({
        id: 'ext-v2',
        label: 'Extended · Variant 2',
        awardLevel: 'IGCSE',
        tier: 'Extended',
        variant: 'V2',
        paperIds: ['p2', 'p4'],
        paperWeights: { p2: 1.5, p4: 1.25 },
        maxTotalScore: 200,
        isModularUms: false,
        gradingScale: 'A*-U',
        allowedGrades: ['A*', 'A', 'B', 'C', 'D', 'E', 'F', 'G'],
        seriesBoundaries: {
          'mj-2025': [{ grade: 'A*', minScore: 160 }],
        },
      }).tier
    ).toBe('Extended');

    expect(
      EdexcelMathsSuiteCalculateInputSchema.parse({
        selectedUnitCodes: ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WST01'],
        rawMarksByUnit: { WMA11: 66, WMA12: 64 },
        seriesByUnit: { WMA11: 'jan-2025' },
        defaultSeriesId: 'mj-2025',
        awardMode: 'auto',
      }).awardMode
    ).toBe('auto');

    expect(
      EdexcelMathsSuiteCalculateInputSchema.parse({
        selectedUnitCodes: ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WST01'],
        inputMode: 'ums',
        umsMarksByUnit: { WMA11: 92, WMA12: 88 },
      }).inputMode
    ).toBe('ums');

    expect(
      CalculatorCalculateInputSchema.parse({
        subjectId: 'edexcel-ial-physics',
        routeId: 'YPH11',
        inputMode: 'ums',
        umsMarksByPaper: { WPH11: 112, WPH12: 108 },
      }).inputMode
    ).toBe('ums');

    expect(
      GradeCalculationSnapshotSchema.parse({
        boardId: 'edexcel-ial',
        subjectId: 'edexcel-ial-physics',
        subjectCode: 'YPH11',
        subjectTitle: 'IAL Physics',
        seriesId: 'direct-ums',
        inputMode: 'ums',
        rawMarksByPaper: {},
        umsMarksByPaper: { WPH11: 110 },
        totalRaw: 0,
        maxTotalRaw: 440,
        totalUms: 520,
        maxTotalUms: 600,
        percentage: 87,
        finalGrade: 'A*',
      }).inputMode
    ).toBe('ums');

    expect(
      CalculatorSavedSnapshotDtoSchema.parse({
        id: 'grd_123',
        userId: 'usr_1',
        subjectId: 'edexcel-ial-maths',
        boardId: 'edexcel-ial',
        subjectCode: 'YMA01',
        subjectTitle: 'IAL Mathematics',
        seriesId: 'mj-2025',
        rawMarksByPaper: { WMA11: 63 },
        totalRaw: 380,
        maxTotalRaw: 450,
        totalUms: 520,
        maxTotalUms: 600,
        percentage: 87,
        finalGrade: 'A*',
        createdAt: '2026-11-23T00:00:00.000Z',
      }).finalGrade
    ).toBe('A*');
  });
});
