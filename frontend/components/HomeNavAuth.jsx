'use client';
import Link from 'next/link';
import { Wand2 } from 'lucide-react';
import { useAuthStore } from '../lib/store';

export default function HomeNavAuth() {
  const { isSignedIn, isLoaded } = useAuthStore();

  if (!isLoaded) {
    return (
      <Link href="/studio" className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5">
        <Wand2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Start Free</span>
        <span className="sm:hidden">Start</span>
      </Link>
    );
  }

  if (isSignedIn) {
    return (
      <Link href="/studio" className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5">
        <Wand2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Go to Studio</span>
        <span className="sm:hidden">Studio</span>
      </Link>
    );
  }

  return (
    <>
      <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block px-3 py-1.5">
        Sign In
      </Link>
      <Link href="/sign-in" className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5">
        <Wand2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Start Free</span>
        <span className="sm:hidden">Start</span>
      </Link>
    </>
  );
}
