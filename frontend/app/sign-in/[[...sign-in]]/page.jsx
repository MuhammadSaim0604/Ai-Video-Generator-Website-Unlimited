import Link from 'next/link';
import Logo from '../../../components/Logo';
import { GoogleAuthButton } from '../../../components/GoogleAuthButton';

export const metadata = {
  title: 'Sign In — veo3free.fun | Unlimited Video Generations',
  description: 'Sign in or create your free veo3free.fun account with Google and start generating unlimited AI videos and images.',
};

const ERROR_MESSAGES = {
  access_denied: 'Google sign-in was cancelled. Please try again.',
  state_mismatch: 'Security check failed. Please try again.',
  auth_failed: 'Authentication failed. Please try again.',
  not_configured: 'Google sign-in is not set up yet.',
};

export default async function AuthPage({ searchParams }) {
  const params = await searchParams;
  const errorKey = params?.error;
  const errorMsg = errorKey ? (ERROR_MESSAGES[errorKey] || 'Something went wrong. Please try again.') : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-background to-indigo-900/20" />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Link href="/">
            <Logo size={52} />
          </Link>
          <h1 className="text-2xl font-bold mt-5 mb-1">Get started free</h1>
          <p className="text-muted-foreground text-sm text-center">
            Unlimited AI video &amp; image generations — no credit card
          </p>
        </div>

        <div className="glass rounded-2xl border border-white/10 shadow-2xl p-6 space-y-4">
          <div className="space-y-2.5">
            {[
              'Unlimited video & image generations',
              'All creations saved to your account',
              'HD quality · No watermark · Free forever',
            ].map((perk) => (
              <div key={perk} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {perk}
              </div>
            ))}
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <p className="text-red-400 text-xs text-center">{errorMsg}</p>
            </div>
          )}

          <div className="border-t border-white/10 pt-4">
            <GoogleAuthButton />
            <p className="text-center text-xs text-muted-foreground mt-3">
              New or returning — one click gets you in
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/50 mt-4">
          Free forever · No credit card required
        </p>
      </div>
    </div>
  );
}
