'use client';

import React from 'react';
import { useOrgShowcaseQuery } from '../../../hooks/useOrgShowcaseQuery';
import {
  fetchOrgActivities,
  mapOrgActivityDtoToView,
} from '../../../lib/org-api';
import type { OrgActivityCategory } from '../../../mocks/showcase-content.mock';
import {
  OrgShowcaseErrorView,
  OrgShowcaseLoadingView,
} from '../../shared/containers/OrgShowcaseStateShell';
import { OrgActivitiesView } from '../views/OrgActivitiesView';

export interface OrgActivitiesContainerProps {
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
  initialCategory?: 'all' | OrgActivityCategory;
}

export function OrgActivitiesContainer({
  apiBaseUrl,
  fetchImpl,
  initialCategory = 'all',
}: OrgActivitiesContainerProps) {
  const { status, data, error, useLocalUrls, reload } = useOrgShowcaseQuery(
    (signal) => fetchOrgActivities({ apiBaseUrl, fetchImpl, signal }),
    [apiBaseUrl, fetchImpl]
  );

  if (status === 'loading') {
    return (
      <OrgShowcaseLoadingView
        activePath="/activities"
        layout="list"
        useLocalUrls={useLocalUrls}
        label="Loading community activities..."
      />
    );
  }

  if (status !== 'ready' || !data) {
    return (
      <OrgShowcaseErrorView
        activePath="/activities"
        title="Unable to load community activities"
        code={error?.code}
        message={
          error?.message ?? 'Unable to load published community activities from D1.'
        }
        onRetry={reload}
        useLocalUrls={useLocalUrls}
      />
    );
  }

  return (
    <OrgActivitiesView
      activities={data.activities.map(mapOrgActivityDtoToView)}
      initialCategory={initialCategory}
      useLocalUrls={useLocalUrls}
    />
  );
}
