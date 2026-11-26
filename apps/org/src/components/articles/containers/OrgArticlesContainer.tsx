'use client';

import React from 'react';
import { useOrgShowcaseQuery } from '../../../hooks/useOrgShowcaseQuery';
import {
  fetchOrgArticles,
  mapOrgArticleDtoToView,
  mapOrgTeamMemberDtoToView,
} from '../../../lib/org-api';
import type { OrgArticleCategory } from '../../../mocks/showcase-content.mock';
import {
  OrgShowcaseErrorView,
  OrgShowcaseLoadingView,
} from '../../shared/containers/OrgShowcaseStateShell';
import { OrgArticlesView } from '../views/OrgArticlesView';

export interface OrgArticlesContainerProps {
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
  initialCategory?: 'all' | OrgArticleCategory;
}

export function OrgArticlesContainer({
  apiBaseUrl,
  fetchImpl,
  initialCategory = 'all',
}: OrgArticlesContainerProps) {
  const { status, data, error, useLocalUrls, reload } = useOrgShowcaseQuery(
    (signal) => fetchOrgArticles({ apiBaseUrl, fetchImpl, signal }),
    [apiBaseUrl, fetchImpl]
  );

  if (status === 'loading') {
    return (
      <OrgShowcaseLoadingView
        activePath="/articles"
        layout="list"
        useLocalUrls={useLocalUrls}
        label="Loading articles and study guides..."
      />
    );
  }

  if (status !== 'ready' || !data) {
    return (
      <OrgShowcaseErrorView
        activePath="/articles"
        title="Unable to load articles"
        code={error?.code}
        message={error?.message ?? 'Unable to load published articles from D1.'}
        onRetry={reload}
        useLocalUrls={useLocalUrls}
      />
    );
  }

  return (
    <OrgArticlesView
      articles={data.articles.map(mapOrgArticleDtoToView)}
      teamMembers={data.authors.map(mapOrgTeamMemberDtoToView)}
      initialCategory={initialCategory}
      useLocalUrls={useLocalUrls}
    />
  );
}
