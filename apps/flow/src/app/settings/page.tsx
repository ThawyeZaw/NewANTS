import type { Metadata } from 'next';
import { FlowSettingsPageView } from '../../components/account/views/FlowSettingsPageView';

export const metadata: Metadata = {
  title: 'Account & Profile Settings · Flow — The ANTs Productivity Studio',
  description:
    'Manage your shared ANTs academic identity, portfolio highlights, Sun–Sat tutor availability slot-painter, visibility controls, and @TheANTsFlowBot Telegram linking.',
};

export default function SettingsPage() {
  return <FlowSettingsPageView />;
}

