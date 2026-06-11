import type { Metadata } from 'next';
import { Nunito, Inter } from 'next/font/google';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-nunito',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Spark — KS3 & KS4 Mock Test Platform',
  description: 'Gamified mock test platform for UK secondary school students. Earn XP, maintain streaks, and master your subjects!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-space-navy text-soft-white font-inter">
        {children}
      </body>
    </html>
  );
}
