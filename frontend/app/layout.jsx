import './globals.css';

export const metadata = {
  title: {
    default: 'VEO 3 Free Unlimited — Generate AI Videos & Images Free',
    template: '%s | VEO 3 Free Unlimited',
  },
  description:
    'Generate unlimited AI videos and images for free. VEO 3 Free Unlimited — create stunning AI videos with no limits, no login required. Powered by the latest AI video generation models.',
  keywords: [
    'VEO 3 Free Unlimited',
    'free AI video generator',
    'free AI image generator',
    'AI video generator no login',
    'generate AI videos free',
    'VEO 3 free',
    'unlimited AI generation',
    'AI image generator online free',
  ],
  authors: [{ name: 'VEO3 Free' }],
  openGraph: {
    title: 'VEO 3 Free Unlimited — Generate AI Videos & Images Free',
    description: 'Create unlimited AI videos and images for free. No login required.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VEO 3 Free Unlimited',
    description: 'Generate unlimited AI videos and images for free.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}
