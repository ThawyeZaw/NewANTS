import React from 'react';
import type { Metadata } from 'next';
import { StudyTopicTrackerView } from '../../../components/curriculum/views/StudyTopicTrackerView';
import { MOCK_CURRICULUM_SUBJECTS } from '../../../mocks/study-curriculum.mock';

export function generateStaticParams() {
  return MOCK_CURRICULUM_SUBJECTS.map((subject) => ({ subjectId: subject.id }));
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
  return <StudyTopicTrackerView initialSubjectId={subjectId} />;
}

