'use client';

import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Network,
  Phone,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';
import { changePassword } from '@/features/auth/api';
import { ApiError, getErrorMessageForCode } from '@/lib/api/errors';
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

interface PersonalDetails {
  personalEmail: string;
  personalPhone: string;
  dateOfBirth: string;
  addressLine: string;
  city: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

const EMPTY_PERSONAL_DETAILS: PersonalDetails = {
  personalEmail: '',
  personalPhone: '',
  dateOfBirth: '',
  addressLine: '',
  city: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
};

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
      <p className="mt-1.5 truncate text-sm font-medium text-[#F0F5F2]">{value}</p>
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

  // Personal Details (editable)
  const [personalDetails, setPersonalDetails] = useState<PersonalDetails>(EMPTY_PERSONAL_DETAILS);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [personalSavedNotice, setPersonalSavedNotice] = useState(false);

  // Change Password Card state (8+ chars, with Current Password verification)
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const currentUserId = user?.userId ?? 'default';
  if (lastUserId !== currentUserId) {
    setLastUserId(currentUserId);
    if (typeof window !== 'undefined') {
      try {
        const savedUrl = localStorage.getItem(`bistech_avatar_${currentUserId}`);
        const savedPid = localStorage.getItem(`bistech_avatar_pid_${currentUserId}`);
        if (savedUrl) setAvatarUrl(savedUrl);
        if (savedPid) setAvatarPublicId(savedPid);

        const savedPersonalRaw = localStorage.getItem(`bistech_personal_${currentUserId}`);
        if (savedPersonalRaw) {
          const parsed = JSON.parse(savedPersonalRaw) as Partial<PersonalDetails>;
          setPersonalDetails({ ...EMPTY_PERSONAL_DETAILS, ...parsed });
        }
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

  function handleSavePersonalDetails(e: FormEvent) {
    e.preventDefault();
    setIsSavingPersonal(true);
    setPersonalSavedNotice(false);

    try {
      localStorage.setItem(
        `bistech_personal_${currentUserId}`,
        JSON.stringify(personalDetails),
      );
    } catch {
      // Ignore storage error
    }

    setIsSavingPersonal(false);
    setPersonalSavedNotice(true);
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (isUpdatingPassword) return;

    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword.trim()) {
      setPasswordError('Current password is required.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    const lowerPwd = newPassword.toLowerCase();
    const tokens = [user?.username, user?.name, user?.email?.split('@')[0]]
      .filter((t): t is string => Boolean(t && t.trim().length >= 3))
      .map((t) => t.trim().toLowerCase());

    if (tokens.some((t) => lowerPwd.includes(t))) {
      setPasswordError('Password cannot contain your name, username, or email.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Password updated successfully.');
    } catch (err) {
      if (err instanceof ApiError) {
        setPasswordError(err.message || getErrorMessageForCode(err.code));
      } else {
        setPasswordError('Failed to update password. Please try again.');
      }
    } finally {
      setIsUpdatingPassword(false);
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
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#23302B] pb-5">
        <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-[#F0F5F2] md:text-3xl">
          My Profile
        </h1>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-[#23302B] bg-[#131A17] px-3.5 py-2 text-xs text-[#A3B3AC]">
          <Lock className="h-3.5 w-3.5 text-[#4CAF7D]" />
          <span>Professional details are read-only</span>
        </div>
      </header>

      {/* Bigger Profile Photo + Name on Side Hero Card */}
      <section className="rounded-3xl border border-[#23302B] bg-gradient-to-br from-[#131A17] via-[#131A17] to-[#1A2420]/70 p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            {/* Bigger Avatar */}
            <div className="relative h-32 w-32 shrink-0 sm:h-36 sm:w-36">
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[2rem] border-2 border-[#2E8B57]/70 bg-[#1A2420] shadow-[0_14px_36px_-10px_rgba(46,139,87,0.45)]">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={`${displayName} profile picture`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-heading text-4xl font-bold text-[#4CAF7D]">
                    {initials}
                  </span>
                )}

                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-[2rem] bg-[#0B0F0E]/75 backdrop-blur-xs">
                    <Loader2 className="h-7 w-7 animate-spin text-[#4CAF7D]" />
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change profile picture"
                className="absolute -right-2 -bottom-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-[#23302B] bg-[#2E8B57] text-[#F0F5F2] shadow-lg transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CAF7D] disabled:cursor-not-allowed disabled:opacity-60"
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

            {/* Name & Identity on Side */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-heading text-2xl font-bold tracking-[-0.02em] text-[#F0F5F2] md:text-3xl">
                  {displayName}
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2E8B57]/40 bg-[#1F5C3A]/40 px-3 py-0.5 text-xs font-medium text-[#4CAF7D]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4CAF7D]" />
                  Active
                </span>
              </div>

              <p className="text-sm font-medium text-[#A3B3AC]">
                {defaults.designation} · {defaults.department}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="rounded-xl border border-[#23302B] bg-[#0B0F0E]/85 px-3 py-1 font-mono font-medium text-[#A3B3AC]">
                  {defaults.employeeCode}
                </span>
                <span className="rounded-xl border border-[#2E8B57]/40 bg-[#1F5C3A]/30 px-3 py-1 font-medium text-[#4CAF7D]">
                  {displayRole}
                </span>
                <span className="rounded-xl border border-[#23302B] bg-[#0B0F0E]/85 px-3 py-1 text-[#A3B3AC]">
                  {displayUsername}
                </span>
              </div>
            </div>
          </div>

          {/* Photo Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#2E8B57] px-4 text-xs font-semibold text-[#F0F5F2] shadow-[0_6px_20px_-6px_rgba(46,139,87,0.55)] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:cursor-not-allowed disabled:opacity-60"
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

      {/* Aligned 2-Column Grid:
          Column 1: Professional Details (Read-Only) -> Personal Details (Editable)
          Column 2: Identity & Role -> Change Password */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Column 1 */}
        <div className="space-y-6 lg:col-span-7">
          {/* Professional Details (Read-Only) */}
          <section className="rounded-3xl border border-[#23302B] bg-[#131A17] p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold text-[#F0F5F2]">
                Professional Details
              </h3>
              <Lock className="h-4 w-4 text-[#6E8078]" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ReadOnlyField label="Designation" value={defaults.designation} icon={Briefcase} />
              <ReadOnlyField label="Department" value={defaults.department} icon={Network} />
              <ReadOnlyField label="Organization" value="BisTech" icon={Building2} />
              <ReadOnlyField label="Joining Date" value={defaults.joiningDate} icon={Calendar} />
              <ReadOnlyField label="Employee Code" value={defaults.employeeCode} icon={IdCard} />
              <ReadOnlyField label="Work Shift" value="09:00 AM · Asia/Dhaka" icon={Clock} />
            </div>
          </section>

          {/* Personal Details (Editable) */}
          <section className="rounded-3xl border border-[#23302B] bg-[#131A17] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-base font-semibold text-[#F0F5F2]">
                  Personal Details
                </h3>
                <p className="mt-0.5 text-xs text-[#A3B3AC]">
                  You can update your personal contact and emergency information
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePersonalDetails} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="personal-email"
                    className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#A3B3AC]"
                  >
                    <Mail className="h-3.5 w-3.5 text-[#4CAF7D]" />
                    <span>Personal Email</span>
                  </label>
                  <input
                    id="personal-email"
                    type="email"
                    value={personalDetails.personalEmail}
                    onChange={(e) => {
                      setPersonalDetails((p) => ({ ...p, personalEmail: e.target.value }));
                      setPersonalSavedNotice(false);
                    }}
                    placeholder="you@gmail.com"
                    className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] placeholder-[#6E8078] outline-none focus:border-[#4CAF7D]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="personal-phone"
                    className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#A3B3AC]"
                  >
                    <Phone className="h-3.5 w-3.5 text-[#4CAF7D]" />
                    <span>Personal Phone</span>
                  </label>
                  <input
                    id="personal-phone"
                    type="tel"
                    value={personalDetails.personalPhone}
                    onChange={(e) => {
                      setPersonalDetails((p) => ({ ...p, personalPhone: e.target.value }));
                      setPersonalSavedNotice(false);
                    }}
                    placeholder="+880 1XXX-XXXXXX"
                    className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] placeholder-[#6E8078] outline-none focus:border-[#4CAF7D]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="personal-dob"
                    className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#A3B3AC]"
                  >
                    <Calendar className="h-3.5 w-3.5 text-[#4CAF7D]" />
                    <span>Date of Birth</span>
                  </label>
                  <input
                    id="personal-dob"
                    type="date"
                    value={personalDetails.dateOfBirth}
                    onChange={(e) => {
                      setPersonalDetails((p) => ({ ...p, dateOfBirth: e.target.value }));
                      setPersonalSavedNotice(false);
                    }}
                    className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="personal-city"
                    className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#A3B3AC]"
                  >
                    <MapPin className="h-3.5 w-3.5 text-[#4CAF7D]" />
                    <span>City</span>
                  </label>
                  <input
                    id="personal-city"
                    type="text"
                    value={personalDetails.city}
                    onChange={(e) => {
                      setPersonalDetails((p) => ({ ...p, city: e.target.value }));
                      setPersonalSavedNotice(false);
                    }}
                    placeholder="Dhaka"
                    className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] placeholder-[#6E8078] outline-none focus:border-[#4CAF7D]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="personal-address"
                  className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                >
                  Address
                </label>
                <input
                  id="personal-address"
                  type="text"
                  value={personalDetails.addressLine}
                  onChange={(e) => {
                    setPersonalDetails((p) => ({ ...p, addressLine: e.target.value }));
                    setPersonalSavedNotice(false);
                  }}
                  placeholder="House, Road, Area"
                  className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] placeholder-[#6E8078] outline-none focus:border-[#4CAF7D]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="emergency-name"
                    className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                  >
                    Emergency Contact Name
                  </label>
                  <input
                    id="emergency-name"
                    type="text"
                    value={personalDetails.emergencyContactName}
                    onChange={(e) => {
                      setPersonalDetails((p) => ({
                        ...p,
                        emergencyContactName: e.target.value,
                      }));
                      setPersonalSavedNotice(false);
                    }}
                    placeholder="Contact person name"
                    className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] placeholder-[#6E8078] outline-none focus:border-[#4CAF7D]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="emergency-phone"
                    className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                  >
                    Emergency Contact Phone
                  </label>
                  <input
                    id="emergency-phone"
                    type="tel"
                    value={personalDetails.emergencyContactPhone}
                    onChange={(e) => {
                      setPersonalDetails((p) => ({
                        ...p,
                        emergencyContactPhone: e.target.value,
                      }));
                      setPersonalSavedNotice(false);
                    }}
                    placeholder="+880 1XXX-XXXXXX"
                    className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] placeholder-[#6E8078] outline-none focus:border-[#4CAF7D]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  {personalSavedNotice && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4CAF7D]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Personal details saved.</span>
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSavingPersonal}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#2E8B57] px-5 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:opacity-50"
                >
                  <span>Save Personal Details</span>
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Column 2: Identity & Role -> Change Password */}
        <div className="space-y-6 lg:col-span-5">
          {/* Identity & Role */}
          <section className="rounded-3xl border border-[#23302B] bg-[#131A17] p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold text-[#F0F5F2]">
                Identity &amp; Role
              </h3>
              <Lock className="h-4 w-4 text-[#6E8078]" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ReadOnlyField label="Full Name" value={displayName} icon={User} />
              <ReadOnlyField label="Username" value={displayUsername} icon={IdCard} />
              <ReadOnlyField label="Work Email" value={displayEmail} icon={Mail} />
              <ReadOnlyField label="Assigned Role" value={displayRole} icon={ShieldCheck} />
            </div>
          </section>

          {/* Change Password */}
          <section className="rounded-3xl border border-[#23302B] bg-[#131A17] p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#2E8B57]/40 bg-[#1F5C3A]/35 text-[#4CAF7D]">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-heading text-base font-semibold text-[#F0F5F2]">
                  Change Password
                </h3>
                <p className="text-xs text-[#A3B3AC]">
                  Update your account password securely
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="profile-current-password"
                  className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                >
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6E8078]" />
                  <input
                    id="profile-current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    required
                    className="h-11 w-full rounded-2xl border border-[#23302B] bg-[#0B0F0E] pr-10 pl-10 text-sm text-[#F0F5F2] placeholder-[#6E8078] outline-none focus:border-[#4CAF7D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    aria-label={
                      showCurrentPassword ? 'Hide current password' : 'Show current password'
                    }
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-[#6E8078] hover:text-[#F0F5F2]"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="profile-new-password"
                  className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                >
                  New Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6E8078]" />
                  <input
                    id="profile-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="h-11 w-full rounded-2xl border border-[#23302B] bg-[#0B0F0E] pr-10 pl-10 text-sm text-[#F0F5F2] placeholder-[#6E8078] outline-none focus:border-[#4CAF7D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-[#6E8078] hover:text-[#F0F5F2]"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="profile-confirm-password"
                  className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6E8078]" />
                  <input
                    id="profile-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="h-11 w-full rounded-2xl border border-[#23302B] bg-[#0B0F0E] pr-10 pl-10 text-sm text-[#F0F5F2] placeholder-[#6E8078] outline-none focus:border-[#4CAF7D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={
                      showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                    }
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-[#6E8078] hover:text-[#F0F5F2]"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[#23302B] bg-[#0B0F0E]/75 px-3.5 py-2.5 text-[11px] text-[#A3B3AC]">
                Must be at least 8 characters and cannot contain your name or email.
              </div>

              {passwordError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-2xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-3.5 py-2.5 text-xs text-[#FCA5A5]"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#EF4444]" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-2xl border border-[#2E8B57]/40 bg-[#1F5C3A]/35 px-3.5 py-2.5 text-xs font-medium text-[#4CAF7D]"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#2E8B57] px-5 text-xs font-semibold text-[#F0F5F2] shadow-[0_6px_20px_-6px_rgba(46,139,87,0.55)] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </form>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
