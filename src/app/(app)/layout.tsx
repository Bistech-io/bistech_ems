import { Suspense, type ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { getSession } from '@/lib/auth/session';
import { AuthProvider } from '@/providers/auth-provider';

async function SessionHydratedShell({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session) {
    return <AppShell>{children}</AppShell>;
  }

  return (
    <AuthProvider initialSession={session}>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AppShell>{children}</AppShell>}>
      <SessionHydratedShell>{children}</SessionHydratedShell>
    </Suspense>
  );
}
