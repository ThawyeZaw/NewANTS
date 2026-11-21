import type { Metadata } from 'next';
import { SmartTimetableView } from '../../components/timetable/views/SmartTimetableView';

export const metadata: Metadata = {
  title: 'Smart Timetable · Flow — The ANTs Productivity Studio',
  description:
    '24-hour interactive time-blocking calendar with P1–P4 task priorities, 15-minute buffers, Telegram Worker reminders, and Pomodoro handoff.',
};

export default function TimetablePage() {
  return <SmartTimetableView />;
}
