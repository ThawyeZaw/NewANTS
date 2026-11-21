'use client';

import React from 'react';
import { cn } from '@ants/ui';
import type { OrgArtworkTheme } from '../../../mocks/showcase-content.mock';

export interface EditorialArtworkViewProps {
  /** Direct local photo path (e.g. '/images/org/tutoring-session.jpg') */
  imageSrc?: string;
  /** Accessible alt text describing the photograph */
  alt?: string;
  /** Fallback photo resolver key when an explicit imageSrc is not provided */
  theme?: OrgArtworkTheme;
  /** Adds subtle group-hover scale on clickable activity cards */
  hoverZoom?: boolean;
  /** Load hero imagery eagerly above the fold */
  priority?: boolean;
  /** Aspect/height utility classes */
  className?: string;
}

const THEME_FALLBACK_PHOTOS: Record<OrgArtworkTheme, { src: string; alt: string }> = {
  tutoring: {
    src: '/images/org/tutoring-session.jpg',
    alt: 'Peer tutor pointing to a calculus solution on a chalkboard beside a student taking notes.',
  },
  meetup: {
    src: '/images/org/students-meet.jpg',
    alt: 'Students and mentors gathered around wooden study tables with notebooks and laptops.',
  },
  venue: {
    src: '/images/org/exam-venue.jpg',
    alt: 'Sunlit examination hall corridor check-in table with clear pencil cases and clipboards.',
  },
  hackathon: {
    src: '/images/org/hackathon-table.jpg',
    alt: 'Warm desk lamp over laptops, paper wireframes, and sticky notes on a student sprint table.',
  },
  'article-ums': {
    src: '/images/org/study-desk-notes.jpg',
    alt: 'Handwritten mechanics notes and diagrams on graph paper beside a drafting pencil and ruler.',
  },
  'article-focus': {
    src: '/images/org/study-desk-notes.jpg',
    alt: 'Organized revision notes on graph paper with pencil and ruler on a wooden desk.',
  },
  'article-maths': {
    src: '/images/org/science-lab.jpg',
    alt: 'Wooden science bench with circuit apparatus, stopwatch, and open lab data notebook.',
  },
};

/**
 * Clean documentary photograph frame used across `/activities`, `/activities/[slug]`,
 * and gallery lightboxes. Avoids synthetic wireframes or badge overlays over photography.
 */
export function EditorialArtworkView({
  imageSrc,
  alt,
  theme = 'tutoring',
  hoverZoom = false,
  priority = false,
  className,
}: EditorialArtworkViewProps) {
  const fallback = THEME_FALLBACK_PHOTOS[theme] ?? THEME_FALLBACK_PHOTOS.tutoring;
  const resolvedSrc = imageSrc ?? fallback.src;
  const resolvedAlt = alt ?? fallback.alt;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-surface-inset',
        className
      )}
    >
      <img
        src={resolvedSrc}
        alt={resolvedAlt}
        loading={priority ? 'eager' : 'lazy'}
        className={cn(
          'h-full w-full object-cover object-center block transition-transform duration-300 ease-[var(--ease-out-expo)]',
          hoverZoom && 'group-hover:scale-[1.03]'
        )}
      />
    </div>
  );
}
