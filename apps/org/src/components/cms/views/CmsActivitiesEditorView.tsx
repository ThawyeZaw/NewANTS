'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Calendar,
  Copy,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from '@ants/ui';
import {
  ORG_LOCAL_MEDIA_ASSETS,
  createBlankActivity,
  ensureUniqueSlug,
  slugifyCmsText,
} from '../../../lib/cms';
import type {
  OrgActivityCategory,
  OrgActivityExternalLinkMock,
  OrgActivityMock,
  OrgActivityPhaseMock,
  OrgActivityPhotoMock,
  OrgArtworkTheme,
} from '../../../mocks/showcase-content.mock';
import {
  CmsFieldLabel,
  CmsSelect,
  CmsStringListEditor,
  CmsTagListEditor,
  CmsTextarea,
} from './CmsFieldPrimitives';
import { CmsImageDropzone } from './CmsImageDropzone';

export interface CmsActivitiesEditorViewProps {
  activities: OrgActivityMock[];
  onUpsert: (activity: OrgActivityMock) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  initialSubTab?: 'overview' | 'schedule' | 'gallery';
}

const CATEGORY_OPTIONS: Array<{ value: OrgActivityCategory; label: string }> = [
  { value: 'Tutoring', label: 'Tutoring' },
  { value: "Student's Meet", label: "Student's Meet" },
  { value: 'Exam Venue Visit', label: 'Exam Venue Visit' },
  { value: 'Hackathon', label: 'Hackathon' },
];

const ARTWORK_OPTIONS: Array<{ value: OrgArtworkTheme; label: string }> = [
  { value: 'tutoring', label: 'Tutoring' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'venue', label: 'Exam Venue' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'article-maths', label: 'Maths / Desk Notes' },
];

