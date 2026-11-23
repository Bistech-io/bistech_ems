import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { AuthProvider } from '@/providers/auth-provider';
import { MockProvider } from '@/providers/mock-provider';
import { MotionProvider } from '@/providers/motion-provider';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'BisTech EMS',
  description: 'BisTech Employee Management System',
  icons: {
    icon: '/bistech-logo.png',
    shortcut: '/bistech-logo.png',
    apple: '/bistech-logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${inter.variable} dark h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full bg-[#0B0F0E] font-sans text-[#F0F5F2]"
      >
        <ThemeProvider>
          <MockProvider>
            <QueryProvider>
              <MotionProvider>
                <AuthProvider>{children}</AuthProvider>
              </MotionProvider>
            </QueryProvider>
          </MockProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
