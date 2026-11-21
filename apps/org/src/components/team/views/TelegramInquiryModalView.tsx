'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  QrCode,
  Send,
} from 'lucide-react';
import {
  Badge,
  Button,
  Input,
  Modal,
  normalizeTelegramHandle,
  cn,
} from '@ants/ui';
import { encodeQrMatrix } from '../../../lib/qr';
import type { OrgTeamMemberMock } from '../../../mocks/showcase-team.mock';

export interface SelectedTutorSlot {
  day: string;
  hour: number;
  status: 'available' | 'flexible' | 'unavailable';
  rangeLabel: string;
}

export interface TelegramInquiryModalViewProps {
  /** Controls modal visibility */
  open: boolean;
  /** Callback invoked on Escape, backdrop click, or close button */
  onClose: () => void;
  /** Tutor record whose Telegram handle & taught subjects populate the modal */
  tutor: OrgTeamMemberMock | null;
  /** Optional Sun–Sat slot selected inside the availability grid */
  selectedSlot?: SelectedTutorSlot | null;
  /** Optional callback fired when user opens Telegram or copies link (useful for analytics/wiring) */
  onTrackInquiry?: (payload: {
    tutorUsername: string;
    telegramUrl: string;
    slotLabel?: string;
    subject?: string;
  }) => void;
}

/**
 * Interactive Telegram Inquiry QR Modal (`[ZYY-2.3]`).
 *
 * Modal state & QR logic:
 * 1. Derives a clean Telegram deep link (`https://t.me/<handle>?text=<encoded_message>`)
 *    combining the tutor's handle, optional Sun–Sat slot, selected subject chip, and student note.
 * 2. Feeds the live URL into `encodeQrMatrix()` so scanning the SVG with a phone camera
 *    pre-fills the exact inquiry inside Telegram without external QR APIs.
 * 3. Resets draft subject/note cleanly whenever a different tutor or slot opens the modal.
 */
