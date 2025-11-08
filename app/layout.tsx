export const metadata = {
  title: 'Woven Web App',
  description: 'Poetic Brain Test Shell',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 16 }}>
        {children}
      </body>
    </html>
  );
}

