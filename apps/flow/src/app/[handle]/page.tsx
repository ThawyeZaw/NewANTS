import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MOCK_SHARED_PROFILES, normalizeProfileHandle } from '@ants/ui';
import { FlowProfileContainer } from '../../components/account/containers/FlowProfileContainer';

export function generateStaticParams() {
  return Object.keys(MOCK_SHARED_PROFILES).map((username) => ({
    handle: `@${username}`,
  }));
}

function decodeRouteHandle(rawHandle: string): string {
  try {
    return decodeURIComponent(rawHandle);
  } catch {
    return rawHandle;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const decoded = decodeRouteHandle(handle);
  if (!decoded.startsWith('@')) {
    return {
      title: 'Page Not Found · Flow — The ANTs Productivity Studio',
    };
  }
  const clean = normalizeProfileHandle(decoded) || 'profile';
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
  const decoded = decodeRouteHandle(handle);
  if (!decoded.startsWith('@')) {
    notFound();
  }
  return <FlowProfileContainer handle={decoded} />;
}

