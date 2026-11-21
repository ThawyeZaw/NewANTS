'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';

export interface ScrollRevealProps {
  /** Content revealed once as it scrolls into view */
  children: React.ReactNode;
  /** Semantic host element */
  as?: 'div' | 'section' | 'article';
  /** Optional stagger delay in ms (kept small, 0-120ms) */
  delayMs?: number;
  /** Additional CSS classes */
  className?: string;
  /** Optional element id */
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'data-testid'?: string;
}

type RevealState = 'ready' | 'pending' | 'visible';

/**
 * One-shot scroll-triggered reveal wrapper.
 * Renders at full opacity during SSR and above the fold; below-the-fold sections reveal smoothly once.
 */
export function ScrollReveal({
  children,
  as = 'div',
  delayMs = 0,
  className,
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'data-testid': dataTestId,
}: ScrollRevealProps) {
  const [revealState, setRevealState] = useState<RevealState>('ready');
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || typeof window === 'undefined') return;

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (
      prefersReducedMotion ||
      typeof IntersectionObserver === 'undefined' ||
      Boolean(window.location.hash)
    ) {
      setRevealState('ready');
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.88) {
      setRevealState('ready');
      return;
    }

    setRevealState('pending');

    let settled = false;
    const reveal = () => {
      if (settled) return;
      settled = true;
      setRevealState('visible');
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top <= window.innerHeight * 0.96) {
            reveal();
            observer.disconnect();
            window.removeEventListener('scroll', handleScrollFallback);
            break;
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -36px 0px' }
    );

    const handleScrollFallback = () => {
      if (settled) return;
      const currentRect = el.getBoundingClientRect();
      if (currentRect.top <= window.innerHeight * 0.94) {
        reveal();
        observer.disconnect();
        window.removeEventListener('scroll', handleScrollFallback);
      }
    };

    observer.observe(el);
    window.addEventListener('scroll', handleScrollFallback, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScrollFallback);
    };
  }, []);

  const Tag = as;
  const style =
    delayMs > 0
      ? ({ '--ants-reveal-delay': `${delayMs}ms` } as React.CSSProperties)
      : undefined;

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        elementRef.current = node;
      }}
      id={id}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      data-testid={dataTestId}
      data-reveal-state={revealState}
      style={style}
      className={cn('ants-reveal', className)}
    >
      {children}
    </Tag>
  );
}

