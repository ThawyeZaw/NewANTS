import type { Metadata } from 'next';
import React from 'react';
import { OrgArticleReaderView } from '../../../../components/articles/views/OrgArticleReaderView';
import { findArticleBySlug } from '../../../../lib/showcase';
import { MOCK_ORG_ARTICLES } from '../../../../mocks/showcase-content.mock';

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
  return <OrgArticleReaderView slug={slug} />;
}

