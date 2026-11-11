'use client';

import React, { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  Unlink,
} from 'lucide-react';
import {
  buildTelegramBotDeepLink,
  completeTelegramVerification,
  normalizeTelegramHandle,
  startTelegramLinking,
  unlinkTelegramAccount,
  type TelegramAccountState,
  type TelegramLeadMinutes,
  type TelegramNotificationPreferences,
} from '../lib/account';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../primitives/Card';
import { cn } from '../utils/cn';

export interface TelegramConnectCardViewProps {
  /** Current Telegram link state & per-channel notification preferences */
  telegram: TelegramAccountState;
  /** Separate ANTs ecosystem username (`/@[username]`), displayed to emphasize distinct handles */
  accountUsername?: string;
  /** Whether the user owns a tutor/mentor role (surfaces Student Inquiry alerts toggle) */
  isTutor?: boolean;
  /** Callback fired whenever Telegram connection status or preferences update */
  onChange: (next: TelegramAccountState) => void;
  /** Optional anchor id (`telegram` supports `/settings#telegram` deep links from `UserMenuView`) */
  id?: string;
  className?: string;
}

const LEAD_TIME_OPTIONS: TelegramLeadMinutes[] = [5, 10, 15, 30];

export function TelegramConnectCardView({
  telegram,
  accountUsername,
  isTutor = false,
  onChange,
  id = 'telegram',
  className,
}: TelegramConnectCardViewProps) {
  const [webhookHandleOverride, setWebhookHandleOverride] = useState(
    telegram.status === 'pending' ? telegram.handle : ''
  );
  const [copiedToken, setCopiedToken] = useState(false);
  const [testPingSentAt, setTestPingSentAt] = useState<string | null>(null);

  useEffect(() => {
    setWebhookHandleOverride(telegram.status === 'pending' ? telegram.handle : '');
    setTestPingSentAt(null);
  }, [telegram.status, telegram.handle]);

  const deepLinkUrl = buildTelegramBotDeepLink(telegram.verificationCode);
  const startCommand = `/start ${telegram.verificationCode}`;

  const handlePrefToggle = <K extends keyof TelegramNotificationPreferences>(
    key: K,
    value: TelegramNotificationPreferences[K]
  ) => {
    onChange({
      ...telegram,
      preferences: {
        ...telegram.preferences,
        [key]: value,
      },
    });
  };

  /**
   * Account Linking Step 1:
   * Immediately issues a short-lived `/start <CODE>` nonce tied to the signed-in `.the-ants.org`
   * session so `@TheANTsFlowBot` can bind `chat_id` and capture the user's Telegram `@username`.
   */
  const handleStartConnect = () => {
    setTestPingSentAt(null);
    onChange(startTelegramLinking(telegram));
  };

  /**
   * Account Linking Step 2 (Simulated Bot Webhook Callback):
   * Finalizes verification after `/start <CODE>` inside `@TheANTsFlowBot`, storing the
   * Telegram `@username` returned by the bot webhook separately from ANTs account `@username`.
   */
  const handleVerifyBotLink = (event?: React.FormEvent) => {
    event?.preventDefault();
    setTestPingSentAt(null);
    onChange(completeTelegramVerification(telegram, webhookHandleOverride.trim() || undefined));
  };

  const handleCopyCommand = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(startCommand);
      }
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 1800);
    } catch {
      setCopiedToken(true);
    }
  };

  const handleSendTestPing = () => {
    const nowLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTestPingSentAt(nowLabel);
  };

  const statusBadge =
    telegram.status === 'connected' ? (
      <Badge variant="verified" dot>
        Linked ({telegram.handle})
      </Badge>
    ) : telegram.status === 'pending' ? (
      <Badge variant="active-filter" dot mono>
        Awaiting /start
      </Badge>
    ) : (
      <Badge variant="editorial" dot>
        Not linked
      </Badge>
    );

  return (
    <Card id={id} className={cn('scroll-mt-24', className)}>
      <CardHeader action={statusBadge}>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary-tint-border bg-primary-tint text-on-primary-tint">
            <Send className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <CardTitle>Telegram Bot &amp; Cron Alerts</CardTitle>
            <CardDescription>
              Connect <span className="font-mono text-foreground">@TheANTsFlowBot</span> for
              5-minute Cloudflare Worker Cron timetable pings, exam countdowns, and tutor inquiries.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* State 1: Unlinked -> Generate One-Time /start Verification Code Immediately */}
        {telegram.status === 'unlinked' && (
          <div className="flex flex-col gap-3 rounded-lg bg-surface-inset/75 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Link your Telegram account via{' '}
                <span className="font-mono">@TheANTsFlowBot</span>
              </p>
              <p className="text-xs leading-relaxed text-foreground-muted">
                Telegram is unlinked by default until you verify during onboarding or below. Generates a one-time{' '}
                <span className="font-mono text-foreground">ANT-XXXX</span>{' '}
                handshake code—your Telegram <span className="font-mono text-foreground">@username</span>{' '}
                is captured when you tap Start and stays separate from your ANTs account
                {accountUsername ? (
                  <>
                    {' '}
                    (<span className="font-mono text-foreground">@{accountUsername}</span>)
                  </>
                ) : null}
                .
              </p>
            </div>
            <Button
              type="button"
              size="md"
              onClick={handleStartConnect}
              leftIcon={<Link2 className="h-4 w-4" aria-hidden="true" />}
              className="shrink-0"
            >
              Generate /start Code
            </Button>
          </div>
        )}

        {/* State 2: Pending -> Copy `/start ANT-XXXX` Command + Deep Link + Bot Webhook Capture */}
        {telegram.status === 'pending' && (
          <form onSubmit={handleVerifyBotLink} className="space-y-4 rounded-lg bg-primary-tint/35 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Step 2 of 2: Send verification command to @TheANTsFlowBot
                </p>
                <p className="text-xs text-foreground-muted">
                  Bot webhook captures whichever Telegram account sends{' '}
                  <span className="font-mono text-foreground">{startCommand}</span>
                  {accountUsername ? (
                    <>
                      {' '}
                      (separate from ANTs{' '}
                      <span className="font-mono text-foreground">@{accountUsername}</span>)
                    </>
                  ) : null}
                  .
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartConnect}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-card px-2.5 py-1 text-xs font-semibold text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                New code
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center justify-between rounded-lg bg-surface-card px-3 py-2">
                <code className="font-mono text-sm font-bold tracking-wider text-foreground">
                  {startCommand}
                </code>
                <button
                  type="button"
                  onClick={handleCopyCommand}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-on-primary-tint hover:bg-primary-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {copiedToken ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              <a
                href={deepLinkUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-card px-3.5 text-xs font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>Open @TheANTsFlowBot</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>

            <div>
              <label
                htmlFor="tg-webhook-override"
                className="mb-1.5 block text-xs font-semibold text-foreground"
              >
                Simulated Telegram @username from bot webhook (optional override)
              </label>
              <input
                id="tg-webhook-override"
                type="text"
                value={webhookHandleOverride}
                onChange={(e) => setWebhookHandleOverride(e.target.value)}
                maxLength={36}
                placeholder="Leave blank to link @ants_tg_member, or enter e.g. @different_tg"
                className="h-9 w-full rounded-lg border border-border bg-surface-card px-3 font-mono text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3">
              <span className="text-xs text-foreground-muted">
                Ready to link{' '}
                <span className="font-mono font-semibold text-foreground">
                  {webhookHandleOverride.trim()
                    ? normalizeTelegramHandle(webhookHandleOverride)
                    : telegram.handle || '@ants_tg_member'}
                </span>
                ?
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange(unlinkTelegramAccount(telegram))}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  leftIcon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                >
                  Confirm Bot Link
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* State 3: Connected -> Linked Telegram Account, Test Ping Preview & Unlink */}
        {telegram.status === 'connected' && (
          <div className="space-y-3 rounded-lg bg-success-tint/35 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Linked Telegram account:{' '}
                    <span className="font-mono text-on-success-tint">{telegram.handle}</span>
                  </p>
                  <p className="text-xs text-foreground-muted">
                    Via <span className="font-mono">@TheANTsFlowBot</span> · Independent of ANTs{' '}
                    <span className="font-mono">
                      @{accountUsername || 'username'}
                    </span>{' '}
                    · <span className="font-mono">*/5 * * * *</span> Cron alerts active
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSendTestPing}
                  leftIcon={<MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />}
                >
                  Preview Test Ping
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange(unlinkTelegramAccount(telegram))}
                  leftIcon={<Unlink className="h-3.5 w-3.5" aria-hidden="true" />}
                >
                  Unlink
                </Button>
              </div>
            </div>

            {testPingSentAt && (
              <div className="rounded-lg bg-surface-card px-3.5 py-2.5 text-xs">
                <div className="flex items-center justify-between gap-2 text-foreground-muted">
                  <span className="font-semibold text-on-primary-tint">@TheANTsFlowBot → {telegram.handle}</span>
                  <span className="font-mono tabular-nums">{testPingSentAt}</span>
                </div>
                <p className="mt-1 text-foreground">
                  Prototype check-in: Your {telegram.preferences.defaultLeadMinutes}-minute focus block alerts, exam countdowns, and{' '}
                  {telegram.preferences.dailyMorningDigest
                    ? `${telegram.preferences.digestTime} morning brief`
                    : 'on-demand reminders'}{' '}
                  are armed cleanly.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Granular Delivery Preferences (`notification_preferences`) */}
        <div className="space-y-3 border-t border-border-subtle pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Bell className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Delivery Channels &amp; Lead Times
            </h4>
            <div className="flex items-center gap-1" role="group" aria-label="Default reminder lead time">
              <span className="mr-1 text-xs text-foreground-muted">Lead:</span>
              {LEAD_TIME_OPTIONS.map((mins) => {
                const active = telegram.preferences.defaultLeadMinutes === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handlePrefToggle('defaultLeadMinutes', mins)}
                    className={cn(
                      'rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? 'border-primary bg-primary-tint text-on-primary-tint'
                        : 'border-border bg-surface-inset/60 text-foreground-muted hover:text-foreground'
                    )}
                  >
                    {mins}m
                  </button>
                );
              })}
            </div>
          </div>

          <div className="divide-y divide-border-subtle">
            <PreferenceSwitchRow
              label="Timetable & Task Block Alerts"
              description="Dispatch reminders queued on Flow blocks before session start."
              checked={telegram.preferences.blockReminders}
              onToggle={(val) => handlePrefToggle('blockReminders', val)}
            />
            <PreferenceSwitchRow
              label="Morning Daily Brief"
              description={`Summarize Today Focus & P1 priorities at ${telegram.preferences.digestTime}.`}
              checked={telegram.preferences.dailyMorningDigest}
              onToggle={(val) => handlePrefToggle('dailyMorningDigest', val)}
            />
            <PreferenceSwitchRow
              label="Study Exam Countdown Alerts"
              description="Send 7-day and 24-hour warnings for pinned Study papers."
              checked={telegram.preferences.examCountdownAlerts}
              onToggle={(val) => handlePrefToggle('examCountdownAlerts', val)}
            />
            <PreferenceSwitchRow
              label="Tutor Inquiry Notifications"
              description={
                isTutor
                  ? `Forward new student booking inquiries from /@${accountUsername || '[username]'}.`
                  : 'Activates automatically when your account has a Tutor role.'
              }
              checked={telegram.preferences.tutorInquiryAlerts}
              disabled={!isTutor}
              onToggle={(val) => handlePrefToggle('tutorInquiryAlerts', val)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PreferenceSwitchRow({
  label,
  description,
  checked,
  disabled = false,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <label
      className={cn(
        'flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0 transition-colors',
        disabled ? 'cursor-not-allowed opacity-65' : 'cursor-pointer'
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-foreground-muted">
          {description}
        </span>
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-5 w-9 rounded-full bg-border-hover transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-surface-card shadow-[var(--shadow-tier-1)] transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}
