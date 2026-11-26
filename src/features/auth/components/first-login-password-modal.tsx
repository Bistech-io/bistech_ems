'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { resetPassword } from '@/features/auth/api';
import { postCheckIn, queryHasUserEverCheckedIn } from '@/features/attendance/api';
import { ApiError, getErrorMessageForCode } from '@/lib/api/errors';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1] as const;

export function FirstLoginPasswordModal() {
  const { user, session, isAuthenticated } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const userId = session?.user.id ?? user?.userId ?? null;
  const employeeId = session?.employeeId ?? null;

  useEffect(() => {
    if (!isAuthenticated || !userId || !employeeId) {
      return;
    }

    let cancelled = false;

    queryHasUserEverCheckedIn()
      .then((hasCheckedInEver) => {
        if (!cancelled && !hasCheckedInEver) {
          setIsOpen(true);
        }
      })
      .catch(() => {
        // Ignore if user does not have an employee attendance record
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId, employeeId]);

  const forbiddenIdentityTokens = useMemo(() => {
    const tokens = new Set<string>();
    const rawName = session?.user.name ?? user?.name ?? '';
    const rawUsername = session?.user.username ?? user?.username ?? '';
    const rawEmail = session?.user.email ?? user?.email ?? '';

    if (rawUsername.trim().length >= 3) {
      tokens.add(rawUsername.trim().toLowerCase());
    }

    if (rawEmail.trim().length >= 3) {
      const lowerEmail = rawEmail.trim().toLowerCase();
      tokens.add(lowerEmail);
      const localPart = lowerEmail.split('@')[0]?.trim();
      if (localPart && localPart.length >= 3) {
        tokens.add(localPart);
      }
    }

    if (rawName.trim().length >= 3) {
      const lowerName = rawName.trim().toLowerCase();
      tokens.add(lowerName);
      for (const part of lowerName.split(/\s+/)) {
        if (part.length >= 3) {
          tokens.add(part);
        }
      }
    }

    return Array.from(tokens);
  }, [session, user]);

  const lengthValid = newPassword.length >= 8;

  const containsIdentity = useMemo(() => {
    if (!newPassword) return false;
    const lowerPwd = newPassword.toLowerCase();
    return forbiddenIdentityTokens.some((token) => lowerPwd.includes(token));
  }, [newPassword, forbiddenIdentityTokens]);

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting || isSuccess) return;

    setErrorMessage(null);

    if (!lengthValid) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    if (containsIdentity) {
      setErrorMessage('Password cannot contain your name or email.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({ newPassword });

      try {
        await postCheckIn('First day check-in');
      } catch (checkInErr) {
        if (
          !(
            checkInErr instanceof ApiError &&
            (checkInErr.code === 'ALREADY_CHECKED_IN' ||
              checkInErr.code === 'OUTSIDE_OFFICE_NETWORK')
          )
        ) {
          throw checkInErr;
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ems:attendance-checked-in'));
      }

      setIsSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || getErrorMessageForCode(err.code));
      } else {
        setErrorMessage('Failed to set password. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F0E]/85 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="first-login-password-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="w-full max-w-md rounded-3xl border border-[#23302B] bg-[#131A17] p-6 shadow-2xl"
          >
            {isSuccess ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2E8B57]/40 bg-[#1F5C3A]/40 text-[#4CAF7D]">
                  <CheckCircle2 className="h-6 w-6" />
                </div>

                <div>
                  <h2
                    id="first-login-password-title"
                    className="font-heading text-xl font-bold text-[#F0F5F2]"
                  >
                    Password Set &amp; Checked In
                  </h2>
                  <p className="mt-2 text-sm text-[#A3B3AC]">
                    Your password has been updated and your first day check-in is confirmed.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#2E8B57] px-5 text-sm font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E]"
                >
                  Continue
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#2E8B57]/40 bg-[#1F5C3A]/35 text-[#4CAF7D]">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.08em] text-[#4CAF7D] uppercase">
                      First Login Setup
                    </p>
                    <h2
                      id="first-login-password-title"
                      className="font-heading text-lg font-bold text-[#F0F5F2]"
                    >
                      Set Your Password
                    </h2>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div>
                    <label
                      htmlFor="first-login-new-password"
                      className="block text-xs font-medium text-[#A3B3AC]"
                    >
                      New Password
                    </label>
                    <div className="relative mt-1.5">
                      <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6E8078]" />
                      <input
                        id="first-login-new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        className="h-11 w-full rounded-2xl border border-[#23302B] bg-[#0B0F0E] pr-10 pl-10 text-sm text-[#F0F5F2] placeholder-[#6E8078] focus:border-[#2E8B57] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-[#6E8078] transition-colors hover:text-[#F0F5F2]"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="first-login-confirm-password"
                      className="block text-xs font-medium text-[#A3B3AC]"
                    >
                      Confirm Password
                    </label>
                    <div className="relative mt-1.5">
                      <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6E8078]" />
                      <input
                        id="first-login-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        className="h-11 w-full rounded-2xl border border-[#23302B] bg-[#0B0F0E] pr-10 pl-10 text-sm text-[#F0F5F2] placeholder-[#6E8078] focus:border-[#2E8B57] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={
                          showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                        }
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-[#6E8078] transition-colors hover:text-[#F0F5F2]"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#23302B] bg-[#0B0F0E]/75 p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          lengthValid ? 'bg-[#4CAF7D]' : 'bg-[#6E8078]',
                        )}
                      />
                      <span className={lengthValid ? 'text-[#F0F5F2]' : 'text-[#A3B3AC]'}>
                        At least 8 characters
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          newPassword.length > 0 && !containsIdentity
                            ? 'bg-[#4CAF7D]'
                            : containsIdentity
                              ? 'bg-[#EF4444]'
                              : 'bg-[#6E8078]',
                        )}
                      />
                      <span
                        className={
                          containsIdentity
                            ? 'text-[#FCA5A5]'
                            : newPassword.length > 0
                              ? 'text-[#F0F5F2]'
                              : 'text-[#A3B3AC]'
                        }
                      >
                        Cannot contain your name or email
                      </span>
                    </div>
                  </div>

                  {errorMessage && (
                    <div
                      role="alert"
                      className="flex items-center gap-2 rounded-2xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-3.5 py-2.5 text-xs text-[#FCA5A5]"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 text-[#EF4444]" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !lengthValid || containsIdentity || !passwordsMatch}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#2E8B57] px-5 text-sm font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        <span>Set Password &amp; Check In</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
