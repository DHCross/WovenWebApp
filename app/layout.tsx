import React from 'react';
import './globals.css';
import { APP_NAME } from '../lib/ui-strings';

export const metadata = { title: `${APP_NAME} · Chat`, description: `${APP_NAME} diagnostic chat` };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Fallback compiled Tailwind for legacy/quick restore */}
        <link rel="stylesheet" href="/dist/output.css" />
      </head>
      <body suppressHydrationWarning className="app antialiased">{children}</body>
    </html>
  );
}
