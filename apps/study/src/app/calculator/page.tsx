import React from 'react';
import type { Metadata } from 'next';
import { StudyCalculatorContainer } from '../../components/calculator/containers/StudyCalculatorContainer';

export const metadata: Metadata = {
  title: 'Grade Calculator | Study by The ANTs',
  description:
    'Interactive Cambridge IGCSE, AS & A-Level, and Pearson Edexcel IAL raw mark to UMS and grade boundary calculator.',
};

export default function StudyCalculatorPage() {
  return <StudyCalculatorContainer />;
}
