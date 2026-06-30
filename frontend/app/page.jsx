import Link from 'next/link';
import {
  Video, Image, Zap, ChevronRight,
  CheckCircle, Play, Wand2, Globe, Infinity, User,
  Sparkles, ArrowRight, Star,
} from 'lucide-react';
import Logo from '../components/Logo';
import HomeNavAuth from '../components/HomeNavAuth';
import HomeStartLink from '../components/HomeStartLink';

export const metadata = {
  title: 'veo3free.fun — Unlimited Video Generations Free',
  description:
    'Generate unlimited AI videos and images for free. veo3free.fun — create stunning AI videos with VEO 3 Free Unlimited. No credit card, no limits. Powered by Veo 3.1 models.',
};

const features = [
  { icon: Infinity, title: 'Unlimited Generations', desc: 'Generate as many videos and images as you want. Zero daily limits, zero restrictions, zero cost.' },
  { icon: Zap,      title: 'Real-Time Queue',       desc: 'Smart queue distributes your job instantly. Watch live progress via WebSocket updates.' },
  { icon: User,     title: 'Personal Studio',        desc: 'All your creations saved in one place. Access your full generation history anytime.' },
  { icon: Video,    title: 'HD Video (720p–1080p)',  desc: 'Generate high-definition AI videos up to 1080p with AI-generated audio included.' },
  { icon: Image,    title: 'Up to 4K Images',        desc: 'Ultra-high-quality AI images at 4K resolution using the seedream-4.0 model.' },
  { icon: Globe,    title: 'Multiple AI Models',     desc: 'Veo 3.1, Veo 3.1 Fast, Veo 3.1 Standard — choose your speed and quality.' },
];

const models = [
  { name: 'Veo 3.1',          badge: 'Best Quality', gradient: 'from-violet-500 to-purple-600',  ring: 'ring-violet-500/30',  desc: 'Highest quality output. Perfect for professional content.' },
  { name: 'Veo 3.1 Fast',     badge: 'Fastest',      gradient: 'from-blue-500 to-cyan-500',       ring: 'ring-blue-500/30',    desc: 'Blazing fast generation. Extra aspect ratio options including 21:9.' },
  { name: 'Veo 3.1 Standard', badge: 'Balanced',     gradient: 'from-emerald-500 to-teal-500',    ring: 'ring-emerald-500/30', desc: 'Great balance of speed and quality for everyday creation.' },
];

const steps = [
  { n: '1', title: 'Sign in with Google',    desc: 'One click — no forms, no credit card. Account created or logged in instantly.' },
  { n: '2', title: 'Describe Your Vision',   desc: 'Type a prompt or upload an image to animate. Pick model, resolution, and style.' },
  { n: '3', title: 'Download Your Creation', desc: 'Watch real-time progress, then download your HD video or image instantly.' },
];

const perks = ['No Credit Card', 'No Watermark', 'HD Quality', 'Audio Included', 'Free Forever'];

