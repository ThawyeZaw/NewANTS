import { NotFoundView } from '@ants/ui';

export default function FlowNotFoundPage() {
  return (
    <NotFoundView
      app="flow"
      primaryHref="/pomodoro"
      primaryLabel="Back to Flow Pomodoro"
      quickLinks={[
        { label: 'Timetable', href: '/timetable' },
        { label: 'Tasks', href: '/tasks' },
        { label: 'Settings', href: '/settings' },
      ]}
    />
  );
}
