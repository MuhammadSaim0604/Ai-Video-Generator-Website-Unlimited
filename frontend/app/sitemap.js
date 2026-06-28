export default function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://veo3free.app';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/studio`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/gallery`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
  ];
}
