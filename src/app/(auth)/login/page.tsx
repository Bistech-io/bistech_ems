import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/features/auth/components/login-form';
import { getSession } from '@/lib/auth/session';

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

async function LoginContent({ searchParams }: LoginPageProps) {
  const session = await getSession();
  if (session) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  return <LoginForm nextPath={params.next} />;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <Suspense
      fallback={
        <div className="h-64 animate-pulse rounded-2xl bg-[#1A2420]/50" />
      }
    >
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
