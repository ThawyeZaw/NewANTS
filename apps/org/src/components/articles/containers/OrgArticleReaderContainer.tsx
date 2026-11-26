'use client';

import React, { useEffect, useState } from 'react';
import { useOrgShowcaseQuery } from '../../../hooks/useOrgShowcaseQuery';
import {
  fetchOrgArticleDetail,
  mapOrgArticleDtoToView,
  resolveDynamicRouteParam,
} from '../../../lib/org-api';
import {
  OrgShowcaseErrorView,
  OrgShowcaseLoadingView,
} from '../../shared/containers/OrgShowcaseStateShell';
import { OrgArticleReaderView } from '../views/OrgArticleReaderView';

export interface OrgArticleReaderContainerProps {
  slug: string;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
}

export function OrgArticleReaderContainer({
  slug,
  apiBaseUrl,
  fetchImpl,
}: OrgArticleReaderContainerProps) {
  const [resolvedSlug, setResolvedSlug] = useState(slug);

  useEffect(() => {
    setResolvedSlug(resolveDynamicRouteParam(slug, '/articles/'));
  }, [slug]);

  const { status, data, error, useLocalUrls, reload } = useOrgShowcaseQuery(
    (signal) =>
      fetchOrgArticleDetail(resolvedSlug, { apiBaseUrl, fetchImpl, signal }),
    [resolvedSlug, apiBaseUrl, fetchImpl]
  );

  if (status === 'loading') {
    return (
      <OrgShowcaseLoadingView
        activePath={`/articles/${resolvedSlug}`}
        layout="detail"
        useLocalUrls={useLocalUrls}
        label="Loading article..."
      />
    );
  }

  if (status === 'not_found') {
    return (
      <OrgArticleReaderView
        slug={resolvedSlug}
        articles={[]}
        useLocalUrls={useLocalUrls}
      />
    );
  }

  if (status !== 'ready' || !data) {
    return (
      <OrgShowcaseErrorView
        activePath={`/articles/${resolvedSlug}`}
        title="Unable to load article"
        code={error?.code}
        message={error?.message ?? 'Unable to load article content from The ANTs API.'}
        onRetry={reload}
        useLocalUrls={useLocalUrls}
      />
    );
  }

  return (
    <OrgArticleReaderView
      slug={data.article.slug}
      articles={[data.article, ...data.relatedArticles].map(mapOrgArticleDtoToView)}
      useLocalUrls={useLocalUrls}
    />
  );
}
