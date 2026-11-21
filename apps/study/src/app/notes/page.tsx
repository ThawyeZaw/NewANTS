import React from 'react';
import type { Metadata } from 'next';
import { StudyNotesView } from '../../components/learning/views/StudyNotesView';

export const metadata: Metadata = {
  title: 'Study Notes & Playbooks | Study by The ANTs',
  description:
    'Curated Edexcel IAL and Cambridge IGCSE syllabus Markdown notes with formula blocks, examiner tips, and interactive revision checklists.',
};

export default function StudyNotesPage() {
  return <StudyNotesView />;
}

