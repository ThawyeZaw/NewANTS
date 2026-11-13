'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Link2,
} from 'lucide-react';
import { Button, ScrollReveal } from '@ants/ui';
import { loadOrgCmsState, subscribeOrgCmsChanges } from '../../../lib/cms';
import { extractArticleToc, findArticleBySlug } from '../../../lib/showcase';
import {
  MOCK_ORG_ARTICLES,
  type OrgArticleMock,
} from '../../../mocks/showcase-content.mock';
import { OrgFooterView } from '../../layout/views/OrgFooterView';
import { OrgNavbarView } from '../../layout/views/OrgNavbarView';

export interface OrgArticleReaderViewProps {
  /** URL slug from `/articles/[slug]` */
  slug: string;
  /** Optional explicit articles dataset */
  articles?: OrgArticleMock[];
  /** Use local dev ports in shared Navbar & Footer */
  useLocalUrls?: boolean;
}

/**
 * `/articles/[slug]` Dedicated Typographic Reader View (`[ZYY-2.4]`).
 * Pairs a `68ch` reading measure with a sticky desktop Table of Contents.
 */
export function OrgArticleReaderView({
  slug,
  articles: articlesProp,
  useLocalUrls = true,
}: OrgArticleReaderViewProps) {
  const [cmsArticles, setCmsArticles] = useState<OrgArticleMock[] | null>(null);

  useEffect(() => {
    if (articlesProp !== undefined) return;
    const sync = () => setCmsArticles(loadOrgCmsState().articles);
    sync();
    return subscribeOrgCmsChanges(sync);
  }, [articlesProp]);

  const articles = articlesProp ?? cmsArticles ?? MOCK_ORG_ARTICLES;
  const article = useMemo(
    () => findArticleBySlug(articles, slug),
    [articles, slug]
  );

  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!copiedLink) return;
    const timer = window.setTimeout(() => setCopiedLink(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copiedLink]);

  const tocEntries = useMemo(
    () => (article ? extractArticleToc(article) : []),
    [article]
  );

  const relatedArticles = useMemo(() => {
    if (!article) return articles.slice(0, 2);
    return articles.filter((a) => a.slug !== article.slug).slice(0, 2);
  }, [articles, article]);

  const handleCopyUrl = async () => {
    const shareUrl =
      typeof window !== 'undefined'
        ? window.location.href
        : `https://the-ants.org/articles/${slug}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback gracefully when clipboard permission is unavailable
    }
    setCopiedLink(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <OrgNavbarView
        activePath={article ? `/articles/${article.slug}` : '/articles'}
        useLocalUrls={useLocalUrls}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        {!article ? (
          <div className="mx-auto max-w-xl rounded-xl border border-border bg-surface-card p-8 space-y-4">
            <h1 className="text-xl font-bold text-foreground">
              Article not found
            </h1>
            <p className="text-sm text-foreground-muted leading-relaxed">
              No guide or note matches{' '}
              <span className="font-mono text-foreground">{slug}</span>. Return to
              the articles index to browse published study guides.
            </p>
            <Link
              href="/articles"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-solid px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary-solid-hover"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>All Articles</span>
            </Link>
          </div>
        ) : (
          <article className="space-y-10">
            {/* Top Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/articles"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>All Articles</span>
              </Link>

              <Button
                variant="secondary"
                size="sm"
                leftIcon={
                  copiedLink ? (
                    <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                  )
                }
                onClick={handleCopyUrl}
              >
                {copiedLink ? 'Article Link Copied' : 'Copy Link'}
              </Button>
            </div>

            {/* Typographic Masthead — Heading First, Zero Kicker */}
            <header className="ants-hero-enter max-w-3xl space-y-5 border-b border-border pb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                {article.title}
              </h1>

              <p
                style={{ '--stagger-index': 1 } as React.CSSProperties}
                className="ants-stagger-item text-base sm:text-lg text-foreground-muted leading-relaxed"
              >
                {article.subtitle}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pt-2 text-xs text-foreground-muted">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-primary-solid">
                    {article.category}
                  </span>
                  <span>·</span>
                  <span>{article.publishedLabel}</span>
                  <span>·</span>
                  <span className="tabular-nums">{article.readMinutes} min read</span>
                  <span>·</span>
                  <Link
                    href={`/team/${article.authorUsername}`}
                    className="font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    {article.authorName}
                  </Link>
                  <span className="text-foreground-subtle">({article.authorRole})</span>
                </div>

                <span className="text-foreground-subtle">
                  {article.tags.join(' · ')}
                </span>
              </div>
            </header>

            {/* Two-Column Typographic Body + Sticky Table of Contents */}
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
              {/* Primary 68ch Reading Column */}
              <div className="ants-main-enter space-y-10 max-w-[68ch]">
                {article.sections.map((section, secIdx) => (
                  <section
                    key={section.id}
                    id={section.id}
                    style={{ '--stagger-index': Math.min(secIdx + 1, 5) } as React.CSSProperties}
                    className="ants-stagger-item scroll-mt-24 space-y-4"
                  >
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                      {section.heading}
                    </h2>

                    <div className="space-y-4 text-base leading-[1.72] text-foreground-muted">
                      {section.paragraphs.map((p, idx) => (
                        <p key={idx}>{p}</p>
                      ))}
                    </div>

                    {section.codeSnippet && (
                      <pre className="overflow-x-auto rounded-lg border border-border bg-surface-inset p-4 font-mono text-xs sm:text-sm text-foreground">
                        <code>{section.codeSnippet}</code>
                      </pre>
                    )}

                    {section.callout && (
                      <div className="rounded-lg border border-primary-tint-border bg-primary-tint/50 p-4 space-y-1.5">
                        <p className="text-xs font-bold text-on-primary-tint">
                          {section.callout.title}
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">
                          {section.callout.body}
                        </p>
                      </div>
                    )}

                    {section.checklist && section.checklist.length > 0 && (
                      <ul className="space-y-2.5 border-y border-border-subtle py-4 text-sm text-foreground">
                        {section.checklist.map((item) => (
                          <li key={item} className="flex items-start gap-2.5">
                            <CheckCircle2
                              className="mt-0.5 h-4 w-4 shrink-0 text-success"
                              aria-hidden="true"
                            />
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>

              {/* Sticky Desktop Table of Contents */}
              <aside className="lg:sticky lg:top-24 space-y-6">
                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-xs font-bold text-foreground">
                    In This Article
                  </p>
                  <nav aria-label="Table of contents" className="space-y-2.5">
                    {tocEntries.map((entry) => (
                      <a
                        key={entry.id}
                        href={`#${entry.id}`}
                        className="block text-xs text-foreground-muted transition-colors hover:text-primary-solid leading-snug"
                      >
                        {entry.heading}
                      </a>
                    ))}
                  </nav>
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <p className="text-xs font-bold text-foreground">
                    Try the Grade Calculator
                  </p>
                  <p className="text-xs text-foreground-muted leading-relaxed">
                    Convert Edexcel raw marks to UMS or inspect Cambridge boundaries without signing in.
                  </p>
                  <Link
                    href="/calculator"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-solid hover:underline"
                  >
                    <span>Open Calculator</span>
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
              </aside>
            </div>

            {/* Continue Reading Hairline Strip */}
            {relatedArticles.length > 0 && (
              <ScrollReveal as="section" className="space-y-5 border-t border-border pt-8">
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  More Guides
                </h2>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                  {relatedArticles.map((rel) => (
                    <Link
                      key={rel.id}
                      href={`/articles/${rel.slug}`}
                      className="group flex flex-col justify-between gap-2 border-t border-border-subtle pt-4"
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-primary-solid">
                          {rel.category} · {rel.readMinutes} min read
                        </span>
                        <p className="text-sm font-bold text-foreground group-hover:text-primary-solid transition-colors">
                          {rel.title}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground-muted group-hover:text-primary-solid">
                        <span>Read guide</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </Link>
                  ))}
                </div>
              </ScrollReveal>
            )}
          </article>
        )}
      </main>

      <OrgFooterView useLocalUrls={useLocalUrls} />
    </div>
  );
}
