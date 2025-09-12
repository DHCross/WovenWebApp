import React from 'react';
import './globals.css';
export const metadata = { title: 'Raven Calder · Chat', description: 'Raven Calder diagnostic chat' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
