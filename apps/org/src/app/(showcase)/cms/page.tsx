import type { Metadata } from 'next';
import React from 'react';
import { OrgCmsStudioView } from '../../../components/cms/views/OrgCmsStudioView';

export const metadata: Metadata = {
  title: 'Content Studio (CMS) | The ANTs',
  description:
    'Manage Home landing copy, Team & Tutors schedules, Activities galleries, and Articles across the-ants.org.',
};

export default function OrgCmsPage() {
  return <OrgCmsStudioView />;
}

