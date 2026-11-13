'use client';

import React, { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { NavigationProgressView } from '@ants/ui';

function OrgRouteProgressObserver() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? '';
  const routeKey = search ? `${pathname}?${search}` : pathname;

  return <NavigationProgressView routeKey={routeKey} variant="showcase" />;
}

/**
 * Top amber hairline navigation indicator for `the-ants.org` routes (`#16 Magnetism`).
 */
export function OrgRouteProgressView() {
  return (
    <Suspense fallback={<NavigationProgressView variant="showcase" />}>
      <OrgRouteProgressObserver />
    </Suspense>
  );
}

