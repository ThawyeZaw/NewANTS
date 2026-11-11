import { describe, expect, it } from 'vitest';
import {
  AppSwitcher,
  AuthFormView,
  Badge,
  BrandHeaderBadge,
  Button,
  Card,
  Checkbox,
  cn,
  DesignSystemShowcaseView,
  Input,
  MOCK_ADMIN_USER,
  MOCK_AUTHENTICATED_USER,
  MOCK_DESIGN_SYSTEM_DATA,
  MOCK_ECOSYSTEM_APPS,
  Modal,
  Tabs,
  ThemeToggle,
  UserMenuView,
} from '../index';

describe('@ants/ui [ZYY-1.1] & [ZYY-1.2] Primitives & Ecosystem Chrome', () => {
  it('concatenates class names cleanly with cn()', () => {
    const isHidden = Boolean(0);
    expect(cn('bg-background', isHidden && 'hidden', undefined, 'text-foreground')).toBe(
      'bg-background text-foreground'
    );
  });

  it('exports all core [ZYY-1.1] presentational primitives', () => {
    expect(ThemeToggle).toBeDefined();
    expect(Button).toBeDefined();
    expect(Card).toBeDefined();
    expect(Badge).toBeDefined();
    expect(Input).toBeDefined();
    expect(Checkbox).toBeDefined();
    expect(Tabs).toBeDefined();
    expect(Modal).toBeDefined();
    expect(DesignSystemShowcaseView).toBeDefined();
  });

  it('exports all [ZYY-1.2] ecosystem chrome views and mock fixtures', () => {
    expect(BrandHeaderBadge).toBeDefined();
    expect(AppSwitcher).toBeDefined();
    expect(AuthFormView).toBeDefined();
    expect(UserMenuView).toBeDefined();
    expect(MOCK_ECOSYSTEM_APPS).toHaveLength(3);
    expect(MOCK_AUTHENTICATED_USER.username).toBe('zyylinnhtet');
    expect(MOCK_AUTHENTICATED_USER.telegramConnected).toBe(false);
    expect(MOCK_ADMIN_USER.roles).toContain('admin');
    expect(MOCK_ADMIN_USER.telegramConnected).toBe(false);
  });

  it('provides realistic mock data for DesignSystemShowcaseView', () => {
    expect(MOCK_DESIGN_SYSTEM_DATA.systemNameLight).toBe('The ANTs Academic System');
    expect(MOCK_DESIGN_SYSTEM_DATA.systemNameDark).toBe('Amber Academic Studio');
    expect(MOCK_DESIGN_SYSTEM_DATA.sampleSubjects.length).toBeGreaterThan(0);
    expect(MOCK_DESIGN_SYSTEM_DATA.sampleChecklist.length).toBeGreaterThan(0);
  });
});
