import React from 'react';
import type { Metadata } from 'next';
import { StudyPastPapersContainer } from '../../components/papers/containers/StudyPastPapersContainer';

export const metadata: Metadata = {
  title: 'Past Paper Matrix & Score Tracker | Study by The ANTs',
  description:
    'Excel-style Variant × Exam Series past paper matrix with instant raw mark to UMS, PUM, and grade boundary derivation across Edexcel and Cambridge specifications.',
};

export default function StudyPastPapersPage() {
  return <StudyPastPapersContainer />;
}

