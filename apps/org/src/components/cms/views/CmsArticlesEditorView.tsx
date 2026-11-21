'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Copy,
  FileText,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Button,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from '@ants/ui';
import {
  createBlankArticle,
  ensureUniqueSlug,
  estimateArticleReadMinutes,
  slugifyCmsText,
} from '../../../lib/cms';
import type {
  OrgArticleCategory,
  OrgArticleMock,
  OrgArticleSectionMock,
  OrgArtworkTheme,
} from '../../../mocks/showcase-content.mock';
import type { OrgTeamMemberMock } from '../../../mocks/showcase-team.mock';
import {
  CmsFieldLabel,
  CmsSelect,
  CmsStringListEditor,
  CmsTagListEditor,
  CmsTextarea,
} from './CmsFieldPrimitives';

export interface CmsArticlesEditorViewProps {
  articles: OrgArticleMock[];
  team: OrgTeamMemberMock[];
  onUpsert: (article: OrgArticleMock) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
}

const ARTICLE_CATEGORY_OPTIONS: Array<{
  value: OrgArticleCategory;
  label: string;
}> = [
  { value: 'Study Guide', label: 'Study Guide' },
  { value: 'Exam Strategy', label: 'Exam Strategy' },
  { value: 'Productivity', label: 'Productivity' },
  { value: 'Announcement', label: 'Announcement' },
];

const ARTICLE_ARTWORK_OPTIONS: Array<{
  value: OrgArtworkTheme;
  label: string;
}> = [
  { value: 'article-ums', label: 'UMS Curve Diagram' },
  { value: 'article-focus', label: '24h Focus Chronograph' },
  { value: 'article-maths', label: 'Parabola & Discriminant' },
  { value: 'tutoring', label: 'Practical Lab Error Plot' },
  { value: 'hackathon', label: 'Open Ecosystem Topology' },
];

