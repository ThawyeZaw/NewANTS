'use client';

import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { MiloCompanionDock } from '@ants/ui';

function OrgMiloDockObserver() {
  const pathname = usePathname() || '/';
  const isCms = pathname.startsWith('/cms') || pathname.startsWith('/admin');
  const isCalculator = pathname.startsWith('/calculator');

  return (
    <MiloCompanionDock
      app="org"
      pathname={pathname}
      hidden={isCms}
      bottomOffsetClassName={isCalculator ? 'bottom-24 lg:bottom-5' : 'bottom-4 sm:bottom-5'}
    />
  );
}

/**
 * Floating Duolingo-style corner Milo companion dock across `the-ants.org` showcase routes.
 */
export function OrgMiloDockView() {
  return (
    <Suspense fallback={null}>
      <OrgMiloDockObserver />
    </Suspense>
  );
}
