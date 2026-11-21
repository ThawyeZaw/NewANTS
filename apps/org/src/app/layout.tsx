import type { Metadata } from 'next';
import { OrgRouteProgressView } from '../components/layout/views/OrgRouteProgressView';
import './globals.css';

export const metadata: Metadata = {
  title: 'The ANTs | IGCSE & IAL Study Tools, Tutors & Organization Showcase',
  description:
    'The ANTs organization showcase, IGCSE and IAL Grade Calculator, Study Tracker, and Flow weekly planner.',
};

/**
 * Applies synced Stitch light/dark preference (`ants_theme` cookie / `ants-theme` localStorage) before hydration.
 * Strictly defaults to Light (`'light'`) unless `'dark'` was explicitly saved on any `.the-ants.org` / localhost origin.
 */
const ORG_THEME_BOOTSTRAP_SCRIPT = `(function(){try{var c=document.cookie.match(/(?:^|;\\s*)ants_theme=(dark|light)/);var l=localStorage.getItem('ants-theme');var m=(c&&c[1])||(l==='dark'||l==='light'?l:'light');if(l!==m)localStorage.setItem('ants-theme',m);if(!c||c[1]!==m){var h=location.hostname;var d=(h==='the-ants.org'||h.slice(-13)==='.the-ants.org')?'; Domain=.the-ants.org':'';document.cookie='ants_theme='+m+'; Path=/; Max-Age=31536000; SameSite=Lax'+d;}var r=document.documentElement;r.setAttribute('data-theme',m);if(m==='dark'){r.classList.add('dark');}else{r.classList.remove('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ORG_THEME_BOOTSTRAP_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <OrgRouteProgressView />
        {children}
      </body>
    </html>
  );
}

