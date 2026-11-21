import type { Metadata } from 'next';
import React from 'react';
import { OrgArticlesView } from '../../../components/articles/views/OrgArticlesView';

export const metadata: Metadata = {
  title: 'Articles, Guides & Notes | The ANTs',
  description:
    'Study guides, UMS boundary breakdowns, and academic planning essays by The ANTs.',
};

export default function OrgArticlesPage() {
  return <OrgArticlesView />;
}

