// @ants/ui — Shared Stitch Design System (Light + Amber Dark semantic CSS tokens) & Core Primitives

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
  DesignSystemShowcaseView,
  type DesignSystemShowcaseViewProps,
} from './views/DesignSystemShowcaseView';
