import { NotFoundView } from '@ants/ui';

export default function StudyNotFoundPage() {
  return (
    <NotFoundView
      app="study"
      primaryHref="/"
      primaryLabel="Back to Study Dashboard"
      quickLinks={[
        { label: 'Curriculum', href: '/curriculum' },
        { label: 'Past Papers', href: '/past-papers' },
        { label: 'Grade Calculator', href: '/calculator' },
        { label: 'Exam Countdown', href: '/countdown' },
      ]}
    />
  );
}