export function CmsActivitiesEditorView({
  activities,
  onUpsert,
  onDelete,
  onMove,
  initialSubTab = 'overview',
}: CmsActivitiesEditorViewProps) {
  const [selectedId, setSelectedId] = useState<string>(
    activities[0]?.id ?? ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [subTab, setSubTab] = useState<'overview' | 'schedule' | 'gallery'>(
    initialSubTab
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter((a) =>
      [a.title, a.slug, a.category, a.location, a.dateLabel]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [activities, searchQuery]);

  const activeActivity = useMemo(
    () => activities.find((a) => a.id === selectedId) ?? activities[0] ?? null,
    [activities, selectedId]
  );

  const handleCreate = () => {
    const created = createBlankActivity(activities.map((a) => a.slug));
    onUpsert(created);
    setSelectedId(created.id);
    setSubTab('overview');
    setConfirmDeleteId(null);
  };

  const handleDuplicate = (activity: OrgActivityMock) => {
    const slug = ensureUniqueSlug(
      `${activity.slug}-copy`,
      activities.map((a) => a.slug)
    );
    const copy: OrgActivityMock = {
      ...JSON.parse(JSON.stringify(activity)),
      id: `act_${Date.now().toString(36)}`,
      slug,
      title: `${activity.title} (Copy)`,
    };
    onUpsert(copy);
    setSelectedId(copy.id);
    setConfirmDeleteId(null);
  };

  const updateActive = (patch: Partial<OrgActivityMock>) => {
    if (!activeActivity) return;
    onUpsert({ ...activeActivity, ...patch });
  };

  const addExternalLink = () => {
    if (!activeActivity) return;
    const next: OrgActivityExternalLinkMock[] = [
      ...(activeActivity.externalLinks ?? []),
      { label: 'Register Online', href: 'https://the-ants.org', variant: 'primary' },
    ];
    updateActive({ externalLinks: next });
  };

  const addSchedulePhase = () => {
    if (!activeActivity) return;
    const next: OrgActivityPhaseMock[] = [
      ...(activeActivity.schedulePhases ?? []),
      {
        window: 'Day 1',
        phase: 'Session Block',
        mode: 'In-person & Online',
        summary: 'Describe what happens in this phase.',
      },
    ];
    updateActive({ schedulePhases: next });
  };

  const addGalleryPhoto = () => {
    if (!activeActivity) return;
    const asset = ORG_LOCAL_MEDIA_ASSETS[0]!;
    const next: OrgActivityPhotoMock[] = [
      ...activeActivity.gallery,
      {
        id: `gal_${Date.now().toString(36)}`,
        imageSrc: asset.src,
        imageAlt: asset.defaultAlt,
        caption: 'Describe the documentary photograph.',
        locationTag: 'Study Room',
        shotLabel: 'New Shot',
        artworkTheme: asset.artworkTheme,
      },
    ];
    updateActive({ gallery: next });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Activities &amp; Hackathon Events
          </h2>
          <p className="text-xs text-foreground-muted">
            Edit Tutoring cohorts, Student’s Meets, Exam Venue Visits,
            Hackathons, and documentary galleries on{' '}
            <span className="font-mono">/activities</span>.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={handleCreate}
        >
          New Activity
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left List */}
        <aside className="lg:col-span-4 space-y-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted"
              aria-hidden="true"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, category, venue..."
              className="h-9 pl-8 text-xs"
            />
          </div>

          <div className="rounded-xl border border-border bg-surface-card divide-y divide-border overflow-hidden">
            {filteredActivities.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <Calendar
                  className="mx-auto h-5 w-5 text-foreground-muted"
                  aria-hidden="true"
                />
                <p className="text-xs text-foreground-muted">
                  No activities match your search.
                </p>
              </div>
            ) : (
              filteredActivities.map((act) => {
                const selected = activeActivity?.id === act.id;
                const realIdx = activities.findIndex((a) => a.id === act.id);

                return (
                  <div
                    key={act.id}
                    className={cn(
                      'flex items-center justify-between gap-2 px-3 py-2.5 transition-colors',
                      selected
                        ? 'bg-primary-tint/55'
                        : 'hover:bg-surface-inset/60'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(act.id);
                        setConfirmDeleteId(null);
                      }}
                      className="min-w-0 flex-1 text-left flex items-center gap-2.5"
                    >
                      <img
                        src={act.coverImageSrc}
                        alt=""
                        className="h-9 w-12 shrink-0 rounded-md border border-border object-cover bg-surface-inset"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">
                          {act.title}
                        </p>
                        <p className="truncate font-mono text-[11px] text-foreground-muted">
                          {act.category} · {act.dateLabel}
                        </p>
                      </div>
                    </button>

                    {!searchQuery.trim() && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => onMove(act.id, 'up')}
                          disabled={realIdx <= 0}
                          aria-label={`Move ${act.title} up`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground-muted hover:bg-surface-card hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowUp className="h-3 w-3" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMove(act.id, 'down')}
                          disabled={realIdx === activities.length - 1}
                          aria-label={`Move ${act.title} down`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground-muted hover:bg-surface-card hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowDown className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Editor */}
        <div className="lg:col-span-8">
          {!activeActivity ? (
            <div className="rounded-xl border border-border bg-surface-card p-8 text-center space-y-3">
              <p className="text-sm font-semibold text-foreground">
                No activities found
              </p>
              <Button type="button" variant="primary" size="sm" onClick={handleCreate}>
                Create First Activity
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface-card p-5 space-y-5">
              {/* Active Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div className="min-w-0 space-y-1">
                  <h3 className="truncate text-base font-bold text-foreground">
                    {activeActivity.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-foreground-muted">
                      /activities/{activeActivity.slug}
                    </span>
                    <Badge variant="editorial">{activeActivity.category}</Badge>
                    {activeActivity.isUpcoming && (
                      <Badge variant="verified" dot>
                        Upcoming
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/activities/${activeActivity.slug}`}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:bg-surface-inset"
                  >
                    <span>Preview</span>
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    leftIcon={<Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={() => handleDuplicate(activeActivity)}
                    className="h-8"
                  >
                    Duplicate
                  </Button>
                  {confirmDeleteId === activeActivity.id ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const remaining = activities.filter(
                          (a) => a.id !== activeActivity.id
                        );
                        onDelete(activeActivity.id);
                        setSelectedId(remaining[0]?.id ?? '');
                        setConfirmDeleteId(null);
                      }}
                      className="h-8"
                    >
                      Confirm Delete
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                      onClick={() => setConfirmDeleteId(activeActivity.id)}
                      className="h-8 text-foreground-muted hover:text-on-danger-tint hover:bg-danger-tint"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              <Tabs
                value={subTab}
                onValueChange={(val) =>
                  setSubTab(val as 'overview' | 'schedule' | 'gallery')
                }
                variant="underline"
              >
                <TabsList>
                  <TabsTrigger value="overview">Overview &amp; Copy</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule &amp; Links</TabsTrigger>
                  <TabsTrigger value="gallery">
                    Photos ({activeActivity.gallery.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="pt-4 space-y-4">
                  <CmsFieldLabel label="Activity Title">
                    <Input
                      value={activeActivity.title}
                      onChange={(e) => updateActive({ title: e.target.value })}
                      className="h-9 text-xs font-semibold"
                    />
                  </CmsFieldLabel>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                    <div className="sm:col-span-7">
                      <CmsFieldLabel label="URL Slug">
                        <div className="flex gap-1.5">
                          <Input
                            value={activeActivity.slug}
                            onChange={(e) =>
                              updateActive({
                                slug: slugifyCmsText(e.target.value),
                              })
                            }
                            className="h-9 font-mono text-xs"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateActive({
                                slug: ensureUniqueSlug(
                                  activeActivity.title,
                                  activities.map((a) => a.slug),
                                  activeActivity.slug
                                ),
                              })
                            }
                            className="h-9 shrink-0 rounded-lg border border-border bg-surface-inset px-2.5 text-[11px] font-semibold text-foreground-muted hover:text-foreground"
                          >
                            From Title
                          </button>
                        </div>
                      </CmsFieldLabel>
                    </div>
                    <div className="sm:col-span-5">
                      <CmsFieldLabel label="Category">
                        <CmsSelect
                          value={activeActivity.category}
                          onChange={(val) =>
                            updateActive({
                              category: val as OrgActivityCategory,
                            })
                          }
                          options={CATEGORY_OPTIONS}
                          className="h-9 text-xs"
                        />
                      </CmsFieldLabel>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <CmsFieldLabel label="Date Label">
                      <Input
                        value={activeActivity.dateLabel}
                        onChange={(e) =>
                          updateActive({ dateLabel: e.target.value })
                        }
                        placeholder="Nov 23 – Dec 6, 2026"
                        className="h-9 font-mono text-xs"
                      />
                    </CmsFieldLabel>
                    <CmsFieldLabel label="Location">
                      <Input
                        value={activeActivity.location}
                        onChange={(e) =>
                          updateActive({ location: e.target.value })
                        }
                        className="h-9 text-xs"
                      />
                    </CmsFieldLabel>
                    <CmsFieldLabel label="Attendance">
                      <Input
                        value={activeActivity.attendanceLabel}
                        onChange={(e) =>
                          updateActive({ attendanceLabel: e.target.value })
                        }
                        className="h-9 font-mono text-xs"
                      />
                    </CmsFieldLabel>
                  </div>

                  <div className="rounded-lg border border-border bg-surface-inset/50 px-3.5 py-2.5">
                    <Checkbox
                      checked={Boolean(activeActivity.isUpcoming)}
                      onCheckedChange={(checked) =>
                        updateActive({ isUpcoming: checked })
                      }
                      label="Mark as Upcoming Event (shows green Upcoming badge)"
                    />
                  </div>

                  <CmsTagListEditor
                    label="Facilitators / Organizers"
                    tags={activeActivity.facilitators}
                    onChange={(next) => updateActive({ facilitators: next })}
                    placeholder="Add facilitator name..."
                  />

                  <CmsFieldLabel label="Summary">
                    <CmsTextarea
                      rows={2}
                      value={activeActivity.summary}
                      onChange={(val) => updateActive({ summary: val })}
                    />
                  </CmsFieldLabel>

                  <CmsStringListEditor
                    label="Overview Paragraphs"
                    items={activeActivity.recapParagraphs}
                    onChange={(next) => updateActive({ recapParagraphs: next })}
                    multiline
                    placeholder="Add paragraph for /activities/[slug]..."
                  />

                  <CmsStringListEditor
                    label="Key Highlights"
                    items={activeActivity.highlights}
                    onChange={(next) => updateActive({ highlights: next })}
                    placeholder="Add highlight bullet..."
                  />
                </TabsContent>

                <TabsContent value="schedule" className="pt-4 space-y-6">
                  {/* External Registration / Resource Links */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">
                          External Action Links
                        </h4>
                        <p className="text-xs text-foreground-muted">
                          E.g., Hackathon registration or external portal URLs.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                        onClick={addExternalLink}
                      >
                        Add Link
                      </Button>
                    </div>

                    {(activeActivity.externalLinks ?? []).length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border p-4 text-xs text-foreground-muted">
                        No external CTA buttons configured for this activity.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {(activeActivity.externalLinks ?? []).map((ext, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface-inset/50 p-3 sm:grid-cols-12 sm:items-center"
                          >
                            <Input
                              value={ext.label}
                              onChange={(e) =>
                                updateActive({
                                  externalLinks: (
                                    activeActivity.externalLinks ?? []
                                  ).map((item, i) =>
                                    i === idx
                                      ? { ...item, label: e.target.value }
                                      : item
                                  ),
                                })
                              }
                              placeholder="Button label"
                              className="sm:col-span-4 h-9 text-xs"
                            />
                            <Input
                              value={ext.href}
                              onChange={(e) =>
                                updateActive({
                                  externalLinks: (
                                    activeActivity.externalLinks ?? []
                                  ).map((item, i) =>
                                    i === idx
                                      ? { ...item, href: e.target.value }
                                      : item
                                  ),
                                })
                              }
                              placeholder="https://..."
                              className="sm:col-span-5 h-9 font-mono text-xs"
                            />
                            <div className="sm:col-span-2">
                              <CmsSelect
                                value={ext.variant ?? 'primary'}
                                onChange={(val) =>
                                  updateActive({
                                    externalLinks: (
                                      activeActivity.externalLinks ?? []
                                    ).map((item, i) =>
                                      i === idx
                                        ? {
                                          ...item,
                                          variant:
                                            val === 'secondary'
                                              ? 'secondary'
                                              : 'primary',
                                        }
                                        : item
                                    ),
                                  })
                                }
                                options={[
                                  { value: 'primary', label: 'Primary' },
                                  { value: 'secondary', label: 'Secondary' },
                                ]}
                                className="h-9 text-xs"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                updateActive({
                                  externalLinks: (
                                    activeActivity.externalLinks ?? []
                                  ).filter((_, i) => i !== idx),
                                })
                              }
                              aria-label="Remove external link"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-card text-foreground-muted hover:border-danger-border hover:bg-danger-tint hover:text-on-danger-tint justify-self-end"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Schedule Phases */}
                  <div className="space-y-3 border-t border-border pt-5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">
                          Program Schedule Phases
                        </h4>
                        <p className="text-xs text-foreground-muted">
                          Optional multi-phase schedule shown on the activity
                          detail page.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                        onClick={addSchedulePhase}
                      >
                        Add Phase
                      </Button>
                    </div>

                    {(activeActivity.schedulePhases ?? []).length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border p-4 text-xs text-foreground-muted">
                        No schedule phases added. Click “Add Phase” for
                        multi-day events or hackathons.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {(activeActivity.schedulePhases ?? []).map(
                          (phase, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-border bg-surface-inset/50 p-3.5 space-y-2.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[11px] font-semibold text-foreground-muted">
                                  Phase {idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateActive({
                                      schedulePhases: (
                                        activeActivity.schedulePhases ?? []
                                      ).filter((_, i) => i !== idx),
                                    })
                                  }
                                  aria-label={`Remove phase ${idx + 1}`}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-surface-card text-foreground-muted hover:border-danger-border hover:bg-danger-tint hover:text-on-danger-tint"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </div>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                <Input
                                  value={phase.window}
                                  onChange={(e) =>
                                    updateActive({
                                      schedulePhases: (
                                        activeActivity.schedulePhases ?? []
                                      ).map((p, i) =>
                                        i === idx
                                          ? { ...p, window: e.target.value }
                                          : p
                                      ),
                                    })
                                  }
                                  placeholder="Nov 23 – 27"
                                  className="h-9 font-mono text-xs"
                                />
                                <Input
                                  value={phase.phase}
                                  onChange={(e) =>
                                    updateActive({
                                      schedulePhases: (
                                        activeActivity.schedulePhases ?? []
                                      ).map((p, i) =>
                                        i === idx
                                          ? { ...p, phase: e.target.value }
                                          : p
                                      ),
                                    })
                                  }
                                  placeholder="Phase title"
                                  className="h-9 text-xs font-semibold"
                                />
                                <Input
                                  value={phase.mode}
                                  onChange={(e) =>
                                    updateActive({
                                      schedulePhases: (
                                        activeActivity.schedulePhases ?? []
                                      ).map((p, i) =>
                                        i === idx
                                          ? { ...p, mode: e.target.value }
                                          : p
                                      ),
                                    })
                                  }
                                  placeholder="Mode / venue"
                                  className="h-9 text-xs"
                                />
                              </div>
                              <CmsTextarea
                                rows={2}
                                value={phase.summary}
                                onChange={(val) =>
                                  updateActive({
                                    schedulePhases: (
                                      activeActivity.schedulePhases ?? []
                                    ).map((p, i) =>
                                      i === idx ? { ...p, summary: val } : p
                                    ),
                                  })
                                }
                              />
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="gallery" className="pt-4 space-y-6">
                  {/* Cover Photo */}
                  <div className="rounded-xl border border-border bg-surface-inset/40 p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h4 className="text-sm font-bold text-foreground">
                        Cover Photograph
                      </h4>
                      {activeActivity.coverImageSrc.startsWith('data:image/') ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-tint-border bg-primary-tint px-2.5 py-0.5 text-[11px] font-mono font-semibold text-on-primary-tint">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          Custom Upload
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-card px-2.5 py-0.5 text-[11px] font-mono text-foreground-muted">
                          Preset / URL
                        </span>
                      )}
                    </div>

                    {/* Active Cover Preview & Details */}
                    <div className="flex flex-col sm:flex-row gap-3.5 items-center rounded-lg border border-border bg-surface-card p-3">
                      <div className="relative aspect-[16/9] w-full sm:w-48 shrink-0 overflow-hidden rounded-md border border-border bg-surface-inset">
                        <img
                          src={activeActivity.coverImageSrc}
                          alt={activeActivity.coverAlt || activeActivity.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate">
                          {activeActivity.title}
                        </p>
                      </div>
                    </div>

                    {/* Drag & Drop Upload Zone for Cover Photo */}
                    <CmsImageDropzone
                      label="Upload New Cover Photograph"
                      buttonLabel="Upload Cover Image"
                      onUpload={([res]) => {
                        if (!res) return;
                        updateActive({
                          coverImageSrc: res.dataUrl,
                          coverAlt: `${activeActivity.title} — ${res.shotLabel}`,
                        });
                      }}
                    />

                    {/* Preset Picker Accordion / Strip */}
                    <div className="space-y-2 pt-1 border-t border-border-subtle">
                      <span className="block text-xs font-semibold text-foreground">
                        Or select from built-in documentary presets:
                      </span>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {ORG_LOCAL_MEDIA_ASSETS.map((asset) => {
                          const chosen =
                            activeActivity.coverImageSrc === asset.src;
                          return (
                            <button
                              key={asset.src}
                              type="button"
                              onClick={() =>
                                updateActive({
                                  coverImageSrc: asset.src,
                                  coverAlt: asset.defaultAlt,
                                  artworkTheme: asset.artworkTheme,
                                })
                              }
                              className={cn(
                                'group rounded-lg border p-1.5 text-left transition-colors',
                                chosen
                                  ? 'border-primary bg-primary-tint'
                                  : 'border-border bg-surface-card hover:border-border-hover'
                              )}
                            >
                              <img
                                src={asset.src}
                                alt=""
                                className="aspect-[16/9] w-full rounded object-cover"
                              />
                              <span className="mt-1 block truncate text-[11px] font-semibold text-foreground">
                                {asset.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2">
                      <div className="sm:col-span-2">
                        <CmsFieldLabel label="Cover Image URL / Path">
                          <Input
                            value={activeActivity.coverImageSrc}
                            onChange={(e) =>
                              updateActive({ coverImageSrc: e.target.value })
                            }
                            className="h-9 font-mono text-xs"
                          />
                        </CmsFieldLabel>
                      </div>
                      <CmsFieldLabel label="Artwork Theme">
                        <CmsSelect
                          value={activeActivity.artworkTheme}
                          onChange={(val) =>
                            updateActive({
                              artworkTheme: val as OrgArtworkTheme,
                            })
                          }
                          options={ARTWORK_OPTIONS}
                          className="h-9 text-xs"
                        />
                      </CmsFieldLabel>
                    </div>

                    <CmsFieldLabel label="Cover Alt Text">
                      <Input
                        value={activeActivity.coverAlt}
                        onChange={(e) =>
                          updateActive({ coverAlt: e.target.value })
                        }
                        className="h-9 text-xs"
                      />
                    </CmsFieldLabel>
                  </div>

                  {/* Gallery Photos */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h4 className="text-sm font-bold text-foreground">
                        Documentary Photo Gallery ({activeActivity.gallery.length})
                      </h4>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                          onClick={addGalleryPhoto}
                        >
                          Add Empty Card
                        </Button>
                      </div>
                    </div>

                    {/* Batch Multi-Photo Dropzone */}
                    <CmsImageDropzone
                      multiple
                      label="Batch Upload Gallery Photos"
                      buttonLabel="Select Multiple Photos"
                      onUpload={(results) => {
                        const newPhotos: OrgActivityPhotoMock[] = results.map((res, i) => ({
                          id: `gal_${Date.now().toString(36)}_${i}_${Math.random().toString(36).slice(2, 6)}`,
                          imageSrc: res.dataUrl,
                          imageAlt: `${activeActivity.title} — ${res.shotLabel}`,
                          caption: `${res.shotLabel} captured at ${activeActivity.location || 'The ANTs Activity'}.`,
                          locationTag: activeActivity.location || 'Event Venue',
                          shotLabel: res.shotLabel,
                          artworkTheme: activeActivity.artworkTheme,
                        }));
                        updateActive({
                          gallery: [...activeActivity.gallery, ...newPhotos],
                        });
                      }}
                    />

                    <div className="space-y-3">
                      {activeActivity.gallery.map((photo, idx) => (
                        <div
                          key={photo.id}
                          className="rounded-lg border border-border bg-surface-inset/40 p-3.5 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={photo.imageSrc}
                                alt=""
                                className="h-12 w-20 shrink-0 rounded-md border border-border object-cover bg-surface-card"
                              />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-foreground">
                                  {photo.shotLabel || `Photo ${idx + 1}`}
                                </p>
                                <div className="flex items-center gap-1.5 font-mono text-[11px] text-foreground-muted">
                                  <span className="truncate">{photo.locationTag}</span>
                                  {photo.imageSrc.startsWith('data:image/') && (
                                    <span className="rounded bg-primary-tint px-1.5 py-0.2 font-semibold text-on-primary-tint">
                                      Uploaded
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CmsImageDropzone
                                compact
                                buttonLabel="Replace"
                                onUpload={([res]) => {
                                  if (!res) return;
                                  updateActive({
                                    gallery: activeActivity.gallery.map((g, i) =>
                                      i === idx
                                        ? {
                                            ...g,
                                            imageSrc: res.dataUrl,
                                            imageAlt: `${activeActivity.title} — ${res.shotLabel}`,
                                            shotLabel: g.shotLabel || res.shotLabel,
                                          }
                                        : g
                                    ),
                                  });
                                }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateActive({
                                    gallery: activeActivity.gallery.filter(
                                      (_, i) => i !== idx
                                    ),
                                  })
                                }
                                aria-label={`Remove gallery photo ${idx + 1}`}
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border bg-surface-card text-foreground-muted hover:border-danger-border hover:bg-danger-tint hover:text-on-danger-tint"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <Input
                              value={photo.shotLabel}
                              onChange={(e) =>
                                updateActive({
                                  gallery: activeActivity.gallery.map((g, i) =>
                                    i === idx
                                      ? { ...g, shotLabel: e.target.value }
                                      : g
                                  ),
                                })
                              }
                              placeholder="Shot label"
                              className="h-9 text-xs"
                            />
                            <Input
                              value={photo.locationTag}
                              onChange={(e) =>
                                updateActive({
                                  gallery: activeActivity.gallery.map((g, i) =>
                                    i === idx
                                      ? { ...g, locationTag: e.target.value }
                                      : g
                                  ),
                                })
                              }
                              placeholder="Location tag"
                              className="h-9 text-xs"
                            />
                          </div>

                          <Input
                            value={photo.caption}
                            onChange={(e) =>
                              updateActive({
                                gallery: activeActivity.gallery.map((g, i) =>
                                  i === idx
                                    ? { ...g, caption: e.target.value }
                                    : g
                                ),
                              })
                            }
                            placeholder="Caption"
                            className="h-9 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
