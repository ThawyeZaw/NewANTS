'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellOff, Minus, X } from 'lucide-react';
import {
  ANTS_MILO_CHEER_EVENT,
  DEFAULT_MILO_COMPANION_PREFS,
  MILO_DRAG_QUIPS,
  clampMiloDragPosition,
  getRouteMiloQuips,
  loadMiloCompanionPrefs,
  saveMiloCompanionPrefs,
  type MiloCheerPayload,
  type MiloCompanionPrefs,
  type MiloDockEdge,
} from '../lib/milo';
import type { EcosystemAppId } from '../mocks/ecosystem-chrome.mock';
import { cn } from '../utils/cn';
import {
  ANT_MASCOT_NAME,
  AntMascot,
  type AntMascotMood,
  type AntMascotPropVariant,
} from './AntMascotView';

export interface MiloCompanionDockViewProps {
  /** Host application ('org' | 'study' | 'flow') */
  app: EcosystemAppId;
  /** Current route pathname used to tailor Milo's idle quips */
  pathname?: string;
  /** Temporarily hide the dock on distracting/auth routes */
  hidden?: boolean;
  /** Tailwind bottom/offset classes so the dock clears mobile sticky navbars */
  bottomOffsetClassName?: string;
  className?: string;
}

const DRAG_THRESHOLD_PX = 6;
const MILO_TRIGGER_DEFAULT_SIZE = 64;

