import type { Metadata } from 'next';
import React from 'react';
import { OrgActivityDetailContainer } from '../../../../components/activities/containers/OrgActivityDetailContainer';
import { findActivityBySlug } from '../../../../lib/showcase';
import { MOCK_ORG_ACTIVITIES } from '../../../../mocks/showcase-content.mock';

export function generateStaticParams() {
  return MOCK_ORG_ACTIVITIES.map((activity) => ({ slug: activity.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const activity = findActivityBySlug(MOCK_ORG_ACTIVITIES, slug);
  if (!activity) {
    return {
      title: 'Activity Recap | The ANTs',
    };
  }
  return {
    title: `${activity.title} | The ANTs`,
    description: activity.summary,
  };
}

export default async function OrgActivityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <OrgActivityDetailContainer slug={slug} />;
}

