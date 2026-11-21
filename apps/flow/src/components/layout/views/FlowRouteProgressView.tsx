'use client';

import React, { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { NavigationProgressView } from '@ants/ui';

function FlowRouteProgressObserver() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? '';
  const routeKey = search ? `${pathname}?${search}` : pathname;

  return <NavigationProgressView routeKey={routeKey} variant="workspace" />;
}

/**
 * Top hairline navigation indicator for `flow.the-ants.org` routes (`Operate`).
 */
export function FlowRouteProgressView() {
  return (
    <Suspense fallback={<NavigationProgressView variant="workspace" />}>
      <FlowRouteProgressObserver />
    </Suspense>
  );
}

