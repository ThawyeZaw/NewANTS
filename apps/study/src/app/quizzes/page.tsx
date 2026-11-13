import React from 'react';
import type { Metadata } from 'next';
import { StudyQuizzesView } from '../../components/learning/views/StudyQuizzesView';

export const metadata: Metadata = {
  title: 'Topical Quizzes & Mark-Scheme Drills | Study by The ANTs',
  description:
    'Timed and untimed IGCSE and IAL topical quizzes with MCQ and numeric/formula short-answer grading, instant explanations, and mistake retries.',
};

export default function StudyQuizzesPage() {
  return <StudyQuizzesView />;
}

