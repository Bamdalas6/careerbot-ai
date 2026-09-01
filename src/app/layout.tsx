import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { AuthModal } from '@/components/Auth/AuthModal';
import { CreditTopUpModal } from '@/components/Credits/CreditTopUpModal';

export const metadata: Metadata = {
  title: 'CareerBot AI - AI Job Discovery & Direct Career Links',
  description: 'Search live tech jobs, get direct links to verified company career pages, score match suitability, and generate 1-click tailored application pitches.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <AuthModal />
            <CreditTopUpModal />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
