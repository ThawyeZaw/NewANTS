'use client';

import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  Button,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ants/ui';
import {
  activityToHomePreview,
  teamMemberToFeaturedPreview,
} from '../../../lib/cms';
import type { OrgActivityMock } from '../../../mocks/showcase-content.mock';
import type {
  OrgActivityPreview,
  OrgFeaturedMemberPreview,
  OrgHomeLandingMockData,
} from '../../../mocks/showcase-home.mock';
import type { OrgTeamMemberMock } from '../../../mocks/showcase-team.mock';
import {
  CmsFieldLabel,
  CmsSelect,
  CmsStringListEditor,
  CmsTextarea,
} from './CmsFieldPrimitives';

export interface CmsHomeEditorViewProps {
  home: OrgHomeLandingMockData;
  team: OrgTeamMemberMock[];
  activities: OrgActivityMock[];
  onChange: (next: OrgHomeLandingMockData) => void;
}

export function CmsHomeEditorView({
  home,
  team,
  activities,
  onChange,
}: CmsHomeEditorViewProps) {
  const [subTab, setSubTab] = useState('hero');
  const [addMemberUsername, setAddMemberUsername] = useState(
    team[0]?.username ?? ''
  );
  const [addActivitySlug, setAddActivitySlug] = useState(
    activities[0]?.slug ?? ''
  );

  const heroTitleParts = home.heroTitle.split(' — ');
  const previewLead = heroTitleParts[0] ?? home.heroTitle;
  const previewSub =
    heroTitleParts.length > 1 ? heroTitleParts.slice(1).join(' — ') : '';

  const updateField = <K extends keyof OrgHomeLandingMockData>(
    key: K,
    value: OrgHomeLandingMockData[K]
  ) => {
    onChange({ ...home, [key]: value });
  };

  const moveFeaturedMember = (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= home.featuredMembers.length) return;
    const next = [...home.featuredMembers];
    const [item] = next.splice(idx, 1);
    if (item) next.splice(target, 0, item);
    updateField('featuredMembers', next);
  };

  const moveRecentActivity = (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= home.recentActivities.length) return;
    const next = [...home.recentActivities];
    const [item] = next.splice(idx, 1);
    if (item) next.splice(target, 0, item);
    updateField('recentActivities', next);
  };

  const syncFeaturedFromTeam = () => {
    const next: OrgFeaturedMemberPreview[] = home.featuredMembers.map((fm) => {
      const match = team.find(
        (m) => m.username.toLowerCase() === fm.username.toLowerCase()
      );
      return match ? teamMemberToFeaturedPreview(match) : fm;
    });
    updateField('featuredMembers', next);
  };

  const syncTimelineFromActivities = () => {
    const next: OrgActivityPreview[] = home.recentActivities.map((ra) => {
      const match = activities.find(
        (a) => a.slug.toLowerCase() === ra.slug.toLowerCase()
      );
      return match ? activityToHomePreview(match) : ra;
    });
    updateField('recentActivities', next);
  };

  const handleAddFeaturedMember = () => {
    const target = team.find((m) => m.username === addMemberUsername);
    if (!target) return;
    if (home.featuredMembers.some((fm) => fm.username === target.username)) {
      return;
    }
    updateField('featuredMembers', [
      ...home.featuredMembers,
      teamMemberToFeaturedPreview(target),
    ]);
  };

  const handleAddTimelineActivity = () => {
    const target = activities.find((a) => a.slug === addActivitySlug);
    if (!target) return;
    if (home.recentActivities.some((ra) => ra.slug === target.slug)) {
      return;
    }
    updateField('recentActivities', [
      activityToHomePreview(target),
      ...home.recentActivities,
    ]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Home Landing Content
          </h2>
          <p className="text-xs text-foreground-muted">
            Controls hero copy, mission pillars, product cards, tutor carousel,
            and timeline on <span className="font-mono">/</span>.
          </p>
        </div>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab} variant="underline">
        <TabsList>
          <TabsTrigger value="hero">Hero &amp; Mission</TabsTrigger>
          <TabsTrigger value="pillars">Impact &amp; Pillars</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="featured">Featured &amp; Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="pt-4 space-y-5">
          <div className="rounded-xl border border-border bg-surface-card p-5 space-y-4">
            <CmsFieldLabel
              htmlFor="cms-hero-title"
              label="Hero Headline"
              hint='Use " — " (space em-dash space) to split the amber lead phrase from the subtitle'
            >
              <Input
                id="cms-hero-title"
                value={home.heroTitle}
                onChange={(e) => updateField('heroTitle', e.target.value)}
              />
            </CmsFieldLabel>

            {/* Live Hero Headline Preview */}
            <div className="rounded-lg border border-border bg-surface-inset p-3.5 space-y-1">
              <span className="block font-mono text-[10px] font-semibold text-foreground-muted">
                Live Split Preview
              </span>
              <p className="text-base font-extrabold text-primary-solid leading-tight">
                {previewLead}
              </p>
              {previewSub && (
                <p className="text-sm font-bold text-foreground leading-snug">
                  {previewSub}
                </p>
              )}
            </div>

            <CmsFieldLabel
              htmlFor="cms-hero-badge"
              label="Hero Identity Line"
              hint="Displayed directly under the H1"
            >
              <Input
                id="cms-hero-badge"
                value={home.heroBadge}
                onChange={(e) => updateField('heroBadge', e.target.value)}
              />
            </CmsFieldLabel>

            <CmsFieldLabel
              htmlFor="cms-hero-description"
              label="Hero Description"
            >
              <CmsTextarea
                id="cms-hero-description"
                rows={3}
                value={home.heroDescription}
                onChange={(val) => updateField('heroDescription', val)}
              />
            </CmsFieldLabel>

            <CmsFieldLabel
              htmlFor="cms-mission-statement"
              label="Organization Mission Statement"
            >
              <CmsTextarea
                id="cms-mission-statement"
                rows={3}
                value={home.missionStatement}
                onChange={(val) => updateField('missionStatement', val)}
              />
            </CmsFieldLabel>
          </div>
        </TabsContent>

        <TabsContent value="pillars" className="pt-4 space-y-6">
          {/* Impact Stats */}
          <div className="rounded-xl border border-border bg-surface-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Impact Metrics
                </h3>
                <p className="text-xs text-foreground-muted">
                  Summary figures stored in home data.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() =>
                  updateField('impactStats', [
                    ...home.impactStats,
                    {
                      id: `stat_${Date.now().toString(36)}`,
                      value: '100+',
                      label: 'New metric label',
                      detail: 'Supporting note',
                    },
                  ])
                }
              >
                Add Metric
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {home.impactStats.map((stat, idx) => (
                <div
                  key={stat.id}
                  className="rounded-lg border border-border bg-surface-inset/50 p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold text-foreground-muted">
                      {stat.id}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateField(
                          'impactStats',
                          home.impactStats.filter((_, i) => i !== idx)
                        )
                      }
                      aria-label={`Remove metric ${stat.label}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-card text-foreground-muted hover:border-danger-border hover:bg-danger-tint hover:text-on-danger-tint"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      value={stat.value}
                      onChange={(e) =>
                        updateField(
                          'impactStats',
                          home.impactStats.map((s, i) =>
                            i === idx ? { ...s, value: e.target.value } : s
                          )
                        )
                      }
                      placeholder="Value"
                      className="h-9 font-mono text-xs font-bold"
                    />
                    <Input
                      value={stat.label}
                      onChange={(e) =>
                        updateField(
                          'impactStats',
                          home.impactStats.map((s, i) =>
                            i === idx ? { ...s, label: e.target.value } : s
                          )
                        )
                      }
                      placeholder="Label"
                      className="col-span-2 h-9 text-xs"
                    />
                  </div>
                  <Input
                    value={stat.detail}
                    onChange={(e) =>
                      updateField(
                        'impactStats',
                        home.impactStats.map((s, i) =>
                          i === idx ? { ...s, detail: e.target.value } : s
                        )
                      )
                    }
                    placeholder="Detail"
                    className="h-9 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Mission Pillars */}
          <div className="rounded-xl border border-border bg-surface-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Mission Pillars
                </h3>
                <p className="text-xs text-foreground-muted">
                  Core organizational pillars explaining Tutoring, Software, and
                  Community.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() =>
                  updateField('missionPillars', [
                    ...home.missionPillars,
                    {
                      id: `pillar_${Date.now().toString(36)}`,
                      code: 'Initiative',
                      title: 'New Mission Pillar',
                      description: 'Describe what this pillar delivers.',
                    },
                  ])
                }
              >
                Add Pillar
              </Button>
            </div>

            <div className="space-y-3">
              {home.missionPillars.map((pillar, idx) => (
                <div
                  key={pillar.id}
                  className="rounded-lg border border-border bg-surface-inset/50 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold text-foreground-muted">
                      {pillar.id}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateField(
                          'missionPillars',
                          home.missionPillars.filter((_, i) => i !== idx)
                        )
                      }
                      aria-label={`Delete pillar ${pillar.title}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-card text-foreground-muted hover:border-danger-border hover:bg-danger-tint hover:text-on-danger-tint"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <Input
                      value={pillar.code}
                      onChange={(e) =>
                        updateField(
                          'missionPillars',
                          home.missionPillars.map((p, i) =>
                            i === idx ? { ...p, code: e.target.value } : p
                          )
                        )
                      }
                      placeholder="Code"
                      className="h-9 font-mono text-xs"
                    />
                    <Input
                      value={pillar.title}
                      onChange={(e) =>
                        updateField(
                          'missionPillars',
                          home.missionPillars.map((p, i) =>
                            i === idx ? { ...p, title: e.target.value } : p
                          )
                        )
                      }
                      placeholder="Title"
                      className="sm:col-span-2 h-9 text-xs font-semibold"
                    />
                  </div>
                  <CmsTextarea
                    rows={2}
                    value={pillar.description}
                    onChange={(val) =>
                      updateField(
                        'missionPillars',
                        home.missionPillars.map((p, i) =>
                          i === idx ? { ...p, description: val } : p
                        )
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="products" className="pt-4 space-y-4">
          {home.products.map((product, idx) => (
            <div
              key={product.id}
              className="rounded-xl border border-border bg-surface-card p-5 space-y-4"
            >
              <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground">
                  {product.name} ({product.domainLabel})
                </h3>
                <span className="rounded border border-border bg-surface-inset px-2 py-0.5 font-mono text-[11px] text-foreground-muted">
                  id: {product.id}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <CmsFieldLabel label="Product Name">
                  <Input
                    value={product.name}
                    onChange={(e) =>
                      updateField(
                        'products',
                        home.products.map((p, i) =>
                          i === idx ? { ...p, name: e.target.value } : p
                        )
                      )
                    }
                    className="h-9 text-xs"
                  />
                </CmsFieldLabel>
                <CmsFieldLabel label="Badge Label">
                  <Input
                    value={product.badge}
                    onChange={(e) =>
                      updateField(
                        'products',
                        home.products.map((p, i) =>
                          i === idx ? { ...p, badge: e.target.value } : p
                        )
                      )
                    }
                    className="h-9 text-xs"
                  />
                </CmsFieldLabel>
                <CmsFieldLabel label="CTA Button Label">
                  <Input
                    value={product.ctaLabel}
                    onChange={(e) =>
                      updateField(
                        'products',
                        home.products.map((p, i) =>
                          i === idx ? { ...p, ctaLabel: e.target.value } : p
                        )
                      )
                    }
                    className="h-9 text-xs"
                  />
                </CmsFieldLabel>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <CmsFieldLabel label="Production URL">
                  <Input
                    value={product.href}
                    onChange={(e) =>
                      updateField(
                        'products',
                        home.products.map((p, i) =>
                          i === idx ? { ...p, href: e.target.value } : p
                        )
                      )
                    }
                    className="h-9 font-mono text-xs"
                  />
                </CmsFieldLabel>
                <CmsFieldLabel label="Local Dev URL">
                  <Input
                    value={product.localHref}
                    onChange={(e) =>
                      updateField(
                        'products',
                        home.products.map((p, i) =>
                          i === idx ? { ...p, localHref: e.target.value } : p
                        )
                      )
                    }
                    className="h-9 font-mono text-xs"
                  />
                </CmsFieldLabel>
              </div>

              <CmsFieldLabel label="Headline">
                <Input
                  value={product.headline}
                  onChange={(e) =>
                    updateField(
                      'products',
                      home.products.map((p, i) =>
                        i === idx ? { ...p, headline: e.target.value } : p
                      )
                    )
                  }
                  className="h-9 text-xs"
                />
              </CmsFieldLabel>

              <CmsFieldLabel label="Description">
                <CmsTextarea
                  rows={2}
                  value={product.description}
                  onChange={(val) =>
                    updateField(
                      'products',
                      home.products.map((p, i) =>
                        i === idx ? { ...p, description: val } : p
                      )
                    )
                  }
                />
              </CmsFieldLabel>

              <CmsStringListEditor
                label="Highlights"
                items={product.highlights}
                onChange={(nextHighlights) =>
                  updateField(
                    'products',
                    home.products.map((p, i) =>
                      i === idx ? { ...p, highlights: nextHighlights } : p
                    )
                  )
                }
                placeholder="Add highlight bullet..."
              />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="featured" className="pt-4 space-y-6">
          {/* Featured Members on Home Carousel */}
          <div className="rounded-xl border border-border bg-surface-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Featured Founders &amp; Tutors Carousel
                </h3>
                <p className="text-xs text-foreground-muted">
                  Shown in Section 3 on the Home landing page.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                }
                onClick={syncFeaturedFromTeam}
              >
                Sync from Team
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-inset/50 p-3">
              <div className="min-w-[200px] flex-1">
                <CmsSelect
                  value={addMemberUsername}
                  onChange={setAddMemberUsername}
                  options={team.map((m) => ({
                    value: m.username,
                    label: `${m.name} (@${m.username})`,
                  }))}
                  className="h-9 text-xs"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={handleAddFeaturedMember}
                disabled={
                  !addMemberUsername ||
                  home.featuredMembers.some(
                    (fm) => fm.username === addMemberUsername
                  )
                }
                className="h-9"
              >
                Feature Member
              </Button>
            </div>

            <div className="space-y-3">
              {home.featuredMembers.map((fm, idx) => (
                <div
                  key={fm.username}
                  className="rounded-lg border border-border bg-surface-inset/40 p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      @{fm.username}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveFeaturedMember(idx, 'up')}
                        disabled={idx === 0}
                        aria-label={`Move ${fm.name} up`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-surface-card text-foreground-muted hover:text-foreground disabled:opacity-35"
                      >
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveFeaturedMember(idx, 'down')}
                        disabled={idx === home.featuredMembers.length - 1}
                        aria-label={`Move ${fm.name} down`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-surface-card text-foreground-muted hover:text-foreground disabled:opacity-35"
                      >
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (home.featuredMembers.length <= 1) return;
                          updateField(
                            'featuredMembers',
                            home.featuredMembers.filter((_, i) => i !== idx)
                          );
                        }}
                        disabled={home.featuredMembers.length <= 1}
                        aria-label={`Remove ${fm.name} from featured carousel`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-surface-card text-foreground-muted hover:border-danger-border hover:bg-danger-tint hover:text-on-danger-tint disabled:opacity-35"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      value={fm.name}
                      onChange={(e) =>
                        updateField(
                          'featuredMembers',
                          home.featuredMembers.map((item, i) =>
                            i === idx ? { ...item, name: e.target.value } : item
                          )
                        )
                      }
                      placeholder="Display name"
                      className="h-9 text-xs"
                    />
                    <Input
                      value={fm.roleBadge}
                      onChange={(e) =>
                        updateField(
                          'featuredMembers',
                          home.featuredMembers.map((item, i) =>
                            i === idx
                              ? { ...item, roleBadge: e.target.value }
                              : item
                          )
                        )
                      }
                      placeholder="Role badge"
                      className="h-9 text-xs"
                    />
                    <Input
                      value={fm.title}
                      onChange={(e) =>
                        updateField(
                          'featuredMembers',
                          home.featuredMembers.map((item, i) =>
                            i === idx
                              ? { ...item, title: e.target.value }
                              : item
                          )
                        )
                      }
                      placeholder="Headline"
                      className="h-9 text-xs"
                    />
                    <Input
                      value={fm.availabilityLabel}
                      onChange={(e) =>
                        updateField(
                          'featuredMembers',
                          home.featuredMembers.map((item, i) =>
                            i === idx
                              ? { ...item, availabilityLabel: e.target.value }
                              : item
                          )
                        )
                      }
                      placeholder="Tue · Thu · Sat"
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activities Timeline */}
          <div className="rounded-xl border border-border bg-surface-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Home Activity Timeline
                </h3>
                <p className="text-xs text-foreground-muted">
                  Pinned recent events linked to <span className="font-mono">/activities/[slug]</span>.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                }
                onClick={syncTimelineFromActivities}
              >
                Sync from Activities
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-inset/50 p-3">
              <div className="min-w-[200px] flex-1">
                <CmsSelect
                  value={addActivitySlug}
                  onChange={setAddActivitySlug}
                  options={activities.map((a) => ({
                    value: a.slug,
                    label: `${a.title} (${a.dateLabel})`,
                  }))}
                  className="h-9 text-xs"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={handleAddTimelineActivity}
                disabled={
                  !addActivitySlug ||
                  home.recentActivities.some(
                    (ra) => ra.slug === addActivitySlug
                  )
                }
                className="h-9"
              >
                Pin Activity
              </Button>
            </div>

            <div className="space-y-3">
              {home.recentActivities.map((act, idx) => (
                <div
                  key={act.slug}
                  className="rounded-lg border border-border bg-surface-inset/40 p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground-muted truncate">
                      /activities/{act.slug}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveRecentActivity(idx, 'up')}
                        disabled={idx === 0}
                        aria-label={`Move ${act.title} up`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-surface-card text-foreground-muted hover:text-foreground disabled:opacity-35"
                      >
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRecentActivity(idx, 'down')}
                        disabled={idx === home.recentActivities.length - 1}
                        aria-label={`Move ${act.title} down`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-surface-card text-foreground-muted hover:text-foreground disabled:opacity-35"
                      >
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateField(
                            'recentActivities',
                            home.recentActivities.filter((_, i) => i !== idx)
                          )
                        }
                        aria-label={`Remove ${act.title} from timeline`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-surface-card text-foreground-muted hover:border-danger-border hover:bg-danger-tint hover:text-on-danger-tint"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Input
                      value={act.title}
                      onChange={(e) =>
                        updateField(
                          'recentActivities',
                          home.recentActivities.map((item, i) =>
                            i === idx
                              ? { ...item, title: e.target.value }
                              : item
                          )
                        )
                      }
                      className="sm:col-span-2 h-9 text-xs font-semibold"
                    />
                    <Input
                      value={act.dateLabel}
                      onChange={(e) =>
                        updateField(
                          'recentActivities',
                          home.recentActivities.map((item, i) =>
                            i === idx
                              ? { ...item, dateLabel: e.target.value }
                              : item
                          )
                        )
                      }
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                  <Input
                    value={act.location}
                    onChange={(e) =>
                      updateField(
                        'recentActivities',
                        home.recentActivities.map((item, i) =>
                          i === idx
                            ? { ...item, location: e.target.value }
                            : item
                        )
                      )
                    }
                    placeholder="Location"
                    className="h-9 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

