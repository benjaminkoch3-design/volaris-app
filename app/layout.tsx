// app/layout.tsx
import './globals.css';

export const metadata = {
  title: 'Running Performance',
  description: 'Application de suivi et de création de plans d\'entraînement',
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