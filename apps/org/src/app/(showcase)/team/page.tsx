import type { Metadata } from 'next';
import React from 'react';
import { OrgTeamShowcaseView } from '../../../components/team/views/OrgTeamShowcaseView';

export const metadata: Metadata = {
  title: 'Team, Founders & Tutors | The ANTs',
  description:
    'Browse The ANTs Founders, verified IGCSE & IAL tutors, weekly Sun–Sat teaching availability grids, and Telegram inquiry QR links.',
};

export default function OrgTeamPage() {
  return <OrgTeamShowcaseView />;
}