export function TelegramInquiryModalView({
  open,
  onClose,
  tutor,
  selectedSlot = null,
  onTrackInquiry,
}: TelegramInquiryModalViewProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('General Inquiry');
  const [studentNote, setStudentNote] = useState<string>('');
  const [copiedState, setCopiedState] = useState<'idle' | 'link' | 'message'>('idle');

  // Reset modal form drafts whenever the target tutor or selected slot changes
  useEffect(() => {
    if (!open || !tutor) return;
    setSelectedSubject(tutor.taughtSubjects[0] ?? 'General Inquiry');
    setStudentNote('');
    setCopiedState('idle');
  }, [open, tutor, selectedSlot]);

  // Clear copy toast indicator after 2 seconds
  useEffect(() => {
    if (copiedState === 'idle') return;
    const timer = window.setTimeout(() => setCopiedState('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [copiedState]);

  const telegramHandle = useMemo(() => {
    if (!tutor?.tutorTelegramUsername) return '@TheANTsFlowBot';
    return normalizeTelegramHandle(tutor.tutorTelegramUsername, '@TheANTsFlowBot');
  }, [tutor]);

  const composedMessage = useMemo(() => {
    if (!tutor) return '';
    const subjectPhrase =
      selectedSubject && selectedSubject !== 'General Inquiry'
        ? ` regarding ${selectedSubject}`
        : '';
    const slotPhrase = selectedSlot
      ? ` for your ${selectedSlot.rangeLabel} (${selectedSlot.status}) slot`
      : '';
    const noteSuffix = studentNote.trim() ? ` Note: ${studentNote.trim()}` : '';
    return `Hi ${tutor.name}, I saw your profile on the-ants.org and would like to inquire${subjectPhrase}${slotPhrase}.${noteSuffix}`;
  }, [tutor, selectedSubject, selectedSlot, studentNote]);

  const telegramUrl = useMemo(() => {
    const cleanHandle = telegramHandle.replace(/^@/, '');
    return `https://t.me/${cleanHandle}?text=${encodeURIComponent(composedMessage)}`;
  }, [telegramHandle, composedMessage]);

  const qrMatrix = useMemo(() => encodeQrMatrix(telegramUrl), [telegramUrl]);

  if (!tutor) return null;

  const subjectOptions = ['General Inquiry', ...tutor.taughtSubjects];
  const totalViewBox = qrMatrix.size + qrMatrix.quietZone * 2;

  const handleCopy = async (kind: 'link' | 'message') => {
    const value = kind === 'link' ? telegramUrl : composedMessage;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedState(kind);
    } catch {
      // Fallback noop if clipboard permission is unavailable in headless browsers
      setCopiedState(kind);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      className="max-h-[90vh] overflow-y-auto"
      title={`Inquire with ${tutor.name}`}
      description="Scan on your phone or launch Telegram directly with your preferred slot and subject prefilled."
      headerBadge={
        <Badge variant="verified" mono>
          {telegramHandle}
        </Badge>
      }
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={
                copiedState === 'link' ? (
                  <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )
              }
              onClick={() => handleCopy('link')}
            >
              {copiedState === 'link' ? 'Link Copied' : 'Copy Link'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={
                copiedState === 'message' ? (
                  <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                )
              }
              onClick={() => handleCopy('message')}
            >
              {copiedState === 'message' ? 'Message Copied' : 'Copy Text'}
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                onTrackInquiry?.({
                  tutorUsername: tutor.username,
                  telegramUrl,
                  slotLabel: selectedSlot?.rangeLabel,
                  subject: selectedSubject,
                })
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-solid px-4 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-solid-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Open in Telegram</span>
              <ExternalLink className="h-3 w-3 opacity-80" aria-hidden="true" />
            </a>
          </div>
        </div>
      }
    >
      {/* Two-column CSS Grid: Left = scannable SVG QR Matrix, Right = live message composer */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
        {/* Left Column: High-Contrast QR Matrix Card */}
        <div className="flex flex-col items-center rounded-xl border border-border bg-surface-inset p-4 text-center">
          <div
            className="w-full max-w-[184px] rounded-xl bg-white p-2.5 text-slate-950 border border-border"
            aria-label={`Telegram QR code linking to ${telegramHandle}`}
          >
            <svg
              viewBox={`0 0 ${totalViewBox} ${totalViewBox}`}
              className="h-auto w-full block"
              shapeRendering="crispEdges"
              role="img"
              aria-label={`Scannable QR code for ${telegramHandle}`}
            >
              <rect width={totalViewBox} height={totalViewBox} fill="#ffffff" />
              {qrMatrix.modules.map((row, rIdx) =>
                row.map((isDark, cIdx) =>
                  isDark ? (
                    <rect
                      key={`${rIdx}-${cIdx}`}
                      x={cIdx + qrMatrix.quietZone}
                      y={rIdx + qrMatrix.quietZone}
                      width={1}
                      height={1}
                      fill="currentColor"
                    />
                  ) : null
                )
              )}
            </svg>
          </div>

          <div className="mt-3 space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <QrCode className="h-3.5 w-3.5 text-primary-solid" aria-hidden="true" />
              <span>Scan with Phone Camera</span>
            </div>
            <p className="font-mono text-[11px] tabular-nums text-foreground-muted">
              QR v{qrMatrix.version} · {qrMatrix.size}×{qrMatrix.size} modules
            </p>
          </div>
        </div>

        {/* Right Column: Slot Badge, Subject Selector, Custom Note & Live Preview */}
        <div className="space-y-4 min-w-0">
          {/* Active Slot Context Pill */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-inset/60 px-3.5 py-2.5">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold text-foreground-muted">
                Selected Weekly Slot
              </p>
              <p className="font-mono text-xs font-semibold text-foreground tabular-nums">
                {selectedSlot ? selectedSlot.rangeLabel : 'Flexible / General Schedule Inquiry'}
              </p>
            </div>
            {selectedSlot ? (
              <Badge
                variant={selectedSlot.status === 'available' ? 'verified' : 'active-filter'}
              >
                {selectedSlot.status === 'available' ? 'Available' : 'Flexible'}
              </Badge>
            ) : (
              <Badge variant="editorial">Open</Badge>
            )}
          </div>

          {/* Subject Focus Chips */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">
              Subject / Exam Track
            </p>
            <div className="flex flex-wrap gap-1.5">
              {subjectOptions.map((subject) => {
                const active = selectedSubject === subject;
                return (
                  <button
                    key={subject}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedSubject(subject)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? 'border-primary bg-primary-tint text-on-primary-tint font-semibold'
                        : 'border-border bg-surface-card text-foreground-muted hover:border-border-hover hover:text-foreground'
                    )}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Student Note */}
          <Input
            label="Optional short note (updates QR live)"
            placeholder="e.g. Preparing for May/June 2027 P2 retakes"
            value={studentNote}
            maxLength={70}
            onChange={(e) => setStudentNote(e.target.value)}
            hint="Kept concise so the QR pattern remains crisp and fast to scan."
          />

          {/* Live Prefilled Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                <MessageSquare className="h-3.5 w-3.5 text-primary-solid" aria-hidden="true" />
                <span>Prefilled Telegram Message</span>
              </span>
              <span className="sr-only" aria-live="polite">
                {copiedState !== 'idle' ? `Copied ${copiedState}` : ''}
              </span>
            </div>
            <p className="rounded-xl border border-border bg-surface-inset p-3 text-xs leading-relaxed text-foreground-muted">
              {composedMessage}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

