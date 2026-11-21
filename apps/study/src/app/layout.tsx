import type { Metadata, Viewport } from 'next';
import { StudyRouteProgressView } from '../components/layout/views/StudyRouteProgressView';
import './globals.css';

export const metadata: Metadata = {
  title: 'Study | IGCSE & IAL Academic Tracker by The ANTs',
  description:
    'Syllabus Topic Tracker, Edexcel Modular Maths Suite, Past Paper Matrix, Exam Countdowns, and Grade Calculator for IGCSE & IAL students.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0c0e' },
  ],
};

/**
 * Applies synced Stitch light/dark preference (`ants_theme` cookie / `ants-theme` localStorage) before hydration.
 * Strictly defaults to Light (`'light'`) unless `'dark'` was explicitly saved on any `.the-ants.org` / localhost origin.
 */
const STUDY_THEME_BOOTSTRAP_SCRIPT = `(function(){try{var c=document.cookie.match(/(?:^|;\\s*)ants_theme=(dark|light)/);var l=localStorage.getItem('ants-theme');var m=(c&&c[1])||(l==='dark'||l==='light'?l:'light');if(l!==m)localStorage.setItem('ants-theme',m);if(!c||c[1]!==m){var h=location.hostname;var d=(h==='the-ants.org'||h.slice(-13)==='.the-ants.org')?'; Domain=.the-ants.org':'';document.cookie='ants_theme='+m+'; Path=/; Max-Age=31536000; SameSite=Lax'+d;}var r=document.documentElement;r.setAttribute('data-theme',m);if(m==='dark'){r.classList.add('dark');}else{r.classList.remove('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: STUDY_THEME_BOOTSTRAP_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <StudyRouteProgressView />
        {children}
      </body>
    </html>
  );
}

