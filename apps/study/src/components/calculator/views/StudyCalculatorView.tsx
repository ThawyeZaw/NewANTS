'use client';

import React, { useEffect, useState } from 'react';
import { GradeCalculatorView } from '@ants/calculator';
import {
  loadStudyDashboardState,
  saveStudyDashboardState,
  setSidebarCollapsed,
  type StudyDashboardPersistedState,
} from '../../../lib/study/dashboard';
import { createDefaultStudyDashboardState } from '../../../mocks/study-dashboard.mock';
import { StudyShellView } from '../../layout/views/StudyShellView';

export function StudyCalculatorView() {
  const [state, setState] = useState<StudyDashboardPersistedState>(
    createDefaultStudyDashboardState
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadStudyDashboardState(createDefaultStudyDashboardState()));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveStudyDashboardState(state);
  }, [hydrated, state]);

  return (
    <StudyShellView
      activeRoute="calculator"
      wrapWithMain={false}
      sidebarCollapsed={state.sidebarCollapsed}
      onToggleSidebarCollapse={() =>
        setState((prev) => setSidebarCollapsed(prev, !prev.sidebarCollapsed))
      }
    >
      <GradeCalculatorView hostApp="study" hideHeader />
    </StudyShellView>
  );
}
