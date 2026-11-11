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

export {
  ACCOUNT_PROFILE_STORAGE_KEY,
  ACCOUNT_WEEKDAYS,
  TUTOR_SLOT_HOURS,
  applyTutorSchedulePreset,
  buildTelegramBotDeepLink,
  buildTelegramInquiryUrl,
  cloneTutorSchedule,
  completeTelegramVerification,
  computeProfileCompleteness,
  createEmptyTutorSchedule,
  cycleAvailabilityStatus,
  formatSlotHourLabel,
  formatSlotRangeLabel,
  generateTelegramVerificationCode,
  hasTutorRole,
  loadAccountStorageState,
  normalizeProfileHandle,
  normalizeTelegramHandle,
  paintTutorSlotRect,
  renameAccountStorageProfile,
  sanitizeAccountStorageState,
  sanitizeAccountUsernameInput,
  saveAccountStorageState,
  setTutorSlotStatus,
  startTelegramLinking,
  summarizeTutorSchedule,
  unlinkTelegramAccount,
  validateAccountUsername,
  type AccountProfileStorageState,
  type AvailabilityStatus,
  type CertificationItem,
  type PortfolioHighlightItem,
  type ProfileSectionVisibility,
  type SharedUserProfileData,
  type TelegramAccountState,
  type TelegramConnectionStatus,
  type TelegramLeadMinutes,
  type TelegramNotificationPreferences,
  type TutorScheduleMap,
  type TutorSchedulePresetId,
  type WeekdayKey,
} from './lib/account';

export {
  MOCK_SHARED_PROFILES,
  STUDENT_PROFILE_MOCK,
  THAW_PROFILE_MOCK,
  ZYY_PROFILE_MOCK,
  createInitialAccountStorageState,
} from './mocks/account-profile.mock';

export {
  TutorSlotPainterView,
  type TutorSlotPainterViewProps,
} from './views/TutorSlotPainterView';

export {
  TelegramConnectCardView,
  type TelegramConnectCardViewProps,
} from './views/TelegramConnectCardView';

export {
  AccountSettingsView,
  type AccountSettingsViewProps,
  type SettingsTabId,
} from './views/AccountSettingsView';

export {
  UserProfileView,
  type PublicProfileSwitchItem,
  type UserProfileViewProps,
} from './views/UserProfileView';
