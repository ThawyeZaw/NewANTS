'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';

export type NavigationProgressVariant = 'showcase' | 'workspace';

export interface NavigationProgressViewProps {
  /** Current route key (e.g. `${pathname}?${search}`) observed by the host Next.js app */
  routeKey?: string;
  /** Visual mode: 'showcase' (Editorial with soft amber glow) or 'workspace' (crisp utility hairline) */
  variant?: NavigationProgressVariant;
  /** Additional className for the fixed progress track */
  className?: string;
}

type ProgressPhase = 'idle' | 'sweeping' | 'finishing' | 'fading';

/**
 * Top hairline route navigation indicator (`#16 Magnetism` inspiration).
 * Renders purely visually (`aria-hidden`) without delaying route transitions or trapping sticky containers.
 */
export function NavigationProgressView({
  routeKey,
  variant = 'workspace',
  className,
}: NavigationProgressViewProps) {
  const [phase, setPhase] = useState<ProgressPhase>('idle');
  const phaseRef = useRef<ProgressPhase>('idle');
  const prevRouteKeyRef = useRef<string | undefined>(undefined);
  const finishTimerRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const setSyncedPhase = useCallback((next: ProgressPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const clearAllTimers = useCallback(() => {
    if (finishTimerRef.current !== null) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (safetyTimerRef.current !== null) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const completeSweep = useCallback(() => {
    clearAllTimers();
    setSyncedPhase('finishing');
    finishTimerRef.current = window.setTimeout(() => {
      setSyncedPhase('fading');
      idleTimerRef.current = window.setTimeout(() => {
        setSyncedPhase('idle');
      }, 380);
    }, 180);
  }, [clearAllTimers, setSyncedPhase]);

  const startSweep = useCallback(() => {
    clearAllTimers();
    if (phaseRef.current !== 'idle') {
      setSyncedPhase('idle');
      rafRef.current = window.requestAnimationFrame(() => {
        setSyncedPhase('sweeping');
      });
    } else {
      setSyncedPhase('sweeping');
    }
    // Guarantee the hairline never stalls if a navigation is cancelled or returns to the same route
    safetyTimerRef.current = window.setTimeout(() => {
      completeSweep();
    }, 3000);
  }, [clearAllTimers, completeSweep, setSyncedPhase]);

  useEffect(() => {
    if (prevRouteKeyRef.current === undefined) {
      prevRouteKeyRef.current = routeKey;
      return;
    }
    if (prevRouteKeyRef.current !== routeKey) {
      prevRouteKeyRef.current = routeKey;
      completeSweep();
    }
  }, [routeKey, completeSweep]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const rawTarget = event.target;
      if (!(rawTarget instanceof Element)) return;

      const anchor = rawTarget.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.hasAttribute('download')) return;

      const targetAttr = anchor.getAttribute('target');
      if (targetAttr && targetAttr !== '_self') return;

      const rawHref = anchor.getAttribute('href');
      if (
        !rawHref ||
        rawHref.startsWith('#') ||
        rawHref.startsWith('mailto:') ||
        rawHref.startsWith('tel:') ||
        rawHref.startsWith('javascript:')
      ) {
        return;
      }

      try {
        const nextUrl = new URL(anchor.href, window.location.href);
        if (nextUrl.origin !== window.location.origin) return;
        const currentPath = `${window.location.pathname}${window.location.search}`;
        const nextPath = `${nextUrl.pathname}${nextUrl.search}`;
        if (nextPath === currentPath) return;
        startSweep();
      } catch {
        // Ignore malformed hrefs
      }
    };

    const handlePopState = () => {
      if (phaseRef.current === 'idle') {
        completeSweep();
      }
    };

    document.addEventListener('click', handleDocumentClick);
    window.addEventListener('popstate', handlePopState);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      window.removeEventListener('popstate', handlePopState);
      clearAllTimers();
    };
  }, [startSweep, completeSweep, clearAllTimers]);

  return (
    <>
      <div
        aria-hidden="true"
        data-testid="navigation-route-curtain"
        data-variant={variant}
        data-phase={phase}
        data-state={phase}
        className="ants-route-curtain"
      />
      <div
        aria-hidden="true"
        data-testid="navigation-progress-bar"
        data-variant={variant}
        data-phase={phase}
        className={cn('ants-route-bar', className)}
      >
        <div className="ants-route-bar-indicator" data-state={phase} />
      </div>
    </>
  );
}

