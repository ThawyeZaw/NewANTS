'use client';

import React, { useEffect, useState } from 'react';
import { useOrgShowcaseQuery } from '../../../hooks/useOrgShowcaseQuery';
import {
  fetchOrgActivityDetail,
  mapOrgActivityDtoToView,
  resolveDynamicRouteParam,
} from '../../../lib/org-api';
import {
  OrgShowcaseErrorView,
  OrgShowcaseLoadingView,
} from '../../shared/containers/OrgShowcaseStateShell';
import { OrgActivityDetailView } from '../views/OrgActivityDetailView';

export interface OrgActivityDetailContainerProps {
  slug: string;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
}

export function OrgActivityDetailContainer({
  slug,
  apiBaseUrl,
  fetchImpl,
}: OrgActivityDetailContainerProps) {
  const [resolvedSlug, setResolvedSlug] = useState(slug);

  useEffect(() => {
    setResolvedSlug(resolveDynamicRouteParam(slug, '/activities/'));
  }, [slug]);

  const { status, data, error, useLocalUrls, reload } = useOrgShowcaseQuery(
    (signal) =>
      fetchOrgActivityDetail(resolvedSlug, { apiBaseUrl, fetchImpl, signal }),
    [resolvedSlug, apiBaseUrl, fetchImpl]
  );

  if (status === 'loading') {
    return (
      <OrgShowcaseLoadingView
        activePath={`/activities/${resolvedSlug}`}
        layout="detail"
        useLocalUrls={useLocalUrls}
        label="Loading activity recap..."
      />
    );
  }

  if (status === 'not_found') {
    return (
      <OrgActivityDetailView
        slug={resolvedSlug}
        activities={[]}
        useLocalUrls={useLocalUrls}
      />
    );
  }

  if (status !== 'ready' || !data) {
    return (
      <OrgShowcaseErrorView
        activePath={`/activities/${resolvedSlug}`}
        title="Unable to load activity recap"
        code={error?.code}
        message={
          error?.message ?? 'Unable to load activity details from The ANTs API.'
        }
        onRetry={reload}
        useLocalUrls={useLocalUrls}
      />
    );
  }

  return (
    <OrgActivityDetailView
      slug={data.activity.slug}
      activities={[data.activity, ...data.relatedActivities].map(
        mapOrgActivityDtoToView
      )}
      useLocalUrls={useLocalUrls}
    />
  );
}
