'use client';

import React, { useEffect, useState } from 'react';
import { useOrgShowcaseQuery } from '../../../hooks/useOrgShowcaseQuery';
import {
  fetchOrgTeamMember,
  mapOrgTeamMemberDtoToView,
  resolveDynamicRouteParam,
} from '../../../lib/org-api';
import {
  OrgShowcaseErrorView,
  OrgShowcaseLoadingView,
} from '../../shared/containers/OrgShowcaseStateShell';
import { OrgTeamMemberDetailView } from '../views/OrgTeamMemberDetailView';

export interface OrgTeamMemberContainerProps {
  username: string;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
}

export function OrgTeamMemberContainer({
  username,
  apiBaseUrl,
  fetchImpl,
}: OrgTeamMemberContainerProps) {
  const [resolvedUsername, setResolvedUsername] = useState(username);

  useEffect(() => {
    setResolvedUsername(resolveDynamicRouteParam(username, '/team/'));
  }, [username]);

  const { status, data, error, useLocalUrls, reload } = useOrgShowcaseQuery(
    (signal) =>
      fetchOrgTeamMember(resolvedUsername, { apiBaseUrl, fetchImpl, signal }),
    [resolvedUsername, apiBaseUrl, fetchImpl]
  );

  if (status === 'loading') {
    return (
      <OrgShowcaseLoadingView
        activePath={`/team/${resolvedUsername}`}
        layout="detail"
        useLocalUrls={useLocalUrls}
        label="Loading member profile..."
      />
    );
  }

  if (status === 'not_found') {
    return (
      <OrgTeamMemberDetailView
        username={resolvedUsername}
        members={[]}
        useLocalUrls={useLocalUrls}
      />
    );
  }

  if (status !== 'ready' || !data) {
    return (
      <OrgShowcaseErrorView
        activePath={`/team/${resolvedUsername}`}
        title="Unable to load team member profile"
        code={error?.code}
        message={
          error?.message ?? 'Unable to load member details from The ANTs API.'
        }
        onRetry={reload}
        useLocalUrls={useLocalUrls}
      />
    );
  }

  return (
    <OrgTeamMemberDetailView
      username={data.member.username}
      members={[mapOrgTeamMemberDtoToView(data.member)]}
      useLocalUrls={useLocalUrls}
    />
  );
}
