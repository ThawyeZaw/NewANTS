import type { Metadata } from 'next';
import React from 'react';
import { OrgActivitiesView } from '../../../components/activities/views/OrgActivitiesView';

export const metadata: Metadata = {
  title: 'Community Activities & Galleries | The ANTs',
  description:
    "Explore peer tutoring cohorts, Student's Meets, Exam Venue Visits, and student hackathons hosted by The ANTs.",
};

export default function OrgActivitiesPage() {
  return <OrgActivitiesView />;
}