export function CmsArticlesEditorView({
  articles,
  team,
  onUpsert,
  onDelete,
  onMove,
}: CmsArticlesEditorViewProps) {
  const [selectedId, setSelectedId] = useState<string>(articles[0]?.id ?? '');
  const [searchQuery, setSearchQuery] = useState('');
  const [subTab, setSubTab] = useState('metadata');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) =>
      [a.title, a.slug, a.category, a.authorName, ...a.tags]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [articles, searchQuery]);

  const activeArticle = useMemo(
    () => articles.find((a) => a.id === selectedId) ?? articles[0] ?? null,
    [articles, selectedId]
  );

  const handleCreate = () => {
    const created = createBlankArticle(
      articles.map((a) => a.slug),
      team[0]
    );
    onUpsert(created);
    setSelectedId(created.id);
    setSubTab('metadata');
    setConfirmDeleteId(null);
  };

  const handleDuplicate = (article: OrgArticleMock) => {
    const slug = ensureUniqueSlug(
      `${article.slug}-copy`,
      articles.map((a) => a.slug)
    );
    const copy: OrgArticleMock = {
      ...JSON.parse(JSON.stringify(article)),
      id: `art_${Date.now().toString(36)}`,
      slug,
      title: `${article.title} (Copy)`,
    };
    onUpsert(copy);
    setSelectedId(copy.id);
    setConfirmDeleteId(null);
  };

  const updateActive = (patch: Partial<OrgArticleMock>) => {
    if (!activeArticle) return;
    onUpsert({ ...activeArticle, ...patch });
  };

  const updateSection = (
    idx: number,
    patch: Partial<OrgArticleSectionMock>
  ) => {
    if (!activeArticle) return;
    updateActive({
      sections: activeArticle.sections.map((sec, i) =>
        i === idx ? { ...sec, ...patch } : sec
      ),
    });
  };

  const moveSection = (idx: number, dir: 'up' | 'down') => {
    if (!activeArticle) return;
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= activeArticle.sections.length) return;
    const next = [...activeArticle.sections];
    const [moved] = next.splice(idx, 1);
    if (moved) next.splice(target, 0, moved);
    updateActive({ sections: next });
  };

  const addSection = () => {
    if (!activeArticle) return;
    const index = activeArticle.sections.length + 1;
    updateActive({
      sections: [
        ...activeArticle.sections,
        {
          id: `section-${index}`,
          heading: `New Section ${index}`,
          paragraphs: ['Write section commentary here.'],
        },
      ],
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Articles &amp; Study Guides
          </h2>
          <p className="text-xs text-foreground-muted">
            Author typographic guides, cover formulas, and structured sections
            for <span className="font-mono">/articles</span>.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={handleCreate}
        >
          New Article
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
              placeholder="Search title, tag, author..."
              className="h-9 pl-8 text-xs"
            />
          </div>

          <div className="rounded-xl border border-border bg-surface-card divide-y divide-border overflow-hidden">
            {filteredArticles.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <BookOpen
                  className="mx-auto h-5 w-5 text-foreground-muted"
                  aria-hidden="true"
                />
                <p className="text-xs text-foreground-muted">
                  No articles match your search.
                </p>
              </div>
            ) : (
              filteredArticles.map((art) => {
                const selected = activeArticle?.id === art.id;
                const realIdx = articles.findIndex((a) => a.id === art.id);

                return (
                  <div
                    key={art.id}
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
                        setSelectedId(art.id);
                        setConfirmDeleteId(null);
                      }}
                      className="min-w-0 flex-1 text-left flex items-start gap-2.5"
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                          selected
                            ? 'border-primary-tint-border bg-primary-solid text-on-primary'
                            : 'border-border bg-surface-inset text-foreground-muted'
                        )}
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">
                          {art.title}
                        </p>
                        <p className="truncate font-mono text-[11px] text-foreground-muted">
                          {art.category} · {art.readMinutes}m ·{' '}
                          {art.publishedLabel}
                        </p>
                      </div>
                    </button>

                    {!searchQuery.trim() && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => onMove(art.id, 'up')}
                          disabled={realIdx <= 0}
                          aria-label={`Move ${art.title} up`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground-muted hover:bg-surface-card hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowUp className="h-3 w-3" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMove(art.id, 'down')}
                          disabled={realIdx === articles.length - 1}
                          aria-label={`Move ${art.title} down`}
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
          {!activeArticle ? (
            <div className="rounded-xl border border-border bg-surface-card p-8 text-center space-y-3">
              <p className="text-sm font-semibold text-foreground">
                No articles yet
              </p>
              <Button type="button" variant="primary" size="sm" onClick={handleCreate}>
                Write First Article
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface-card p-5 space-y-5">
              {/* Active Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div className="min-w-0 space-y-1">
                  <h3 className="truncate text-base font-bold text-foreground">
                    {activeArticle.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-foreground-muted">
                      /articles/{activeArticle.slug}
                    </span>
                    <Badge variant="editorial">{activeArticle.category}</Badge>
                    <span className="font-mono text-xs text-foreground-muted">
                      {activeArticle.readMinutes} min read
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/articles/${activeArticle.slug}`}
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
                    onClick={() => handleDuplicate(activeArticle)}
                    className="h-8"
                  >
                    Duplicate
                  </Button>
                  {confirmDeleteId === activeArticle.id ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const remaining = articles.filter(
                          (a) => a.id !== activeArticle.id
                        );
                        onDelete(activeArticle.id);
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
                      onClick={() => setConfirmDeleteId(activeArticle.id)}
                      className="h-8 text-foreground-muted hover:text-on-danger-tint hover:bg-danger-tint"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              <Tabs value={subTab} onValueChange={setSubTab} variant="underline">
                <TabsList>
                  <TabsTrigger value="metadata">Metadata &amp; Cover</TabsTrigger>
                  <TabsTrigger value="sections">
                    Sections ({activeArticle.sections.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="metadata" className="pt-4 space-y-4">
                  <CmsFieldLabel label="Article Title">
                    <Input
                      value={activeArticle.title}
                      onChange={(e) => updateActive({ title: e.target.value })}
                      className="h-9 text-xs font-semibold"
                    />
                  </CmsFieldLabel>

                  <CmsFieldLabel label="Subtitle">
                    <Input
                      value={activeArticle.subtitle}
                      onChange={(e) =>
                        updateActive({ subtitle: e.target.value })
                      }
                      className="h-9 text-xs"
                    />
                  </CmsFieldLabel>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                    <div className="sm:col-span-6">
                      <CmsFieldLabel label="URL Slug">
                        <div className="flex gap-1.5">
                          <Input
                            value={activeArticle.slug}
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
                                  activeArticle.title,
                                  articles.map((a) => a.slug),
                                  activeArticle.slug
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
                    <div className="sm:col-span-3">
                      <CmsFieldLabel label="Category">
                        <CmsSelect
                          value={activeArticle.category}
                          onChange={(val) =>
                            updateActive({
                              category: val as OrgArticleCategory,
                            })
                          }
                          options={ARTICLE_CATEGORY_OPTIONS}
                          className="h-9 text-xs"
                        />
                      </CmsFieldLabel>
                    </div>
                    <div className="sm:col-span-3">
                      <CmsFieldLabel label="Published">
                        <Input
                          value={activeArticle.publishedLabel}
                          onChange={(e) =>
                            updateActive({ publishedLabel: e.target.value })
                          }
                          placeholder="Nov 2026"
                          className="h-9 font-mono text-xs"
                        />
                      </CmsFieldLabel>
                    </div>
                  </div>

                  {/* Author & Read Time */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                    <div className="sm:col-span-5">
                      <CmsFieldLabel label="Link Author from Team">
                        <CmsSelect
                          value={
                            team.some(
                              (m) => m.username === activeArticle.authorUsername
                            )
                              ? activeArticle.authorUsername
                              : '__custom__'
                          }
                          onChange={(val) => {
                            if (val === '__custom__') return;
                            const member = team.find((m) => m.username === val);
                            if (!member) return;
                            updateActive({
                              authorUsername: member.username,
                              authorName: member.name,
                              authorRole: member.roleBadge,
                            });
                          }}
                          options={[
                            ...team.map((m) => ({
                              value: m.username,
                              label: `${m.name} (@${m.username})`,
                            })),
                            { value: '__custom__', label: 'Custom Author' },
                          ]}
                          className="h-9 text-xs"
                        />
                      </CmsFieldLabel>
                    </div>
                    <div className="sm:col-span-4">
                      <CmsFieldLabel label="Author Display Name">
                        <Input
                          value={activeArticle.authorName}
                          onChange={(e) =>
                            updateActive({ authorName: e.target.value })
                          }
                          className="h-9 text-xs"
                        />
                      </CmsFieldLabel>
                    </div>
                    <div className="sm:col-span-3">
                      <CmsFieldLabel label="Read Minutes">
                        <div className="flex gap-1">
                          <Input
                            type="number"
                            min={1}
                            max={60}
                            value={activeArticle.readMinutes}
                            onChange={(e) =>
                              updateActive({
                                readMinutes: Math.max(
                                  1,
                                  Number(e.target.value) || 1
                                ),
                              })
                            }
                            className="h-9 font-mono text-xs"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateActive({
                                readMinutes:
                                  estimateArticleReadMinutes(activeArticle),
                              })
                            }
                            title="Estimate read time from word count"
                            className="h-9 shrink-0 rounded-lg border border-border bg-surface-inset px-2 text-[11px] font-semibold text-foreground-muted hover:text-foreground"
                          >
                            Auto
                          </button>
                        </div>
                      </CmsFieldLabel>
                    </div>
                  </div>

                  <CmsFieldLabel label="Summary">
                    <CmsTextarea
                      rows={2}
                      value={activeArticle.summary}
                      onChange={(val) => updateActive({ summary: val })}
                    />
                  </CmsFieldLabel>

                  <CmsTagListEditor
                    label="Topic Tags"
                    tags={activeArticle.tags}
                    onChange={(next) => updateActive({ tags: next })}
                    placeholder="Add tag (e.g. UMS, WMA11)..."
                  />

                  {/* Typographic Cover Settings */}
                  <div className="rounded-lg border border-border bg-surface-inset/40 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-foreground">
                      Typographic Cover &amp; Technical Diagram
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <CmsFieldLabel label="SVG Diagram Theme">
                        <CmsSelect
                          value={activeArticle.artworkTheme}
                          onChange={(val) =>
                            updateActive({
                              artworkTheme: val as OrgArtworkTheme,
                            })
                          }
                          options={ARTICLE_ARTWORK_OPTIONS}
                          className="h-9 text-xs"
                        />
                      </CmsFieldLabel>
                      <CmsFieldLabel label="Cover Code Stamp">
                        <Input
                          value={activeArticle.coverCode ?? ''}
                          onChange={(e) =>
                            updateActive({
                              coverCode: e.target.value || undefined,
                            })
                          }
                          placeholder="YMA01 · WMA11–14"
                          className="h-9 font-mono text-xs"
                        />
                      </CmsFieldLabel>
                      <CmsFieldLabel label="Cover Formula">
                        <Input
                          value={activeArticle.coverFormula ?? ''}
                          onChange={(e) =>
                            updateActive({
                              coverFormula: e.target.value || undefined,
                            })
                          }
                          placeholder="UMS = 80 + 20 × ΔRaw"
                          className="h-9 font-mono text-xs"
                        />
                      </CmsFieldLabel>
                      <CmsFieldLabel label="Cover Metric Pill">
                        <Input
                          value={activeArticle.coverMetric ?? ''}
                          onChange={(e) =>
                            updateActive({
                              coverMetric: e.target.value || undefined,
                            })
                          }
                          placeholder="480/600 A · 180/200 P3+P4 A*"
                          className="h-9 font-mono text-xs"
                        />
                      </CmsFieldLabel>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="sections" className="pt-4 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-foreground-muted">
                      Sections automatically build the sticky Table of Contents
                      on <span className="font-mono">/articles/{activeArticle.slug}</span>.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                      onClick={addSection}
                    >
                      Add Section
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {activeArticle.sections.map((section, idx) => (
                      <div
                        key={section.id}
                        className="rounded-xl border border-border bg-surface-inset/40 p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
                          <span className="font-mono text-xs font-semibold text-foreground-muted">
                            #{section.id}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveSection(idx, 'up')}
                              disabled={idx === 0}
                              aria-label={`Move section ${idx + 1} up`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-surface-card text-foreground-muted hover:text-foreground disabled:opacity-35"
                            >
                              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSection(idx, 'down')}
                              disabled={idx === activeArticle.sections.length - 1}
                              aria-label={`Move section ${idx + 1} down`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-surface-card text-foreground-muted hover:text-foreground disabled:opacity-35"
                            >
                              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (activeArticle.sections.length <= 1) return;
                                updateActive({
                                  sections: activeArticle.sections.filter(
                                    (_, i) => i !== idx
                                  ),
                                });
                              }}
                              disabled={activeArticle.sections.length <= 1}
                              aria-label={`Delete section ${idx + 1}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-surface-card text-foreground-muted hover:border-danger-border hover:bg-danger-tint hover:text-on-danger-tint disabled:opacity-35"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="sm:col-span-2">
                            <CmsFieldLabel label="Section Heading">
                              <Input
                                value={section.heading}
                                onChange={(e) =>
                                  updateSection(idx, {
                                    heading: e.target.value,
                                  })
                                }
                                className="h-9 text-xs font-semibold"
                              />
                            </CmsFieldLabel>
                          </div>
                          <CmsFieldLabel label="Anchor ID">
                            <Input
                              value={section.id}
                              onChange={(e) =>
                                updateSection(idx, {
                                  id: slugifyCmsText(e.target.value),
                                })
                              }
                              className="h-9 font-mono text-xs"
                            />
                          </CmsFieldLabel>
                        </div>

                        <CmsStringListEditor
                          label="Paragraphs"
                          items={section.paragraphs}
                          onChange={(next) =>
                            updateSection(idx, { paragraphs: next })
                          }
                          multiline
                          placeholder="Add paragraph..."
                        />

                        {/* Optional Callout */}
                        <div className="rounded-lg border border-border bg-surface-card p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              Optional Callout Box
                            </span>
                            {section.callout ? (
                              <button
                                type="button"
                                onClick={() =>
                                  updateSection(idx, { callout: undefined })
                                }
                                className="text-[11px] font-semibold text-foreground-muted hover:text-on-danger-tint"
                              >
                                Remove Callout
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  updateSection(idx, {
                                    callout: {
                                      title: 'Key threshold',
                                      body: 'Highlight an important rule or threshold.',
                                    },
                                  })
                                }
                                className="text-[11px] font-semibold text-primary-solid hover:underline"
                              >
                                + Add Callout
                              </button>
                            )}
                          </div>
                          {section.callout && (
                            <div className="space-y-2">
                              <Input
                                value={section.callout.title}
                                onChange={(e) =>
                                  updateSection(idx, {
                                    callout: {
                                      title: e.target.value,
                                      body: section.callout?.body ?? '',
                                    },
                                  })
                                }
                                placeholder="Callout title"
                                className="h-9 text-xs font-semibold"
                              />
                              <CmsTextarea
                                rows={2}
                                value={section.callout.body}
                                onChange={(val) =>
                                  updateSection(idx, {
                                    callout: {
                                      title: section.callout?.title ?? '',
                                      body: val,
                                    },
                                  })
                                }
                              />
                            </div>
                          )}
                        </div>

                        <CmsFieldLabel
                          label="Optional Formula / Code Snippet"
                          hint="Leave blank to omit"
                        >
                          <CmsTextarea
                            rows={2}
                            mono
                            value={section.codeSnippet ?? ''}
                            onChange={(val) =>
                              updateSection(idx, {
                                codeSnippet: val || undefined,
                              })
                            }
                            placeholder="UMS = UMS_lower + ((Raw - Raw_lower) / ...)"
                          />
                        </CmsFieldLabel>

                        <CmsStringListEditor
                          label="Optional Checklist Items"
                          items={section.checklist ?? []}
                          onChange={(next) =>
                            updateSection(idx, {
                              checklist: next.length > 0 ? next : undefined,
                            })
                          }
                          placeholder="Add checklist bullet..."
                        />
                      </div>
                    ))}
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
