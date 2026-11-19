'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { AlertCircle, Eye, EyeOff, FlaskConical, Loader2, Lock, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { ApiError, getErrorMessageForCode } from '@/lib/api/errors';
import { useAuth } from '@/providers/auth-provider';
import { useLoginMutation } from '../hooks';
import { loginRequestSchema, type LoginRequest } from '../schemas';

interface LoginFormProps {
  nextPath?: string;
}

export interface QuickDemoAccount {
  label: string;
  role: string;
  username: string;
}

export const QUICK_DEMO_ACCOUNTS: QuickDemoAccount[] = [
  { label: 'Super Admin', role: 'Full Access', username: 'admin' },
  { label: 'HR Manager', role: 'People & Onboarding', username: 'hr' },
  { label: 'Dept Head', role: 'Engineering Head', username: 'head' },
  { label: 'Employee', role: 'Software Engineer', username: 'employee' },
];

export function getSafeNextPath(nextParam?: string | null): string {
  if (!nextParam) return '/dashboard';
  if (!nextParam.startsWith('/') || nextParam.startsWith('//')) return '/dashboard';
  if (nextParam.startsWith('/login')) return '/dashboard';
  return nextParam;
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const { setSession } = useAuth();
  const loginMutation = useLoginMutation();

  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const errorBannerRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const isBusy = isSubmitting || loginMutation.isPending;

  useEffect(() => {
    if (formError) {
      errorBannerRef.current?.focus();
    }
  }, [formError]);

  async function onSubmit(values: LoginRequest) {
    setFormError(null);

    try {
      const authMe = await loginMutation.mutateAsync(values);
      setSession(authMe);
      router.replace(getSafeNextPath(nextPath));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'VALIDATION_ERROR' && err.details.length > 0) {
          let focused = false;
          for (const detail of err.details) {
            if (detail.field === 'username' || detail.field === 'password' || detail.field === 'organizationSlug') {
              setError(detail.field, { type: 'server', message: detail.message });
              if (!focused) {
                setFocus(detail.field);
                focused = true;
              }
            }
          }
          setFormError(getErrorMessageForCode('VALIDATION_ERROR'));
        } else {
          setFormError(getErrorMessageForCode(err.code));
        }
        return;
      }

      setFormError(getErrorMessageForCode('INTERNAL_ERROR'));
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      {formError && (
        <div
          ref={errorBannerRef}
          tabIndex={-1}
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2.5 rounded-2xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-3 text-xs leading-relaxed text-[#FCA5A5] outline-none"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
          <span>{formError}</span>
        </div>
      )}

      {/* Username */}
      <div className="space-y-1.5">
        <label htmlFor="login-username" className="block text-xs font-medium text-[#A3B3AC]">
          Username
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6E8078]" />
          <input
            id="login-username"
            type="text"
            autoComplete="username"
            disabled={isBusy}
            aria-invalid={Boolean(errors.username)}
            aria-describedby={errors.username ? 'login-username-error' : undefined}
            placeholder="Enter your username"
            {...register('username')}
            className="h-11 w-full rounded-2xl border border-[#23302B] bg-[#0B0F0E] pr-4 pl-10 text-sm text-[#F0F5F2] placeholder-[#6E8078] transition-colors outline-none focus:border-[#4CAF7D] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        {errors.username && (
          <p id="login-username-error" role="alert" className="text-xs text-[#EF4444]">
            {errors.username.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="login-password" className="block text-xs font-medium text-[#A3B3AC]">
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6E8078]" />
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            disabled={isBusy}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            placeholder="Enter your password"
            {...register('password')}
            className="h-11 w-full rounded-2xl border border-[#23302B] bg-[#0B0F0E] pr-11 pl-10 text-sm text-[#F0F5F2] placeholder-[#6E8078] transition-colors outline-none focus:border-[#4CAF7D] disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1 text-[#6E8078] transition-colors hover:text-[#F0F5F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CAF7D]"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p id="login-password-error" role="alert" className="text-xs text-[#EF4444]">
            {errors.password.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isBusy}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#2E8B57] px-5 text-sm font-semibold text-[#0B0F0E] shadow-[0_8px_24px_-6px_rgba(46,139,87,0.55)] transition-colors hover:bg-[#4CAF7D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CAF7D] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isBusy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Signing in...</span>
          </>
        ) : (
          <span>Sign in</span>
        )}
      </button>

      {/* Quick Demo Sign-In Roles */}
      <div className="pt-2">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#23302B]" />
          </div>
          <div className="relative bg-[#0E1512] px-3 text-[11px] font-medium uppercase tracking-wider text-[#A3B3AC]">
            Quick Demo Sign-In
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {QUICK_DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.username}
              type="button"
              disabled={isBusy}
              onClick={() => {
                setValue('username', acc.username, { shouldValidate: true });
                setValue('password', 'Password123!', { shouldValidate: true });
                setFormError(null);
              }}
              className="group flex flex-col items-start rounded-xl border border-[#23302B] bg-[#131A17]/80 p-2.5 text-left transition-all hover:border-[#2E8B57] hover:bg-[#1A2420] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CAF7D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xs font-semibold text-[#F0F5F2] group-hover:text-[#4CAF7D] transition-colors">
                  {acc.label}
                </span>
                <span className="rounded bg-[#23302B] px-1.5 py-0.5 text-[10px] font-medium text-[#A3B3AC] group-hover:bg-[#2E8B57]/20 group-hover:text-[#4CAF7D] transition-colors">
                  {acc.username}
                </span>
              </div>
              <span className="mt-0.5 text-[11px] text-[#A3B3AC]">
                {acc.role}
              </span>
            </button>
          ))}
        </div>
      </div>
    </motion.form>
  );
}
