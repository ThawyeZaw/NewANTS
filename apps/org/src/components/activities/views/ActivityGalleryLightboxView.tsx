'use client';

import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react';
import { cn } from '@ants/ui';
import type { OrgActivityPhotoMock } from '../../../mocks/showcase-content.mock';
import { EditorialArtworkView } from '../../shared/views/EditorialArtworkView';

export interface ActivityGalleryLightboxViewProps {
  /** Gallery frames belonging to the current activity */
  photos: OrgActivityPhotoMock[];
  /** Zero-based index of the active frame, or `null` when lightbox is closed */
  activeIndex: number | null;
  /** Event title shown for context inside the lightbox header */
  activityTitle: string;
  /** Callback when switching frames via buttons, thumbnails, or arrow keys */
  onChangeIndex: (nextIndex: number) => void;
  /** Callback to close the lightbox (Escape, backdrop click, or close icon) */
  onClose: () => void;
}

/**
 * Keyboard-Navigable Activity Gallery Lightbox (`[ZYY-2.4]`).
 */
export function ActivityGalleryLightboxView({
  photos,
  activeIndex,
  activityTitle,
  onChangeIndex,
  onClose,
}: ActivityGalleryLightboxViewProps) {
  const isOpen = activeIndex !== null && photos.length > 0;
  const safeIndex =
    activeIndex !== null && photos.length > 0
      ? ((activeIndex % photos.length) + photos.length) % photos.length
      : 0;

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onChangeIndex((safeIndex + 1) % photos.length);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onChangeIndex((safeIndex - 1 + photos.length) % photos.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, safeIndex, photos.length, onChangeIndex, onClose]);

  if (!isOpen) return null;

  const activePhoto = photos[safeIndex];
  if (!activePhoto) return null;

  const goPrev = () => onChangeIndex((safeIndex - 1 + photos.length) % photos.length);
  const goNext = () => onChangeIndex((safeIndex + 1) % photos.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${activityTitle} gallery lightbox`}
    >
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm ants-modal-backdrop-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-y-auto rounded-2xl border border-border-hover bg-surface-elevated text-foreground shadow-[var(--shadow-tier-3)] ants-modal-panel-in">
        {/* Header Strip */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{activityTitle}</p>
            <p className="text-xs tabular-nums text-foreground-muted">
              {String(safeIndex + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')} ·{' '}
              {activePhoto.shotLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close photo lightbox"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Main Frame Viewport */}
        <div className="relative bg-background p-4 sm:p-6">
          <div key={activePhoto.id} className="ants-panel-enter">
            <EditorialArtworkView
              imageSrc={activePhoto.imageSrc}
              alt={activePhoto.imageAlt}
              theme={activePhoto.artworkTheme}
              className="aspect-video w-full"
            />
          </div>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous gallery photo"
                className="absolute left-6 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-card/90 text-foreground shadow-sm transition-colors hover:border-border-hover hover:bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next gallery photo"
                className="absolute right-6 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-card/90 text-foreground shadow-sm transition-colors hover:border-border-hover hover:bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        {/* Caption & Thumbnail Strip */}
        <div className="border-t border-border bg-surface-card px-5 py-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground leading-relaxed">
              {activePhoto.caption}
            </p>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-foreground-muted">
              <MapPin className="h-3.5 w-3.5 text-primary-solid" aria-hidden="true" />
              <span>{activePhoto.locationTag}</span>
            </span>
          </div>

          {photos.length > 1 && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {photos.map((photo, idx) => {
                const selected = idx === safeIndex;
                return (
                  <button
                    key={photo.id}
                    type="button"
                    aria-label={`View photo ${idx + 1}: ${photo.shotLabel}`}
                    aria-pressed={selected}
                    onClick={() => onChangeIndex(idx)}
                    className={cn(
                      'overflow-hidden rounded-lg border p-0.5 transition-[opacity,border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected
                        ? 'border-primary ring-2 ring-ring'
                        : 'border-border opacity-70 hover:opacity-100'
                    )}
                  >
                    <EditorialArtworkView
                      imageSrc={photo.imageSrc}
                      alt={photo.imageAlt}
                      theme={photo.artworkTheme}
                      className="aspect-video w-full border-0 rounded-md"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
