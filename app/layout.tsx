import React from 'react';
import './globals.css';
import { APP_NAME } from '../lib/ui-strings';

export const metadata = { title: `${APP_NAME} · Chat`, description: `${APP_NAME} diagnostic chat` };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="app antialiased">{children}</body>
    </html>
  );
}
