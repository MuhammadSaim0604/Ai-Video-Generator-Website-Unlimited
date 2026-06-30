'use client';
import Link from 'next/link';
import { useUserAuthStore } from '../stores/user/user.auth.store';

export default function HomeStartLink({ children, className }) {
  const isSignedIn = useUserAuthStore((s) => s.isSignedIn);
  return (
    <Link href={isSignedIn ? '/studio' : '/sign-in'} className={className}>
      {children}
    </Link>
  );
}
