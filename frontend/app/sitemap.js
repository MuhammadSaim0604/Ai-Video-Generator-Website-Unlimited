export default function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://veo3free.fun';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/studio`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/sign-up`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/sign-in`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];
}
