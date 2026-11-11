import React from 'react';
import { GradeCalculatorView } from '@ants/calculator';
import { OrgFooterView } from '../../../components/layout/views/OrgFooterView';
import { OrgNavbarView } from '../../../components/layout/views/OrgNavbarView';

export default function OrgGradeCalculatorPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <OrgNavbarView activePath="/calculator" />
      <div className="flex-1">
        <GradeCalculatorView hostApp="org" hideHeader />
      </div>
      <OrgFooterView />
    </div>
  );
}
