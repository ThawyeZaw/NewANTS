'use client';

import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react';

export interface IndicatorRect {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

const EMPTY_RECT: IndicatorRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  visible: false,
};

/**
 * Stores the last measured indicator geometry per persistent group key so multi-page
 * App Router shells (e.g., OrgNavbarView, FlowShellView, StudyShellView) can smoothly
 * glide from the previous route's active link to the new route's active link across remounts.
 */
const LAST_INDICATOR_RECTS = new Map<string, IndicatorRect>();

export interface UseSlidingIndicatorOptions {
  /** Selector matching the currently active child element inside containerRef */
  activeSelector?: string;
  /** Optional persistent key to preserve indicator continuity across route component remounts */
  persistKey?: string;
}

export function useSlidingIndicator(
  containerRef: RefObject<HTMLElement | null>,
  activeKey: string | number | null | undefined,
  options: UseSlidingIndicatorOptions = {}
): { rect: IndicatorRect; ready: boolean; animate: boolean } {
  const {
    activeSelector = '[aria-selected="true"], [aria-current="page"], [data-active="true"]',
    persistKey,
  } = options;

  const [rect, setRect] = useState<IndicatorRect>(() => {
    if (persistKey) {
      const saved = LAST_INDICATOR_RECTS.get(persistKey);
      if (saved && saved.visible) {
        return saved;
      }
    }
    return EMPTY_RECT;
  });
  const [ready, setReady] = useState(false);
  const [animate, setAnimate] = useState(Boolean(persistKey && LAST_INDICATOR_RECTS.has(persistKey)));

  const measureActiveRect = useCallback((): IndicatorRect => {
    const container = containerRef.current;
    if (!container) return EMPTY_RECT;
    const activeEl = container.querySelector<HTMLElement>(activeSelector);
    if (!activeEl) return EMPTY_RECT;

    // Prefer offset metrics when container is the offsetParent so transforms don't skew measurement
    if (activeEl.offsetParent === container) {
      return {
        x: activeEl.offsetLeft,
        y: activeEl.offsetTop,
        width: activeEl.offsetWidth,
        height: activeEl.offsetHeight,
        visible: activeEl.offsetWidth > 0 && activeEl.offsetHeight > 0,
      };
    }

    const parentRect = container.getBoundingClientRect();
    const childRect = activeEl.getBoundingClientRect();
    return {
      x: childRect.left - parentRect.left + container.scrollLeft,
      y: childRect.top - parentRect.top + container.scrollTop,
      width: childRect.width,
      height: childRect.height,
      visible: childRect.width > 0 && childRect.height > 0,
    };
  }, [containerRef, activeSelector]);

  useLayoutEffect(() => {
    const next = measureActiveRect();
    if (!next.visible) {
      setRect(EMPTY_RECT);
      return;
    }

    const prevSaved = persistKey ? LAST_INDICATOR_RECTS.get(persistKey) : undefined;
    if (
      persistKey &&
      !ready &&
      prevSaved &&
      prevSaved.visible &&
      (Math.abs(prevSaved.x - next.x) > 1 ||
        Math.abs(prevSaved.y - next.y) > 1 ||
        Math.abs(prevSaved.width - next.width) > 1)
    ) {
      setRect(prevSaved);
      setReady(true);
      setAnimate(true);
      let innerRaf = 0;
      const outerRaf = window.requestAnimationFrame(() => {
        innerRaf = window.requestAnimationFrame(() => {
          setRect(next);
          LAST_INDICATOR_RECTS.set(persistKey, next);
        });
      });
      return () => {
        window.cancelAnimationFrame(outerRaf);
        if (innerRaf) window.cancelAnimationFrame(innerRaf);
      };
    }

    setRect(next);
    if (persistKey) {
      LAST_INDICATOR_RECTS.set(persistKey, next);
    }
    if (!ready) {
      setReady(true);
      const raf = window.requestAnimationFrame(() => setAnimate(true));
      return () => window.cancelAnimationFrame(raf);
    }
    setAnimate(true);
  }, [activeKey, measureActiveRect, persistKey, ready]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const handleResize = () => {
      const updated = measureActiveRect();
      if (updated.visible) {
        setRect(updated);
        setReady(true);
        if (persistKey) {
          LAST_INDICATOR_RECTS.set(persistKey, updated);
        }
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    window.addEventListener('resize', handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [containerRef, measureActiveRect, persistKey]);

  return { rect, ready, animate };
}
