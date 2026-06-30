import { redirect } from 'next/navigation';

export default function SSOCallback() {
  redirect('/sign-in');
}
