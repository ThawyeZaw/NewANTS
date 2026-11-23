import { NotFoundView } from '@ants/ui';

export default function OrgNotFoundPage() {
  return (
    <NotFoundView
      app="org"
      primaryHref="/"
      primaryLabel="Back to The ANTs"
      quickLinks={[
        { label: 'Grade Calculator', href: '/calculator' },
        { label: 'Team & Tutors', href: '/team' },
        { label: 'Activities', href: '/activities' },
        { label: 'Articles', href: '/articles' },
      ]}
    />
  );
}
