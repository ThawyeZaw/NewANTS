'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Award,
  Building2,
  CalendarClock,
  QrCode,
  Send,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  TutorSlotPainterView,
  summarizeTutorSchedule,
  cn,
} from '@ants/ui';
import type { OrgTeamMemberMock } from '../../../mocks/showcase-team.mock';
import type { SelectedTutorSlot } from './TelegramInquiryModalView';

export interface TutorAvailabilityDrawerViewProps {
  /** Tutor being inspected inside the availability schedule view */
  tutor: OrgTeamMemberMock | null;
  /** Controls visibility when rendered in slide-over drawer mode */
  open?: boolean;
  /** Callback to close the slide-over drawer */
  onClose?: () => void;
  /** Renders inline on `/team/[username]` rather than inside a fixed overlay drawer */
  embedded?: boolean;
  /** Fires when a visitor requests to open the Telegram QR Inquiry Modal for a tutor/slot */
  onOpenTelegramModal?: (
    tutor: OrgTeamMemberMock,
    slot?: SelectedTutorSlot | null
  ) => void;
}

/**
 * Interactive Tutor Weekly Availability Grid Panel & Slide-Over Drawer (`[ZYY-2.3]`).
 *
 * Layout & interaction architecture:
 * - Reuses `@ants/ui`'s `<TutorSlotPainterView mode="preview" />` so the `Sun–Sat × 08:00–21:00`
 *   matrix keeps identical semantic token states (`Available` emerald · `Flexible` amber ·
 *   `Unavailable` muted), keyboard arrow navigation, and `12H`/`24H` toggle across the ecosystem.
 * - In slide-over drawer mode (`/team`), locks background scroll, closes on `Escape` or backdrop
 *   click, and feeds the selected slot directly into `<TelegramInquiryModalView />`.
 */
export function TutorAvailabilityDrawerView({
  tutor,
  open = false,
  onClose,
  embedded = false,
  onOpenTelegramModal,
}: TutorAvailabilityDrawerViewProps) {
  const [selectedSlot, setSelectedSlot] = useState<SelectedTutorSlot | null>(null);

  // Clear previously selected slot whenever switching tutors or closing drawer
  useEffect(() => {
    setSelectedSlot(null);
  }, [tutor?.id, open]);

  // Handle Escape dismissal and document scroll lock in drawer mode
  useEffect(() => {
    if (embedded || !open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [embedded, open, onClose]);

  const scheduleSummary = useMemo(
    () =>
      tutor
        ? summarizeTutorSchedule(tutor.weeklySchedule)
        : { availableHours: 0, flexibleHours: 0, activeDays: 0 },
    [tutor]
  );

  if (!tutor) return null;
  if (!embedded && !open) return null;

  const headerSection = (
    <div
      className={cn(
        'space-y-3 border-b border-border',
        embedded ? 'pb-5' : 'shrink-0 px-5 pt-5 pb-4 sm:px-7 sm:pt-6'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl border border-primary-tint-border bg-primary-tint font-bold text-on-primary-tint">
            {tutor.initials}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                {tutor.name}
              </h2>
              {tutor.isFounder && (
                <Badge variant="active-filter">
                  <Award className="h-3 w-3" aria-hidden="true" />
                  <span>Founder</span>
                </Badge>
              )}
              <Badge variant="verified" dot>
                Verified Tutor
              </Badge>
            </div>
            <p className="text-xs font-medium text-foreground-muted">
              {tutor.headline}
            </p>
          </div>
        </div>

        {!embedded && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close availability drawer"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Institution, Hourly Rate & Open Slot Metrics */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-foreground-muted">
        <span className="inline-flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-primary-solid" aria-hidden="true" />
          <span>{tutor.institution}</span>
        </span>
        {tutor.hourlyRateLabel && (
          <span className="font-mono font-semibold text-foreground tabular-nums">
            {tutor.hourlyRateLabel}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-on-success-tint">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {scheduleSummary.availableHours}h open · {scheduleSummary.activeDays} days/wk
          </span>
        </span>
      </div>

      {/* Taught Subjects Summary */}
      <p className="text-xs text-foreground-muted leading-relaxed">
        <span className="font-medium text-foreground">Subjects: </span>
        {tutor.taughtSubjects.join(' · ')}
      </p>
    </div>
  );

  const matrixSection = (
    <div
      className={cn(
        'space-y-2.5',
        !embedded && 'flex-1 overflow-y-auto px-5 py-4 sm:px-7 sm:py-5'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground">
          Weekly Teaching Availability (Sun–Sat)
        </h3>
        <span className="text-xs text-foreground-muted">
          Tap any green or amber slot to prefill your Telegram inquiry
        </span>
      </div>

      <div className="rounded-xl border border-border bg-surface-card p-3 sm:p-4">
        <TutorSlotPainterView
          schedule={tutor.weeklySchedule}
          mode="preview"
          tutorName={tutor.name}
          tutorTelegramUsername={tutor.tutorTelegramUsername}
          timezoneLabel={tutor.timezoneLabel}
          onSelectPreviewSlot={(slot) => {
            setSelectedSlot({
              day: slot.day,
              hour: slot.hour,
              status: slot.status,
              rangeLabel: slot.rangeLabel,
            });
          }}
        />
      </div>
    </div>
  );

  const actionFooter = (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        embedded
          ? 'rounded-xl border border-border bg-surface-inset p-4'
          : 'shrink-0 border-t border-border bg-surface-inset px-5 py-3.5 sm:px-7'
      )}
    >
      <div className="space-y-0.5 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">
          {selectedSlot
            ? `Selected slot: ${selectedSlot.rangeLabel}`
            : 'Ready to book or ask about a study plan?'}
        </p>
        <p className="text-xs text-foreground-muted truncate">
          {selectedSlot
            ? `Status: ${selectedSlot.status === 'available' ? 'Open 1:1 slot' : 'Flexible on request'}`
            : `Open Telegram QR inquiry directly for ${tutor.tutorTelegramUsername ?? '@TheANTsFlowBot'}`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {!embedded && (
          <Link
            href={`/team/${tutor.username}`}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-surface-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-inset"
          >
            <span>Full Profile</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
        <Button
          variant="primary"
          size="sm"
          leftIcon={<QrCode className="h-3.5 w-3.5" aria-hidden="true" />}
          rightIcon={<Send className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={() => onOpenTelegramModal?.(tutor, selectedSlot)}
        >
          {selectedSlot ? 'Inquire & Show QR' : 'Telegram QR Inquiry'}
        </Button>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-6">
        {headerSection}
        {matrixSection}
        {actionFooter}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`${tutor.name} weekly availability drawer`}
    >
      {/* Translucent Backdrop */}
      <div
        className="fixed inset-0 bg-black/55 backdrop-blur-xs ants-modal-backdrop-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Right-aligned Slide-Over Panel with pinned header and sticky inquiry bar */}
      <aside
        className={cn(
          'ants-drawer-right-in relative z-10 flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-border-hover bg-surface-elevated text-foreground shadow-[var(--shadow-tier-3)]'
        )}
      >
        {headerSection}
        {matrixSection}
        {actionFooter}
      </aside>
    </div>
  );
}

