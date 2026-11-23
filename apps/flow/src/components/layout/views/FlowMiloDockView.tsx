'use client';

import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { MiloCompanionDock } from '@ants/ui';

function FlowMiloDockObserver() {
  const pathname = usePathname() || '/';
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');

  return (
    <MiloCompanionDock
      app="flow"
      pathname={pathname}
      hidden={isAuthRoute}
      bottomOffsetClassName="bottom-20 md:bottom-5"
    />
  );
}

/**
 * Floating Duolingo-style corner Milo companion dock across `flow.the-ants.org` routes.
 */
export function FlowMiloDockView() {
  return (
    <Suspense fallback={null}>
      <FlowMiloDockObserver />
    </Suspense>
  );
}
