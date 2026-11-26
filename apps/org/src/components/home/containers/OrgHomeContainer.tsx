'use client';

import React from 'react';
import { useOrgShowcaseQuery } from '../../../hooks/useOrgShowcaseQuery';
import { fetchOrgHome, mapOrgHomeDtoToLandingData } from '../../../lib/org-api';
import {
  OrgShowcaseErrorView,
  OrgShowcaseLoadingView,
} from '../../shared/containers/OrgShowcaseStateShell';
import { OrgHomeLandingView } from '../views/OrgHomeLandingView';

export interface OrgHomeContainerProps {
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
  productsVideoUrl?: string;
  productsPosterUrl?: string;
}

export function OrgHomeContainer({
  apiBaseUrl,
  fetchImpl,
  productsVideoUrl,
  productsPosterUrl,
}: OrgHomeContainerProps) {
  const { status, data, error, useLocalUrls, reload } = useOrgShowcaseQuery(
    (signal) => fetchOrgHome({ apiBaseUrl, fetchImpl, signal }),
    [apiBaseUrl, fetchImpl]
  );

  if (status === 'loading') {
    return (
      <OrgShowcaseLoadingView
        activePath="/"
        layout="home"
        useLocalUrls={useLocalUrls}
        label="Loading The ANTs showcase..."
      />
    );
  }

  if (status !== 'ready' || !data) {
    return (
      <OrgShowcaseErrorView
        activePath="/"
        code={error?.code}
        message={
          error?.message ?? 'Unable to load organization showcase data from D1.'
        }
        onRetry={reload}
        useLocalUrls={useLocalUrls}
      />
    );
  }

  return (
    <OrgHomeLandingView
      data={mapOrgHomeDtoToLandingData(data)}
      useLocalUrls={useLocalUrls}
      productsVideoUrl={productsVideoUrl}
      productsPosterUrl={productsPosterUrl}
    />
  );
}
