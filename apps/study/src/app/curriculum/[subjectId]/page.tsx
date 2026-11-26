import React from 'react';
import type { Metadata } from 'next';
import { StudyTopicTrackerContainer } from '../../../components/curriculum/containers/StudyTopicTrackerContainer';
import { ALL_STUDY_STATIC_SUBJECT_IDS } from '../../../lib/study-api';

export function generateStaticParams() {
  return ALL_STUDY_STATIC_SUBJECT_IDS.map((subjectId) => ({ subjectId }));
}

export const metadata: Metadata = {
  title: 'Syllabus Topic Tracker & Mastery Checklist | Study by The ANTs',
  description:
    'Interactive IGCSE and IAL syllabus topic accordion, subtopic checklists, Kanji-style mastery matrix, examiner formulas, and personal topic notes.',
};

interface StudySubjectTopicTrackerPageProps {
  params: Promise<{
    subjectId: string;
  }>;
}

export default async function StudySubjectTopicTrackerPage({
  params,
}: StudySubjectTopicTrackerPageProps) {
  const { subjectId } = await params;
  return <StudyTopicTrackerContainer initialSubjectId={subjectId} />;
}

