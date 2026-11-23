'use client';

import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { MiloCompanionDock } from '@ants/ui';

function StudyMiloDockObserver() {
  const pathname = usePathname() || '/';
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isCalculator = pathname.startsWith('/calculator');

  return (
    <MiloCompanionDock
      app="study"
      pathname={pathname}
      hidden={isAuthRoute}
      bottomOffsetClassName={isCalculator ? 'bottom-24 lg:bottom-5' : 'bottom-20 lg:bottom-5'}
    />
  );
}

/**
 * Floating Duolingo-style corner Milo companion dock across `study.the-ants.org` routes.
 */
export function StudyMiloDockView() {
  return (
    <Suspense fallback={null}>
      <StudyMiloDockObserver />
    </Suspense>
  );
}
