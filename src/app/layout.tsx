import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { AuthModal } from '@/components/Auth/AuthModal';
import { CreditTopUpModal } from '@/components/Credits/CreditTopUpModal';

export const metadata: Metadata = {
  title: 'CareerBot AI — Stop Applying Blindly. Find Jobs You’re Actually Qualified For.',
  description: 'CareerBot matches your CV to live opportunities, tells you why you’re a fit, and helps you build a stronger application. Search jobs instantly.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('careerbot_theme');
                  var theme = (stored === 'light' || stored === 'dark')
                    ? stored
                    : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
                  var root = document.documentElement;
                  root.setAttribute('data-theme', theme);
                  if (theme === 'light') {
                    root.classList.remove('dark');
                    root.classList.add('light');
                    root.style.colorScheme = 'light';
                  } else {
                    root.classList.remove('light');
                    root.classList.add('dark');
                    root.style.colorScheme = 'dark';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
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
