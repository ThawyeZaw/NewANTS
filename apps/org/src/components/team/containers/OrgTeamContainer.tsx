'use client';

import React from 'react';
import { useOrgShowcaseQuery } from '../../../hooks/useOrgShowcaseQuery';
import { fetchOrgTeam, mapOrgTeamMemberDtoToView } from '../../../lib/org-api';
import type { OrgMemberRoleCategory } from '../../../mocks/showcase-team.mock';
import {
  OrgShowcaseErrorView,
  OrgShowcaseLoadingView,
} from '../../shared/containers/OrgShowcaseStateShell';
import { OrgTeamShowcaseView } from '../views/OrgTeamShowcaseView';

export interface OrgTeamContainerProps {
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
  initialRoleFilter?: 'all' | OrgMemberRoleCategory;
}

export function OrgTeamContainer({
  apiBaseUrl,
  fetchImpl,
  initialRoleFilter = 'all',
}: OrgTeamContainerProps) {
  const { status, data, error, useLocalUrls, reload } = useOrgShowcaseQuery(
    (signal) => fetchOrgTeam({ apiBaseUrl, fetchImpl, signal }),
    [apiBaseUrl, fetchImpl]
  );

  if (status === 'loading') {
    return (
      <OrgShowcaseLoadingView
        activePath="/team"
        layout="list"
        useLocalUrls={useLocalUrls}
        label="Loading team and tutor availability..."
      />
    );
  }

  if (status !== 'ready' || !data) {
    return (
      <OrgShowcaseErrorView
        activePath="/team"
        title="Unable to load team & tutors"
        code={error?.code}
        message={
          error?.message ?? 'Unable to load published team members and tutors from D1.'
        }
        onRetry={reload}
        useLocalUrls={useLocalUrls}
      />
    );
  }

  return (
    <OrgTeamShowcaseView
      members={data.members.map(mapOrgTeamMemberDtoToView)}
      initialRoleFilter={initialRoleFilter}
      useLocalUrls={useLocalUrls}
    />
  );
}
