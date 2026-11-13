import React from 'react';
import type { Metadata } from 'next';
import { StudyFlashcardsView } from '../../components/learning/views/StudyFlashcardsView';

export const metadata: Metadata = {
  title: 'SM-2 Spaced-Repetition Flashcards | Study by The ANTs',
  description:
    'Interactive 3D flip flashcards with SM-2 spaced repetition intervals across Pearson Edexcel IAL and Cambridge IGCSE decks.',
};

export default function StudyFlashcardsPage() {
  return <StudyFlashcardsView />;
}

