export default function robots() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://veo3free.fun';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/admin-api/', '/api/'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
