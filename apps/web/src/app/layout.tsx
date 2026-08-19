import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'XYTEEE — Connect, Chat, Share',
  description: 'XYTEEE is a modern social media platform. Connect with friends, share posts, stories, and more.',
  openGraph: { title: 'XYTEEE', description: 'Connect, Chat, Share', siteName: 'XYTEEE', type: 'website' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
