import { redirect } from 'next/navigation';
import { LoginForm } from '@/features/auth/components/login-form';
import { getSession } from '@/lib/auth/session';

export const instant = false;

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession();
  if (session) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  return <LoginForm nextPath={params.next} />;
}
