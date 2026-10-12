// app/layout.tsx
import type { Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '../components/providers/ThemeProvider'; // Ajuste le chemin selon ton dossier components

export const metadata = {
  title: 'Volaris - Running Performance',
  description: 'Application de suivi et de création de plans d\'entraînement',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192x192.jpeg',
    apple: '/icon-512x512.jpeg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Volaris',
  },
};

export const viewport: Viewport = {
  themeColor: '#1c1917',
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
      <body>
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