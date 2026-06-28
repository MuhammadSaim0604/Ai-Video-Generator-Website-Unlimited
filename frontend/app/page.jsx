import Link from 'next/link';
import {
  Video, Image, Zap, Infinity, Shield, Star, ChevronRight,
  CheckCircle, Play, Wand2, Globe, Clock
} from 'lucide-react';

export const metadata = {
  title: 'VEO 3 Free Unlimited — Generate AI Videos & Images Free',
  description:
    'Generate unlimited AI videos and images for free. VEO 3 Free Unlimited lets you create stunning AI-powered videos with Veo 3.1 models. No login, no limits, no cost.',
};

const features = [
  { icon: Infinity, title: 'Truly Unlimited', desc: 'Generate as many images and videos as you want. Zero daily limits, zero restrictions.' },
  { icon: Zap, title: 'Instant Queue', desc: 'Smart queue system distributes your job instantly. Real-time progress updates.' },
  { icon: Shield, title: 'No Login Required', desc: 'Start creating immediately. No account, no signup, no personal data collected.' },
  { icon: Video, title: 'HD Video (720p–1080p)', desc: 'Generate high-definition AI videos up to 1080p resolution with audio.' },
  { icon: Image, title: 'Up to 4K Images', desc: 'Create ultra-high-quality AI images at 4K resolution with seedream-4.0 model.' },
  { icon: Globe, title: 'Multiple AI Models', desc: 'Veo 3.1, Veo 3.1 Fast, Veo 3.1 Standard — choose your speed and style.' },
];

const models = [
  { name: 'Veo 3.1', badge: 'Best Quality', color: 'from-violet-500 to-purple-600', desc: 'Highest quality AI video generation. Perfect for professional content.' },
  { name: 'Veo 3.1 Fast', badge: 'Fastest', color: 'from-blue-500 to-cyan-600', desc: 'Blazing fast generation. Extra aspect ratio options including 21:9.' },
  { name: 'Veo 3.1 Standard', badge: 'Balanced', color: 'from-emerald-500 to-teal-600', desc: 'Great balance of speed and quality for everyday generation.' },
];

const faq = [
  { q: 'Is VEO 3 Free Unlimited really free?', a: 'Yes, 100% free. You can generate unlimited AI videos and images at no cost whatsoever. No hidden fees, no premium tiers, no credit system.' },
  { q: 'Do I need to create an account?', a: 'No. You can start generating AI videos and images immediately without signing up or providing any personal information.' },
  { q: 'What resolutions are available?', a: 'Videos: 360p, 540p, 720p (HD), and 1080p (Full HD). Images: 720p, 1080p, 2K, and 4K depending on the model selected.' },
  { q: 'What is VEO 3?', a: 'VEO 3 refers to our Veo 3.1 series of AI video generation models. These state-of-the-art models can generate realistic, high-quality videos from text prompts or images.' },
  { q: 'Can I generate videos from images?', a: 'Yes! Upload an image and use it as the starting frame for your AI video. Perfect for animating photos or creating video from AI-generated images.' },
  { q: 'How long can the generated videos be?', a: 'You can generate videos from 1 to 15 seconds in length. All video generations include AI-generated audio.' },
  { q: 'What AI image models are available?', a: 'We offer qwen-image (720p, 1080p) and seedream-4.0 (1080p, 2K, 4K). Both support image-to-image generation.' },
  { q: 'How does the queue work?', a: 'Your generation is placed in a smart queue. You can see your position in real-time. Typically, image generations complete in under a minute, videos in 2–5 minutes.' },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <span className="text-xl font-bold gradient-text">VEO 3 Free</span>
          <div className="flex items-center gap-4">
            <Link href="/gallery" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Gallery</Link>
            <Link
              href="/studio"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Wand2 className="w-4 h-4" /> Generate Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-background to-indigo-900/20" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-8">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>100% Free · No Login · Unlimited</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
            <span className="gradient-text">VEO 3 Free Unlimited</span>
            <br />
            <span className="text-foreground">AI Video & Image</span>
            <br />
            <span className="text-foreground/80">Generator</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Generate unlimited AI videos and images completely free. No login required.
            Powered by <strong className="text-foreground">Veo 3.1</strong> — the most advanced AI video model.
            Create in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/studio"
              className="group px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-all glow-sm flex items-center justify-center gap-2"
            >
              <Wand2 className="w-5 h-5" />
              Start Generating Free
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/gallery"
              className="px-8 py-4 rounded-xl glass font-semibold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              View Gallery
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            {['No Credit Card', 'No Watermark', 'HD Quality', 'Instant Start', 'Audio Included'].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Generate AI Videos Free — <span className="gradient-text">No Limits</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need to create stunning AI-generated content. Completely free, forever.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass rounded-xl p-6 hover:bg-white/8 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Models */}
      <section className="py-24 px-4 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Free AI Image Generator & <span className="gradient-text">Video Models</span>
            </h2>
            <p className="text-muted-foreground">Choose from three powerful Veo 3.1 models — all free.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {models.map(({ name, badge, color, desc }) => (
              <div key={name} className="glass rounded-xl p-6 hover:glow-sm transition-all group">
                <div className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${color} text-white mb-4`}>
                  {badge}
                </div>
                <h3 className="text-xl font-bold mb-2">{name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{desc}</p>
                <Link
                  href="/studio"
                  className="text-sm text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all"
                >
                  Try Free <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Frequently Asked <span className="gradient-text">Questions</span>
            </h2>
          </div>
          <div className="space-y-4">
            {faq.map(({ q, a }) => (
              <div key={q} className="glass rounded-xl p-6">
                <h3 className="font-semibold mb-2">{q}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass rounded-2xl p-12 glow">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Start Generating <span className="gradient-text">For Free</span> Now
            </h2>
            <p className="text-muted-foreground mb-8">
              No account needed. No credit card. VEO 3 Free Unlimited — create AI videos and images instantly.
            </p>
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-all"
            >
              <Wand2 className="w-5 h-5" />
              Generate AI Video Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} VEO 3 Free Unlimited. Generate AI videos free.
          </span>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/studio" className="hover:text-foreground transition-colors">Studio</Link>
            <Link href="/gallery" className="hover:text-foreground transition-colors">Gallery</Link>
          </div>
        </div>
      </footer>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'VEO 3 Free Unlimited',
            description: 'Free unlimited AI video and image generator. Generate with Veo 3.1 models at no cost.',
            url: 'https://veo3free.app',
            applicationCategory: 'MultimediaApplication',
            operatingSystem: 'Any',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          }),
        }}
      />
    </div>
  );
}
