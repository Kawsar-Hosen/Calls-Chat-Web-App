import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'XYTEEE — Connect, Chat, Share | Social Media App',
  description: 'XYTEEE is a modern social media platform. Chat, call, post, share stories, and connect with friends — all in one beautiful app. Free voice & video calls, real-time messaging, and social feed.',
  keywords: ['XYTEEE', 'social media', 'chat app', 'video call', 'messaging', 'social network', 'stories', 'free calls'],
  openGraph: {
    title: 'XYTEEE — Connect, Chat, Share',
    description: 'Modern social media platform with chat, calls, stories, and more. Free to use.',
    siteName: 'XYTEEE',
    type: 'website',
    url: 'https://xyteee.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XYTEEE — Connect, Chat, Share',
    description: 'Modern social media platform with chat, calls, stories, and more.',
  },
  robots: 'index, follow',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/app-icon.png" />
        <link rel="apple-touch-icon" href="/app-icon.png" />
        <meta name="theme-color" content="#1F66FF" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'XYTEEE',
              applicationCategory: 'SocialNetworkingApplication',
              operatingSystem: 'Android',
              url: 'https://xyteee.com',
              description: 'XYTEEE — Chat, call, post, share stories, and connect with friends.',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              privacyPolicy: 'https://xyteee.com/policy',
              termsOfService: 'https://xyteee.com/terms',
            }),
          }}
        />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
