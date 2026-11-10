import { describe, expect, it } from 'vitest';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  cn,
  DesignSystemShowcaseView,
  Input,
  MOCK_DESIGN_SYSTEM_DATA,
  Modal,
  Tabs,
  ThemeToggle,
} from '../index';

describe('@ants/ui [ZYY-1.1] Core Primitives & Design Tokens', () => {
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

  it('provides realistic mock data for DesignSystemShowcaseView', () => {
    expect(MOCK_DESIGN_SYSTEM_DATA.systemNameLight).toBe('The ANTs Academic System');
    expect(MOCK_DESIGN_SYSTEM_DATA.systemNameDark).toBe('Amber Academic Studio');
    expect(MOCK_DESIGN_SYSTEM_DATA.sampleSubjects.length).toBeGreaterThan(0);
    expect(MOCK_DESIGN_SYSTEM_DATA.sampleChecklist.length).toBeGreaterThan(0);
  });
});
