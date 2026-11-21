import type { Metadata } from 'next';
import { TaskPlannerView } from '../../components/tasks/views/TaskPlannerView';

export const metadata: Metadata = {
  title: 'Task Planner · Flow — The ANTs Productivity Studio',
  description:
    'TickTick-style P1–P4 priority task cards, subtasks checklist, tag filters, rapid quick-add bar, and Today Focus panel synced with Flow Timetable & Pomodoro.',
};

export default function TasksPage() {
  return <TaskPlannerView />;
}