export function MiloCompanionDockView({
  app,
  pathname = '/',
  hidden = false,
  bottomOffsetClassName = 'bottom-4 sm:bottom-5',
  className,
}: MiloCompanionDockViewProps) {
  const [prefs, setPrefs] = useState<MiloCompanionPrefs>(DEFAULT_MILO_COMPANION_PREFS);
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [quipIndex, setQuipIndex] = useState(0);
  const [activeCheer, setActiveCheer] = useState<MiloCheerPayload | null>(null);
  const [isHopping, setIsHopping] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCoords, setDragCoords] = useState<{ left: number; top: number } | null>(null);
  const [viewportHeight, setViewportHeight] = useState(900);

  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const cheerTimerRef = useRef<number | null>(null);
  const hopTimerRef = useRef<number | null>(null);
  const burstTimerRef = useRef<number | null>(null);
  const dragQuipRef = useRef(0);
  const didDragRef = useRef(false);
  const dragStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
    dockSize: number;
  } | null>(null);
  const cleanupDragListenersRef = useRef<(() => void) | null>(null);

  const triggerHop = () => {
    setIsHopping(false);
    if (typeof window === 'undefined') return;
    if (hopTimerRef.current !== null) {
      window.clearTimeout(hopTimerRef.current);
    }
    window.requestAnimationFrame(() => setIsHopping(true));
    hopTimerRef.current = window.setTimeout(() => {
      setIsHopping(false);
      hopTimerRef.current = null;
    }, 400);
  };

  const triggerBurst = () => {
    setBurstKey((prev) => prev + 1);
    if (typeof window === 'undefined') return;
    if (burstTimerRef.current !== null) {
      window.clearTimeout(burstTimerRef.current);
    }
    burstTimerRef.current = window.setTimeout(() => {
      setBurstKey(0);
      burstTimerRef.current = null;
    }, 720);
  };

  const scheduleCheer = (payload: MiloCheerPayload) => {
    setActiveCheer(payload);
    if (typeof window === 'undefined') return;
    if (cheerTimerRef.current !== null) {
      window.clearTimeout(cheerTimerRef.current);
    }
    cheerTimerRef.current = window.setTimeout(() => {
      setActiveCheer(null);
      cheerTimerRef.current = null;
    }, payload.durationMs ?? 4200);
  };

  // Hydrate persisted minimized, quiet & snapped drag position on mount
  useEffect(() => {
    const loaded = loadMiloCompanionPrefs();
    let normalized = loaded;
    if (typeof window !== 'undefined') {
      const nextHeight = window.innerHeight;
      setViewportHeight(nextHeight);
      if (loaded.position) {
        const maxBottom = Math.max(16, nextHeight - MILO_TRIGGER_DEFAULT_SIZE - 68);
        const clampedBottom = Math.max(16, Math.min(maxBottom, loaded.position.bottomPx));
        if (clampedBottom !== loaded.position.bottomPx) {
          normalized = {
            ...loaded,
            position: { ...loaded.position, bottomPx: clampedBottom },
          };
        }
      }
    }
    setPrefs(normalized);
    prefsRef.current = normalized;
    setPrefsHydrated(true);
  }, []);

  useEffect(() => {
    if (!prefsHydrated) return;
    saveMiloCompanionPrefs(prefs);
  }, [prefs, prefsHydrated]);

  // Keep snapped vertical position bounded inside viewport when window resizes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      const nextHeight = window.innerHeight;
      setViewportHeight(nextHeight);
      setPrefs((prev) => {
        if (!prev.position) return prev;
        const maxBottom = Math.max(16, nextHeight - MILO_TRIGGER_DEFAULT_SIZE - 68);
        const clampedBottom = Math.max(16, Math.min(maxBottom, prev.position.bottomPx));
        if (clampedBottom === prev.position.bottomPx) return prev;
        return {
          ...prev,
          position: { ...prev.position, bottomPx: clampedBottom },
        };
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Reset route quip cycle cleanly when navigating across routes
  useEffect(() => {
    setQuipIndex(0);
  }, [pathname]);

  // Listen for achievement cheer events from anywhere in the app
  useEffect(() => {
    const onCheer = (event: Event) => {
      const detail = (event as CustomEvent<MiloCheerPayload>).detail;
      if (!detail || !detail.message) return;
      if (prefsRef.current.quiet || prefsRef.current.minimized) return;

      scheduleCheer(detail);
      triggerHop();
      triggerBurst();
    };

    window.addEventListener(ANTS_MILO_CHEER_EVENT, onCheer);
    return () => {
      window.removeEventListener(ANTS_MILO_CHEER_EVENT, onCheer);
    };
  }, []);

  useEffect(() => {
    return () => {
      cleanupDragListenersRef.current?.();
      if (typeof window === 'undefined') return;
      if (cheerTimerRef.current !== null) window.clearTimeout(cheerTimerRef.current);
      if (hopTimerRef.current !== null) window.clearTimeout(hopTimerRef.current);
      if (burstTimerRef.current !== null) window.clearTimeout(burstTimerRef.current);
    };
  }, []);

  // Close open speech bubble with Escape
  useEffect(() => {
    if (!manualOpen && !activeCheer) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setManualOpen(false);
        setActiveCheer(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [manualOpen, activeCheer]);

  const routeQuipSet = useMemo(() => getRouteMiloQuips(app, pathname), [app, pathname]);

  if (hidden) return null;

  const activeEdge: MiloDockEdge = isDragging && dragCoords
    ? typeof window !== 'undefined' &&
      dragCoords.left + MILO_TRIGGER_DEFAULT_SIZE / 2 < window.innerWidth / 2
      ? 'left'
      : 'right'
    : prefs.position?.edge ?? 'right';

  const effectiveBottomPx =
    isDragging && dragCoords
      ? Math.max(16, viewportHeight - dragCoords.top - MILO_TRIGGER_DEFAULT_SIZE)
      : (prefs.position?.bottomPx ?? 20);
  const topSpace = viewportHeight - effectiveBottomPx - MILO_TRIGGER_DEFAULT_SIZE;
  const placeBubbleBelow = (prefs.position != null || isDragging) && topSpace < 190;

  const bubbleVisible =
    !prefs.minimized && !isDragging && (manualOpen || activeCheer !== null);
  const currentMessage = activeCheer
    ? activeCheer.message
    : routeQuipSet.lines[quipIndex % routeQuipSet.lines.length] ??
    'Small daily habits, colony-sized results.';
  const effectiveMood: AntMascotMood = isDragging
    ? 'happy'
    : activeCheer?.mood ?? routeQuipSet.mood;
  const effectiveProp: AntMascotPropVariant =
    activeCheer?.propVariant ?? routeQuipSet.propVariant;

  const clearCheerTimer = () => {
    if (cheerTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(cheerTimerRef.current);
      cheerTimerRef.current = null;
    }
  };

  const handleMascotClick = () => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    triggerHop();
    triggerBurst();
    if (activeCheer) {
      clearCheerTimer();
      setActiveCheer(null);
      setManualOpen(true);
      setQuipIndex((prev) => prev + 1);
      return;
    }
    if (!manualOpen) {
      setManualOpen(true);
    } else {
      setQuipIndex((prev) => prev + 1);
    }
  };

  const handleMascotDoubleClick = () => {
    didDragRef.current = false;
    if (prefs.position) {
      setPrefs((prev) => ({ ...prev, position: undefined }));
      triggerHop();
      triggerBurst();
    }
  };

  const handleCloseBubble = () => {
    clearCheerTimer();
    setActiveCheer(null);
    setManualOpen(false);
  };

  const handleToggleQuiet = () => {
    const nextQuiet = !prefs.quiet;
    if (nextQuiet) {
      clearCheerTimer();
      setActiveCheer(null);
    }
    setPrefs((prev) => ({ ...prev, quiet: nextQuiet }));
  };

  const handleMinimize = () => {
    handleCloseBubble();
    setPrefs((prev) => ({ ...prev, minimized: true, position: undefined }));
  };

  const handleRestore = () => {
    setPrefs((prev) => ({ ...prev, minimized: false }));
    triggerHop();
    triggerBurst();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (typeof window === 'undefined') return;

    cleanupDragListenersRef.current?.();
    const rect = e.currentTarget.getBoundingClientRect();
    const startState = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originLeft: rect.left,
      originTop: rect.top,
      dockSize: rect.width || MILO_TRIGGER_DEFAULT_SIZE,
    };
    dragStartRef.current = startState;
    didDragRef.current = false;

    const onWindowPointerMove = (moveEv: PointerEvent) => {
      if (moveEv.pointerId !== startState.pointerId) return;
      const dx = moveEv.clientX - startState.startX;
      const dy = moveEv.clientY - startState.startY;
      if (!didDragRef.current) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        didDragRef.current = true;
        setIsDragging(true);
      }

      const clamped = clampMiloDragPosition({
        x: startState.originLeft + dx,
        y: startState.originTop + dy,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        dockSize: startState.dockSize,
      });
      setDragCoords({ left: clamped.left, top: clamped.top });
    };

    const finishDrag = (endEv: PointerEvent, cancelled: boolean) => {
      if (endEv.pointerId !== startState.pointerId) return;
      cleanup();
      const wasDragging = didDragRef.current;
      dragStartRef.current = null;
      if (!wasDragging) return;

      setIsDragging(false);
      setDragCoords(null);

      if (cancelled) {
        didDragRef.current = false;
        return;
      }

      const dx = endEv.clientX - startState.startX;
      const dy = endEv.clientY - startState.startY;
      const snapped = clampMiloDragPosition({
        x: startState.originLeft + dx,
        y: startState.originTop + dy,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        dockSize: startState.dockSize,
      });

      setPrefs((prev) => ({
        ...prev,
        position: { edge: snapped.edge, bottomPx: snapped.bottomPx },
      }));
      triggerHop();
      triggerBurst();

      if (!prefsRef.current.quiet) {
        const line =
          MILO_DRAG_QUIPS[dragQuipRef.current % MILO_DRAG_QUIPS.length] ??
          MILO_DRAG_QUIPS[0];
        dragQuipRef.current += 1;
        scheduleCheer({
          message: line ?? 'Wheee! New perch unlocked!',
          mood: 'happy',
          badge: 'Relocated',
          durationMs: 2400,
        });
      }
    };

    const onWindowPointerUp = (upEv: PointerEvent) => finishDrag(upEv, false);
    const onWindowPointerCancel = (cancelEv: PointerEvent) => finishDrag(cancelEv, true);

    const cleanup = () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerCancel);
      if (cleanupDragListenersRef.current === cleanup) {
        cleanupDragListenersRef.current = null;
      }
    };

    cleanupDragListenersRef.current = cleanup;
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerCancel);
  };

  const dockStyle: React.CSSProperties | undefined =
    isDragging && dragCoords
      ? { left: dragCoords.left, top: dragCoords.top, right: 'auto', bottom: 'auto' }
      : !prefs.minimized && prefs.position
        ? prefs.position.edge === 'left'
          ? { left: 14, right: 'auto', bottom: prefs.position.bottomPx }
          : { right: 14, left: 'auto', bottom: prefs.position.bottomPx }
        : undefined;

  return (
    <div
      data-testid="milo-companion-dock"
      data-app={app}
      data-minimized={prefs.minimized ? 'true' : 'false'}
      data-quiet={prefs.quiet ? 'true' : 'false'}
      data-edge={activeEdge}
      data-dragging={isDragging ? 'true' : 'false'}
      style={dockStyle}
      className={cn(
        'pointer-events-none fixed z-30 flex flex-col',
        activeEdge === 'left' ? 'items-start' : 'items-end',
        !prefs.minimized && prefs.position
          ? isDragging
            ? 'transition-none'
            : 'transition-[left,right,bottom] duration-300 ease-out'
          : cn('right-3 sm:right-5', bottomOffsetClassName),
        className
      )}
    >
      {prefs.minimized ? (
        <button
          type="button"
          data-testid="milo-dock-restore-btn"
          onClick={handleRestore}
          aria-label={`Wake ${ANT_MASCOT_NAME} companion`}
          title={`Show ${ANT_MASCOT_NAME}`}
          className="pointer-events-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface-card/95 px-2.5 text-xs font-semibold text-foreground-muted shadow-[var(--shadow-tier-2)] backdrop-blur-sm transition-all hover:border-border-hover hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <AntMascot
            variant="full"
            size={24}
            mood="idle"
            app={app}
            animated={false}
            ariaLabel=""
            className="shrink-0"
          />
          <span className="hidden sm:inline">{ANT_MASCOT_NAME}</span>
        </button>
      ) : (
        <div className="pointer-events-auto relative inline-flex items-center justify-center">
          {bubbleVisible && (
            <div
              role="status"
              aria-live="polite"
              data-testid="milo-dock-bubble"
              className={cn(
                'ants-panel-enter absolute w-[252px] sm:w-[272px] max-w-[calc(100vw-1.75rem)] rounded-2xl border border-border bg-surface-elevated p-3 text-foreground shadow-[var(--shadow-tier-3)]',
                activeEdge === 'left' ? 'left-0' : 'right-0',
                placeBubbleBelow ? 'top-full mt-3' : 'bottom-full mb-3'
              )}
            >
              <div className="flex items-center justify-between gap-2 pb-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="text-xs font-extrabold tracking-tight text-foreground">
                    {ANT_MASCOT_NAME}
                  </span>
                  {activeCheer?.badge && (
                    <span className="inline-flex items-center rounded-full border border-primary-tint-border bg-primary-tint px-2 py-0.5 font-mono text-[10px] font-bold text-on-primary-tint">
                      {activeCheer.badge}
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    data-testid="milo-dock-quiet-btn"
                    onClick={handleToggleQuiet}
                    aria-pressed={prefs.quiet}
                    aria-label={prefs.quiet ? 'Unmute Milo cheers' : 'Mute Milo auto-cheers'}
                    title={
                      prefs.quiet
                        ? 'Quiet mode on (click to unmute cheers)'
                        : 'Quiet mode (mute auto-cheers)'
                    }
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      prefs.quiet
                        ? 'bg-primary-tint text-on-primary-tint'
                        : 'text-foreground-muted hover:bg-surface-inset hover:text-foreground'
                    )}
                  >
                    {prefs.quiet ? (
                      <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    data-testid="milo-dock-minimize-btn"
                    onClick={handleMinimize}
                    aria-label={`Minimize ${ANT_MASCOT_NAME} companion`}
                    title={`Minimize ${ANT_MASCOT_NAME}`}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    data-testid="milo-dock-close-btn"
                    onClick={handleCloseBubble}
                    aria-label="Dismiss speech bubble"
                    title="Dismiss (Esc)"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <p className="text-xs font-medium leading-relaxed text-foreground-muted">
                {currentMessage}
              </p>

              {!activeCheer && (
                <p className="mt-1.5 text-[10px] font-medium text-foreground-subtle">
                  {prefs.quiet
                    ? 'Quiet mode on — tap for tips or drag me anywhere.'
                    : 'Tap for tips · Drag to move · Double-tap to reset.'}
                </p>
              )}

              {/* Directional speech bubble tail */}
              <span
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute h-3 w-3 rotate-45 border-border bg-surface-elevated',
                  activeEdge === 'left' ? 'left-6' : 'right-6',
                  placeBubbleBelow ? '-top-[6px] border-t border-l' : '-bottom-[6px] border-r border-b'
                )}
              />
            </div>
          )}

          {/* Cute sparkle / heart burst when tapped, cheered, or dragged */}
          {burstKey > 0 && (
            <div
              key={burstKey}
              aria-hidden="true"
              data-testid="milo-dock-burst"
              className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                style={{ '--burst-x': '-20px' } as React.CSSProperties}
                className="ants-mascot-burst absolute -left-2 top-0 text-amber-400"
              >
                <path
                  d="M8 1 L9.8 6.2 L15 8 L9.8 9.8 L8 15 L6.2 9.8 L1 8 L6.2 6.2 Z"
                  fill="currentColor"
                />
              </svg>
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                style={{ '--burst-x': '18px', animationDelay: '45ms' } as React.CSSProperties}
                className="ants-mascot-burst absolute left-1 -top-1 text-rose-400"
              >
                <path
                  d="M8 14 C8 14 2 9.6 2 5.4 C2 3.3 3.7 2 5.4 2 C6.6 2 7.5 2.7 8 3.6 C8.5 2.7 9.4 2 10.6 2 C12.3 2 14 3.3 14 5.4 C14 9.6 8 14 8 14 Z"
                  fill="currentColor"
                />
              </svg>
              <svg
                width="10"
                height="10"
                viewBox="0 0 16 16"
                style={{ '--burst-x': '2px', animationDelay: '90ms' } as React.CSSProperties}
                className="ants-mascot-burst absolute -left-0.5 -top-3 text-yellow-200"
              >
                <circle cx="8" cy="8" r="5" fill="currentColor" />
              </svg>
            </div>
          )}

          <button
            type="button"
            data-testid="milo-dock-trigger"
            onClick={handleMascotClick}
            onDoubleClick={handleMascotDoubleClick}
            onPointerDown={handlePointerDown}
            aria-expanded={bubbleVisible}
            aria-label={`Chat with or drag ${ANT_MASCOT_NAME}, The ANTs companion`}
            title={`Tap ${ANT_MASCOT_NAME} for tips, drag to move, or double-tap to reset`}
            className={cn(
              'group relative inline-flex h-[60px] w-[60px] sm:h-[68px] sm:w-[68px] touch-none select-none items-center justify-center rounded-full border-0 bg-transparent p-0 transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isDragging
                ? 'cursor-grabbing scale-110'
                : 'cursor-grab hover:scale-110 active:scale-95'
            )}
          >
            {/* Warm borderless ambient aura so Milo pops on both Obsidian Dark & Slate Light canvases */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-1 rounded-full bg-amber-400/20 opacity-80 blur-md transition-opacity duration-200 group-hover:opacity-100 dark:bg-amber-400/28"
            />

            <span
              className={cn(
                'relative inline-flex items-center justify-center drop-shadow-[0_6px_14px_rgba(217,119,6,0.28)] dark:drop-shadow-[0_6px_18px_rgba(245,158,11,0.38)]',
                isDragging
                  ? 'ants-mascot-drag-wiggle'
                  : isHopping
                    ? 'ants-mascot-hop'
                    : !prefs.quiet && 'ants-mascot-companion-idle'
              )}
            >
              <AntMascot
                variant="full"
                size={62}
                mood={effectiveMood}
                app={app}
                propVariant={effectiveProp}
                animated={!prefs.quiet && !isDragging}
                ariaLabel=""
              />
            </span>

            {prefs.quiet && (
              <span
                aria-hidden="true"
                className="absolute right-0.5 top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-border bg-surface-elevated text-foreground-muted shadow-2xs"
              >
                <BellOff className="h-2.5 w-2.5" />
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/** Ergonomic alias */
export const MiloCompanionDock = MiloCompanionDockView;
