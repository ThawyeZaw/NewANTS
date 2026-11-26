'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { AntMascot, Button } from '@ants/ui';
import { OrgFooterView } from '../../layout/views/OrgFooterView';
import { OrgNavbarView } from '../../layout/views/OrgNavbarView';

export type OrgShowcaseSkeletonLayout = 'home' | 'list' | 'detail';

export interface OrgShowcaseLoadingViewProps {
  activePath: string;
  layout?: OrgShowcaseSkeletonLayout;
  useLocalUrls?: boolean;
  label?: string;
}

/**
 * Stitch Light / Amber Dark loading skeleton shell matching the layout rhythm
 * of `the-ants.org` routes while `@ants/api` fetches live D1 showcase records.
 */
export function OrgShowcaseLoadingView({
  activePath,
  layout = 'list',
  useLocalUrls = true,
  label = 'Loading showcase data from D1…',
}: OrgShowcaseLoadingViewProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <OrgNavbarView activePath={activePath} useLocalUrls={useLocalUrls} />

      <main
        aria-busy="true"
        aria-label={label}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16 space-y-10"
      >
        {layout === 'home' ? (
          <>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
              <div className="space-y-4 lg:col-span-7">
                <div className="h-10 w-3/4 animate-pulse rounded-lg bg-surface-inset" />
                <div className="h-8 w-2/3 animate-pulse rounded-lg bg-surface-inset" />
                <div className="h-16 w-full max-w-xl animate-pulse rounded-lg bg-surface-inset/70" />
                <div className="flex gap-3 pt-2">
                  <div className="h-10 w-40 animate-pulse rounded-lg bg-primary-tint" />
                  <div className="h-10 w-48 animate-pulse rounded-lg bg-surface-inset" />
                </div>
              </div>
              <div className="lg:col-span-5">
                <div className="h-80 w-full animate-pulse rounded-xl border border-border/60 bg-surface-card" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 pt-4">
              <div className="h-56 animate-pulse rounded-xl border border-border/60 bg-surface-card" />
              <div className="h-56 animate-pulse rounded-xl border border-border/60 bg-surface-card" />
            </div>
          </>
        ) : layout === 'detail' ? (
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="h-4 w-32 animate-pulse rounded bg-surface-inset" />
            <div className="h-10 w-3/4 animate-pulse rounded-lg bg-surface-inset" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-surface-inset/70" />
            <div className="h-72 w-full animate-pulse rounded-xl border border-border/60 bg-surface-card" />
            <div className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-surface-inset/70" />
              <div className="h-4 w-11/12 animate-pulse rounded bg-surface-inset/70" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-surface-inset/70" />
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3 max-w-2xl">
              <div className="h-10 w-80 animate-pulse rounded-lg bg-surface-inset" />
              <div className="h-5 w-full animate-pulse rounded bg-surface-inset/70" />
            </div>
            <div className="h-14 w-full animate-pulse rounded-xl border border-border/60 bg-surface-card" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="h-64 animate-pulse rounded-xl border border-border/60 bg-surface-card" />
              <div className="h-64 animate-pulse rounded-xl border border-border/60 bg-surface-card" />
              <div className="h-64 animate-pulse rounded-xl border border-border/60 bg-surface-card" />
              <div className="h-64 animate-pulse rounded-xl border border-border/60 bg-surface-card" />
            </div>
          </>
        )}
      </main>

      <OrgFooterView useLocalUrls={useLocalUrls} />
    </div>
  );
}

export interface OrgShowcaseErrorViewProps {
  activePath: string;
  title?: string;
  code?: string;
  message: string;
  onRetry: () => void;
  useLocalUrls?: boolean;
}

/**
 * Milo-branded retry error state when `@ants/api` is unreachable or returns a 5xx error.
 */
export function OrgShowcaseErrorView({
  activePath,
  title = 'Unable to load live showcase data',
  code,
  message,
  onRetry,
  useLocalUrls = true,
}: OrgShowcaseErrorViewProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <OrgNavbarView activePath={activePath} useLocalUrls={useLocalUrls} />

      <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full rounded-2xl border border-border bg-surface-card p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <AntMascot
              mood="curious"
              app="org"
              propVariant="magnifier"
              size={84}
              ariaLabel="Milo checking showcase connection"
              className="shrink-0"
            />

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <AlertCircle
                  className="h-4 w-4 text-destructive shrink-0"
                  aria-hidden="true"
                />
                <h1 className="text-lg font-bold text-foreground">{title}</h1>
                {code && (
                  <span className="rounded border border-border bg-surface-inset px-1.5 py-0.5 font-mono text-[11px] text-foreground-muted">
                    {code}
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground-muted leading-relaxed">
                {message}
              </p>
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onRetry}
                  leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
                >
                  Retry Connection
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <OrgFooterView useLocalUrls={useLocalUrls} />
    </div>
  );
}
