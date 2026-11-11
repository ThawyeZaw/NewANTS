import type { Metadata } from 'next';
import { normalizeProfileHandle } from '@ants/ui';
import { FlowProfilePageView } from '../../components/account/views/FlowProfilePageView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const clean = normalizeProfileHandle(handle) || 'profile';
  return {
    title: `@${clean} · Public Profile & Schedule — The ANTs`,
    description: `Public academic portfolio, verified credentials, and tutoring availability for @${clean} across The ANTs ecosystem.`,
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  return <FlowProfilePageView handle={handle} />;
}

