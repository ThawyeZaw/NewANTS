import { describe, expect, it } from 'vitest';
import { StudySettingsPageView } from '../components/account/views/StudySettingsPageView';
import { StudyAuthPageView } from '../components/auth/views/StudyAuthPageView';

describe('@ants/study Authentication & Account Settings Views', () => {
  it('exports StudyAuthPageView (/login, /signup) and StudySettingsPageView (/settings)', () => {
    expect(StudyAuthPageView).toBeDefined();
    expect(StudySettingsPageView).toBeDefined();
  });
});

