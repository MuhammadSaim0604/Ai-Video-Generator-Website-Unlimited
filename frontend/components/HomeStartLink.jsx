'use client';
import Link from 'next/link';
import { useAuthStore } from '../lib/store';

export default function HomeStartLink({ children, className }) {
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  return (
    <Link href={isSignedIn ? '/studio' : '/sign-in'} className={className}>
      {children}
    </Link>
  );
}
