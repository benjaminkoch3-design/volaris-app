// app/layout.tsx
import type { Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '../components/providers/ThemeProvider';

export const metadata = {
  title: 'Volaris - Running Performance',
  description: "Application de suivi et de création de plans d'entraînement",
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192x192.jpeg',
    apple: '/icon-512x512.jpeg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Volaris',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f4' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0a09' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased transition-colors duration-200">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}