import React from 'react';
import type { Metadata } from 'next';
import { OrgAdminContainer } from '../../components/admin/containers/OrgAdminContainer';

export const metadata: Metadata = {
  title: 'Admin CMS Console · The ANTs',
  description:
    'Role-protected organization CMS for managing The ANTs mission copy, tutors, activities, articles, and platform user roles.',
};

export default function OrgAdminPage() {
  return <OrgAdminContainer />;
}
