// @ants/ui — Shared Stitch Design System (Light + Amber Dark semantic CSS tokens), Core Primitives & Ecosystem Chrome

export { cn } from './utils/cn';

export {
  ThemeToggle,
  type ThemeMode,
  type ThemeToggleProps,
} from './primitives/ThemeToggle';

export {
  Button,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
} from './primitives/Button';

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  type CardHeaderProps,
  type CardProps,
  type CardVariant,
} from './primitives/Card';

export {
  Badge,
  type BadgeProps,
  type BadgeVariant,
} from './primitives/Badge';

export {
  Input,
  type InputProps,
} from './primitives/Input';

export {
  Checkbox,
  type CheckboxProps,
} from './primitives/Checkbox';

export {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type TabItem,
  type TabsContentProps,
  type TabsProps,
  type TabsTriggerProps,
  type TabsVariant,
} from './primitives/Tabs';

export {
  Modal,
  type ModalProps,
  type ModalSize,
} from './primitives/Modal';

export {
  MOCK_DESIGN_SYSTEM_DATA,
  type DesignSystemShowcaseMockData,
  type MockSyllabusChecklistItem,
} from './mocks/design-system.mock';

export {
  MOCK_ADMIN_USER,
  MOCK_AUTHENTICATED_USER,
  MOCK_ECOSYSTEM_APPS,
  MOCK_ECOSYSTEM_SHORTCUTS,
  type EcosystemAppId,
  type EcosystemAppItem,
  type EcosystemQuickShortcut,
  type MockUserProfile,
  type UserRole,
} from './mocks/ecosystem-chrome.mock';

export {
  BrandHeaderBadge,
  type BrandHeaderBadgeProps,
} from './views/BrandHeaderBadge';

export {
  AppSwitcher,
  type AppSwitcherProps,
} from './views/AppSwitcher';

export {
  AuthFormView,
  type AcademicTrackOption,
  type AuthFormMode,
  type AuthFormSubmitPayload,
  type AuthFormViewProps,
} from './views/AuthFormView';

export {
  UserMenuView,
  type UserMenuViewProps,
} from './views/UserMenuView';

export {
  DesignSystemShowcaseView,
  type DesignSystemShowcaseViewProps,
} from './views/DesignSystemShowcaseView';
