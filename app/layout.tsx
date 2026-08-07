// app/layout.tsx
import './globals.css';

export const metadata = {
  title: 'Volaris - Running Performance',
  description: 'Application de suivi et de création de plans d\'entraînement',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192x192.jpeg',
    apple: '/icon-512x512.jpeg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  );
}