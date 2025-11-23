import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MakeMyTrip - Social Cart 2.0',
  description: 'Plan group trips with friends - collaborative booking made easy',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
