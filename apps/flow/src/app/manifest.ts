import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Flow — Productivity & Pomodoro Studio by The ANTs',
    short_name: 'Flow',
    description:
      'Distraction-free Pomodoro focus timer with task list integration, configurable interval sounds, offline PWA support, and daily/weekly analytics.',
    start_url: '/pomodoro',
    scope: '/',
    display: 'standalone',
    background_color: '#0b0c0e',
    theme_color: '#d97706',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}

