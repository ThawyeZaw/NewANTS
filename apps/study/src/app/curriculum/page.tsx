import React from 'react';
import type { Metadata } from 'next';
import { StudyCurriculumContainer } from '../../components/curriculum/containers/StudyCurriculumContainer';

export const metadata: Metadata = {
  title: 'Curriculum Catalog & Edexcel Modular Maths Suite | Study by The ANTs',
  description:
    'Browse Pearson Edexcel IAL, Cambridge IGCSE, Cambridge International A-Level, and Edexcel International GCSE specifications with interactive WMA11-SET 14-unit cash-in validation.',
};

export default function StudyCurriculumPage() {
  return <StudyCurriculumContainer />;
}

