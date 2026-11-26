import type { Metadata } from 'next';
import React from 'react';
import { OrgArticleReaderContainer } from '../../../../components/articles/containers/OrgArticleReaderContainer';
import { findArticleBySlug } from '../../../../lib/showcase';
import { MOCK_ORG_ARTICLES } from '../../../../mocks/showcase-content.mock';

export function generateStaticParams() {
  return MOCK_ORG_ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = findArticleBySlug(MOCK_ORG_ARTICLES, slug);
  if (!article) {
    return {
      title: 'Article Reader | The ANTs',
    };
  }
  return {
    title: `${article.title} | The ANTs`,
    description: article.summary,
  };
}

export default async function OrgArticleReaderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <OrgArticleReaderContainer slug={slug} />;
}

