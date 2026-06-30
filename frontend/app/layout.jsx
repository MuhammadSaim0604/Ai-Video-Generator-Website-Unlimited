import './globals.css';
import AuthProvider from '../components/AuthProvider';

export const metadata = {
  title: {
    default: 'veo3free.fun — Unlimited Video Generations Free',
    template: '%s | veo3free.fun',
  },
  description:
    'Generate unlimited AI videos and images completely free. veo3free.fun — create stunning AI videos with no limits. Powered by VEO 3 Free Unlimited, the most advanced AI video generation models. No credit card required.',
  keywords: [
    'VEO 3 Free Unlimited',
    'unlimited video generations',
    'free AI video generator',
    'free AI image generator',
    'AI video generator free',
    'generate AI videos free',
    'VEO 3 free',
    'veo3free',
    'unlimited AI generation',
    'AI image generator online free',
    'free video generation',
    'unlimited video generator',
    'AI video creator free',
  ],
  authors: [{ name: 'veo3free.fun' }],
  metadataBase: new URL('https://veo3free.fun'),
  openGraph: {
    title: 'veo3free.fun — Unlimited Video Generations Free',
    description: 'Create unlimited AI videos and images for free. No credit card required. Powered by VEO 3 Free Unlimited.',
    type: 'website',
    locale: 'en_US',
    url: 'https://veo3free.fun',
    siteName: 'veo3free.fun',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'veo3free.fun — Unlimited Video Generations',
    description: 'Generate unlimited AI videos and images for free. VEO 3 Free Unlimited.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://veo3free.fun' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
