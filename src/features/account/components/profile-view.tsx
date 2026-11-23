'use client';

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  IdCard,
  Loader2,
  Lock,
  Mail,
  Network,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';
import { ROLE_LABELS, type RoleName } from '@/lib/auth/permissions';
import { useAuth } from '@/providers/auth-provider';

const EASE = [0.22, 1, 0.36, 1] as const;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface RoleProfileDefaults {
  designation: string;
  department: string;
  employeeCode: string;
  joiningDate: string;
}

const ROLE_DEFAULTS: Record<RoleName, RoleProfileDefaults> = {
  super_admin: {
    designation: 'System Administrator',
    department: 'Executive & Platform',
    employeeCode: 'BST-00001',
    joiningDate: '2024-01-10',
  },
  hr_manager: {
    designation: 'HR Manager',
    department: 'People Operations',
    employeeCode: 'BST-00102',
    joiningDate: '2024-06-15',
  },
  dept_head: {
    designation: 'Head of Engineering',
    department: 'Engineering',
    employeeCode: 'BST-00103',
    joiningDate: '2024-04-01',
  },
  employee: {
    designation: 'Software Engineer',
    department: 'Engineering',
    employeeCode: 'BST-00115',
    joiningDate: '2025-02-15',
  },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface ReadOnlyFieldProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

function ReadOnlyField({ label, value, icon: Icon }: ReadOnlyFieldProps) {
  return (
    <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 px-4 py-3.5">
      <div className="flex items-center gap-2 text-[11px] font-medium text-[#6E8078]">
        <Icon className="h-3.5 w-3.5 text-[#4CAF7D]" />
        <span>{label}</span>
      </div>
      <p className="mt-1.5 text-sm font-medium text-[#F0F5F2]">{value}</p>
    </div>
  );
}

export function ProfileView() {
  const { user, activeRole, isLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPublicId, setAvatarPublicId] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSaved, setAvatarSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  const currentUserId = user?.userId ?? 'default';
  if (lastUserId !== currentUserId) {
    setLastUserId(currentUserId);
    if (typeof window !== 'undefined') {
      try {
        const savedUrl = localStorage.getItem(`bistech_avatar_${currentUserId}`);
        const savedPid = localStorage.getItem(`bistech_avatar_pid_${currentUserId}`);
        if (savedUrl) setAvatarUrl(savedUrl);
        if (savedPid) setAvatarPublicId(savedPid);
      } catch {
        // LocalStorage may be blocked or unavailable
      }
    }
  }

  const roleKey: RoleName = activeRole ?? 'employee';
  const defaults = ROLE_DEFAULTS[roleKey];

  const displayName = user?.name ?? 'BisTech Member';
  const displayUsername = user?.username ? `@${user.username}` : '—';
  const displayEmail = user?.email ?? '—';
  const displayRole = activeRole ? ROLE_LABELS[activeRole] : '—';
  const initials = useMemo(() => getInitials(displayName), [displayName]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setAvatarError(null);
    setAvatarSaved(false);

    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.has(file.type)) {
      setAvatarError('Please select a JPG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('Image must be 2 MB or smaller.');
      event.target.value = '';
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload photo to Cloudinary.');
      }

      setAvatarUrl(data.url);
      setAvatarPublicId(data.publicId);

      const storageKey = `bistech_avatar_${user?.userId ?? 'default'}`;
      const pidKey = `bistech_avatar_pid_${user?.userId ?? 'default'}`;
      try {
        localStorage.setItem(storageKey, data.url);
        if (data.publicId) {
          localStorage.setItem(pidKey, data.publicId);
        }
      } catch {
        // LocalStorage may be blocked or unavailable
      }

      setAvatarSaved(true);
    } catch (err) {
      setAvatarError(
        err instanceof Error ? err.message : 'Upload failed. Please try again.',
      );
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  }

  async function handleRemoveAvatar() {
    setAvatarError(null);
    setAvatarSaved(false);

    const pidToDelete = avatarPublicId;
    setAvatarUrl(null);
    setAvatarPublicId(null);

    const storageKey = `bistech_avatar_${user?.userId ?? 'default'}`;
    const pidKey = `bistech_avatar_pid_${user?.userId ?? 'default'}`;
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(pidKey);
    } catch {
      // Ignore
    }

    if (pidToDelete) {
      try {
        await fetch('/api/upload/avatar', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: pidToDelete }),
        });
      } catch {
        // Best effort deletion on Cloudinary
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#23302B] border-t-[#4CAF7D]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="space-y-6"
    >
      {/* Page Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#23302B] pb-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-[#4CAF7D] uppercase">
            Account
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-[-0.02em] text-[#F0F5F2] md:text-3xl">
            My Profile
          </h1>
          <p className="mt-1 text-sm text-[#A3B3AC]">
            View your organization profile and update your profile photo.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-[#23302B] bg-[#131A17] px-3.5 py-2 text-xs text-[#A3B3AC]">
          <Lock className="h-3.5 w-3.5 text-[#4CAF7D]" />
          <span>Profile fields are read-only</span>
        </div>
      </header>

      {/* Hero Profile Identity & Photo Card */}
      <section className="rounded-3xl border border-[#23302B] bg-[#131A17] p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {/* Avatar with Change Overlay */}
            <div className="relative h-24 w-24 shrink-0">
              <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-2 border-[#2E8B57]/60 bg-[#1A2420] shadow-lg">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={`${displayName} profile picture`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-heading text-2xl font-bold text-[#4CAF7D]">
                    {initials}
                  </span>
                )}

                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-[#0B0F0E]/75 backdrop-blur-xs">
                    <Loader2 className="h-6 w-6 animate-spin text-[#4CAF7D]" />
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change profile picture"
                className="absolute -right-1.5 -bottom-1.5 flex h-9 w-9 items-center justify-center rounded-xl border border-[#23302B] bg-[#2E8B57] text-[#F0F5F2] shadow-md transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CAF7D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="sr-only"
                aria-label="Upload profile picture"
              />
            </div>

            {/* Identity Summary */}
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-heading text-xl font-bold text-[#F0F5F2] md:text-2xl">
                  {displayName}
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2E8B57]/40 bg-[#1F5C3A]/40 px-2.5 py-0.5 text-[11px] font-medium text-[#4CAF7D]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4CAF7D]" />
                  Active
                </span>
              </div>

              <p className="mt-1 text-sm text-[#A3B3AC]">
                {defaults.designation} · {defaults.department}
              </p>

              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-[#6E8078]">
                <span className="rounded-lg border border-[#23302B] bg-[#0B0F0E] px-2.5 py-1 font-medium text-[#A3B3AC]">
                  {defaults.employeeCode}
                </span>
                <span className="rounded-lg border border-[#23302B] bg-[#0B0F0E] px-2.5 py-1 font-medium text-[#4CAF7D]">
                  {displayRole}
                </span>
              </div>
            </div>
          </div>

          {/* Photo Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#2E8B57] px-4 text-xs font-semibold text-[#F0F5F2] shadow-[0_6px_20px_-6px_rgba(46,139,87,0.55)] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CAF7D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Camera className="h-3.5 w-3.5" />
                  <span>Change Photo</span>
                </>
              )}
            </button>

            {avatarUrl && (
              <button
                type="button"
                disabled={isUploading}
                onClick={handleRemoveAvatar}
                className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-[#23302B] bg-[#0B0F0E] px-3.5 text-xs font-medium text-[#A3B3AC] transition-colors hover:border-[#EF4444]/40 hover:bg-[#EF4444]/10 hover:text-[#EF4444] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback banners for avatar upload */}
        {avatarError && (
          <p role="alert" className="mt-4 text-xs text-[#EF4444]">
            {avatarError}
          </p>
        )}
        {avatarSaved && !avatarError && (
          <p
            role="status"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#4CAF7D]"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Profile picture updated.</span>
          </p>
        )}
      </section>

      {/* Read-Only Details Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Work Identity */}
        <section className="rounded-3xl border border-[#23302B] bg-[#131A17] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-heading text-base font-semibold text-[#F0F5F2]">
                Identity &amp; Role
              </h3>
              <p className="text-xs text-[#6E8078]">
                Managed by your organization administrator
              </p>
            </div>
            <Lock className="h-4 w-4 text-[#6E8078]" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ReadOnlyField label="Full Name" value={displayName} icon={User} />
            <ReadOnlyField label="Username" value={displayUsername} icon={IdCard} />
            <ReadOnlyField label="Work Email" value={displayEmail} icon={Mail} />
            <ReadOnlyField label="Assigned Role" value={displayRole} icon={ShieldCheck} />
          </div>
        </section>

        {/* Organization & Employment */}
        <section className="rounded-3xl border border-[#23302B] bg-[#131A17] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-heading text-base font-semibold text-[#F0F5F2]">
                Employment Details
              </h3>
              <p className="text-xs text-[#6E8078]">
                Contact HR if any work information needs updating
              </p>
            </div>
            <Lock className="h-4 w-4 text-[#6E8078]" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ReadOnlyField label="Designation" value={defaults.designation} icon={Briefcase} />
            <ReadOnlyField label="Department" value={defaults.department} icon={Network} />
            <ReadOnlyField label="Organization" value="BisTech" icon={Building2} />
            <ReadOnlyField label="Joining Date" value={defaults.joiningDate} icon={Calendar} />
            <ReadOnlyField label="Employee Code" value={defaults.employeeCode} icon={IdCard} />
            <ReadOnlyField label="Work Shift" value="09:00 AM · Asia/Dhaka" icon={Clock} />
          </div>
        </section>
      </div>
    </motion.div>
  );
}