const faq = [
  { q: 'Is veo3free.fun really free?',      a: 'Yes, 100% free. Unlimited AI videos and images at no cost. No hidden fees, no premium tiers, no credit system — ever.' },
  { q: 'Do I need to create an account?',   a: 'Yes, a free account is required. Just click "Continue with Google" — one click creates your account or signs you in. Your creations are saved automatically.' },
  { q: 'What resolutions are available?',   a: 'Videos: 360p, 540p, 720p (HD), 1080p (Full HD). Images: 720p, 1080p, 2K, 4K depending on model.' },
  { q: 'What is VEO 3?',                    a: 'VEO 3 refers to our Veo 3.1 series of AI video generation models — state-of-the-art models that generate realistic, high-quality videos from text or images.' },
  { q: 'Can I generate videos from images?', a: 'Yes! Upload an image as the starting frame for your AI video. Perfect for animating photos or creating video from AI-generated images.' },
  { q: 'How long can generated videos be?', a: 'Videos from 1 to 15 seconds — all with AI-generated audio included.' },
  { q: 'What image models are available?',  a: 'qwen-image (720p, 1080p) and seedream-4.0 (1080p, 2K, 4K). Both support image-to-image generation.' },
  { q: 'How does the queue work?',          a: 'Your generation joins a smart queue with real-time position updates. Images typically finish in under a minute, videos in 2–5 minutes.' },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">

      {/* ── Nav ──────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2.5">
            <HomeNavAuth />
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-14 overflow-hidden dots-bg">
        <div className="absolute top-1/4 left-1/5 w-72 sm:w-[420px] h-72 sm:h-[420px] bg-violet-600/12 rounded-full blur-3xl float-slow pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/5 w-72 sm:w-[380px] h-72 sm:h-[380px] bg-indigo-600/10 rounded-full blur-3xl float-slow-alt pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-700/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <div className="fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-medium mb-7">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            Free · Unlimited · No Credit Card
          </div>

          <h1 className="fade-up-d1 text-4xl sm:text-6xl lg:text-7xl font-extrabold mb-5 leading-[1.1] tracking-tight">
            <span className="gradient-text-animated">Unlimited Video</span>
            <br />
            <span className="text-foreground">Generations,</span>
            <br />
            <span className="text-foreground/70">Completely Free</span>
          </h1>

          <p className="fade-up-d2 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
            Create unlimited AI videos &amp; images on{' '}
            <strong className="text-foreground font-semibold">veo3free.fun</strong> — powered by{' '}
            <strong className="text-foreground font-semibold">Veo 3.1</strong>, the world&apos;s most advanced AI video model.
          </p>

          {/* CTA buttons — auth-aware */}
          <div className="fade-up-d3 flex flex-col sm:flex-row gap-3 justify-center items-center mb-10">
            <HomeStartLink className="group px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all glow-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Start Free
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </HomeStartLink>
            <Link
              href="/studio"
              className="px-5 py-2.5 rounded-xl glass font-semibold text-sm hover:bg-white/10 active:scale-95 transition-all flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              View Studio
            </Link>
          </div>

          <div className="fade-up-d4 flex flex-wrap justify-center gap-3 sm:gap-5 text-xs text-muted-foreground">
            {perks.map((p) => (
              <div key={p} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                {p}
              </div>
            ))}
          </div>
        </div>

        <div className="fade-in-d2 absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-muted-foreground/40">
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-muted-foreground/30" />
          <span className="text-[10px] tracking-widest uppercase">scroll</span>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────── */}
      <div className="border-y border-white/10 py-5 px-4 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
          {[
            { val: 'Unlimited', label: 'Generations' },
            { val: '3',         label: 'AI Models' },
            { val: '4K',        label: 'Max Resolution' },
          ].map(({ val, label }) => (
            <div key={label}>
              <div className="text-xl sm:text-2xl font-bold gradient-text">{val}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="py-20 sm:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Everything Included</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              Unlimited Generations —{' '}
              <span className="gradient-text">Zero Cost</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">
              Everything you need to create stunning AI content. Free, forever.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass-hover card-lift rounded-xl p-5 group">
                <div className="w-9 h-9 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mb-3.5 transition-colors">
                  <Icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1.5">{title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="py-20 sm:py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/4 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              Up &amp; Creating in{' '}
              <span className="gradient-text">3 Steps</span>
            </h2>
            <p className="text-muted-foreground text-sm">No setup needed. Be generating AI content in under 60 seconds.</p>
          </div>
          <div className="relative grid sm:grid-cols-3 gap-6 sm:gap-8">
            <div className="hidden sm:block absolute top-7 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            {steps.map(({ n, title, desc }) => (
              <div key={n} className="text-center relative">
                <div className="relative inline-flex mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-primary/25 flex items-center justify-center">
                    <span className="text-lg font-extrabold gradient-text">{n}</span>
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-primary/10 pulse-ring" />
                </div>
                <h3 className="font-semibold text-sm mb-1.5">{title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Models ───────────────────────────────────────── */}
      <section className="py-20 sm:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">AI Models</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              Professional Quality —{' '}
              <span className="gradient-text">All Free</span>
            </h2>
            <p className="text-muted-foreground text-sm">Three powerful Veo 3.1 models — choose your speed and quality.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {models.map(({ name, badge, gradient, ring, desc }) => (
              <div key={name} className={`glass card-lift glow-hover rounded-xl p-5 ring-1 ${ring} group`}>
                <div className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r ${gradient} text-white mb-4 shadow-sm`}>
                  {badge}
                </div>
                <h3 className="font-bold text-base mb-1.5">{name}</h3>
                <p className="text-muted-foreground text-xs mb-4 leading-relaxed">{desc}</p>
                <HomeStartLink className="inline-flex items-center gap-1 text-xs text-primary font-medium group-hover:gap-2 transition-all">
                  Try free <ArrowRight className="w-3 h-3" />
                </HomeStartLink>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/4 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto relative">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Frequently Asked{' '}
              <span className="gradient-text">Questions</span>
            </h2>
          </div>
          <div className="space-y-3">
            {faq.map(({ q, a }) => (
              <div key={q} className="glass-hover rounded-xl p-4 sm:p-5">
                <h3 className="font-semibold text-sm mb-1.5 text-foreground">{q}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="glass rounded-2xl p-8 sm:p-12 glow relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex justify-center mb-5">
                <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                Start Generating —{' '}
                <span className="gradient-text">Free Forever</span>
              </h2>
              <p className="text-muted-foreground text-sm mb-7 max-w-md mx-auto">
                Join veo3free.fun and create unlimited AI videos &amp; images. One click, no credit card, no limits.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <HomeStartLink className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all">
                  <Sparkles className="w-4 h-4" />
                  Start Free
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </HomeStartLink>
                <Link href="/studio" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl glass font-semibold text-sm hover:bg-white/10 active:scale-95 transition-all">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  View Studio
                </Link>
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground/60">
                {perks.map(p => <span key={p}>✓ {p}</span>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-white/10 py-7 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Logo size={22} />
            <span className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} veo3free.fun — Free unlimited AI video generations.
            </span>
          </div>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <Link href="/studio" className="hover:text-foreground transition-colors">Studio</Link>
            <Link href="/sign-in" className="hover:text-foreground transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'veo3free.fun',
            alternateName: ['VEO 3 Free Unlimited', 'veo3free', 'Unlimited Video Generations'],
            description: 'Free unlimited AI video and image generator. Generate with Veo 3.1 models at no cost.',
            url: 'https://veo3free.fun',
            applicationCategory: 'MultimediaApplication',
            operatingSystem: 'Any',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          }),
        }}
      />
    </div>
  );
}
