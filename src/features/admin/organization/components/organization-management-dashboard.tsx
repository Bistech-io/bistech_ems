'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Plus,
  ShieldCheck,
  ShieldOff,
  Snowflake,
  Sun,
  Wifi,
  X,
} from 'lucide-react';
import {
  fetchOrganizationSettings,
  patchOrganizationSettings,
} from '@/features/attendance/api';
import type { OrganizationShiftSettings } from '@/features/attendance/types';
import { ApiError, getErrorMessageForCode } from '@/lib/api/errors';
import { can } from '@/lib/auth/permissions';
import { useAuth } from '@/providers/auth-provider';

const EASE = [0.22, 1, 0.36, 1] as const;

const IP_SECURITY_ROLES = new Set(['super_admin', 'admin', 'hr_manager', 'hr']);

const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

function isValidClientIpOrCidr(raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;
  const slashIdx = value.indexOf('/');
  const ipPart = slashIdx === -1 ? value : value.slice(0, slashIdx);
  const prefixPart = slashIdx === -1 ? null : value.slice(slashIdx + 1);

  if (prefixPart !== null && !/^\d+$/.test(prefixPart)) {
    return false;
  }

  if (IPV4_REGEX.test(ipPart)) {
    if (prefixPart === null) return true;
    const prefix = Number(prefixPart);
    return prefix >= 0 && prefix <= 32;
  }

  // Basic IPv6 syntax validation (backend performs authoritative net.isIP check)
  if (ipPart.includes(':') && /^[0-9a-fA-F:]+$/.test(ipPart)) {
    if (prefixPart === null) return true;
    const prefix = Number(prefixPart);
    return prefix >= 0 && prefix <= 128;
  }

  return false;
}

function format24hTo12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr ?? 0);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function OrganizationManagementDashboard() {
  const { user, activeRole } = useAuth();
  const [settings, setSettings] = useState<OrganizationShiftSettings | null>(null);
  const [workStart, setWorkStart] = useState('');
  const [workEnd, setWorkEnd] = useState('');
  const [graceMinutes, setGraceMinutes] = useState('15');
  const [timezone, setTimezone] = useState('Asia/Dhaka');

  // Office Network IP Security state
  const [allowedOfficeIps, setAllowedOfficeIps] = useState<string[]>([]);
  const [ipInput, setIpInput] = useState('');
  const [currentIp, setCurrentIp] = useState<string | null>(null);
  const [isSavingIps, setIsSavingIps] = useState(false);
  const [ipSaveMessage, setIpSaveMessage] = useState<string | null>(null);
  const [ipErrorMessage, setIpErrorMessage] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canManageOfficeIps = useMemo(() => {
    const roles = user?.roles ?? (activeRole ? [activeRole] : []);
    if (roles.some((r) => IP_SECURITY_ROLES.has(r.trim().toLowerCase()))) {
      return true;
    }
    return can(user, 'org.settings.manage', 'org');
  }, [user, activeRole]);

  useEffect(() => {
    let cancelled = false;
    fetchOrganizationSettings()
      .then((data) => {
        if (cancelled) return;
        setSettings(data);
        setWorkStart(data.workStart);
        setWorkEnd(data.workEnd);
        setGraceMinutes(String(data.graceMinutes));
        setTimezone(data.timezone);
        setAllowedOfficeIps(data.allowedOfficeIps ?? []);
        setCurrentIp(data.currentIp ?? null);
      })
      .catch(() => {
        // Keep defaults if settings endpoint fails
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    const handleShiftUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<OrganizationShiftSettings>;
      if (customEvent.detail) {
        const data = customEvent.detail;
        setSettings(data);
        setWorkStart(data.workStart);
        setWorkEnd(data.workEnd);
        setGraceMinutes(String(data.graceMinutes));
        setTimezone(data.timezone);
        if (Array.isArray(data.allowedOfficeIps)) {
          setAllowedOfficeIps(data.allowedOfficeIps);
        }
        if (data.currentIp !== undefined) {
          setCurrentIp(data.currentIp ?? null);
        }
      }
    };

    window.addEventListener('ems:shift-updated', handleShiftUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener('ems:shift-updated', handleShiftUpdated);
    };
  }, []);

  function applyPreset(start: string, end: string) {
    setWorkStart(start);
    setWorkEnd(end);
    setSaveMessage(null);
    setErrorMessage(null);
  }

  function handleAddOfficeIp(rawIp?: string) {
    const candidate = (rawIp ?? ipInput).trim();
    setIpErrorMessage(null);
    setIpSaveMessage(null);

    if (!candidate) {
      setIpErrorMessage('Please enter an IPv4, IPv6, or CIDR address (e.g. 203.0.113.10).');
      return;
    }

    if (!isValidClientIpOrCidr(candidate)) {
      setIpErrorMessage(
        'Invalid IP address or CIDR range. Example: 203.0.113.10 or 203.0.113.0/24.',
      );
      return;
    }

    if (allowedOfficeIps.includes(candidate)) {
      setIpErrorMessage(`${candidate} is already in the office IP allowlist.`);
      return;
    }

    if (allowedOfficeIps.length >= 50) {
      setIpErrorMessage('You can configure at most 50 office IP addresses.');
      return;
    }

    setAllowedOfficeIps((prev) => [...prev, candidate]);
    if (!rawIp) {
      setIpInput('');
    }
  }

  function handleRemoveOfficeIp(ipToRemove: string) {
    setIpErrorMessage(null);
    setIpSaveMessage(null);
    setAllowedOfficeIps((prev) => prev.filter((ip) => ip !== ipToRemove));
  }

  async function handleSaveOfficeIps(e: FormEvent) {
    e.preventDefault();
    if (isSavingIps || !canManageOfficeIps) return;

    setIpErrorMessage(null);
    setIpSaveMessage(null);

    // If user typed an IP in the input box and clicked Save directly, validate and include it
    let nextIps = [...allowedOfficeIps];
    const pendingInput = ipInput.trim();
    if (pendingInput) {
      if (!isValidClientIpOrCidr(pendingInput)) {
        setIpErrorMessage(
          'Invalid IP address or CIDR range. Example: 203.0.113.10 or 203.0.113.0/24.',
        );
        return;
      }
      if (!nextIps.includes(pendingInput)) {
        nextIps = [...nextIps, pendingInput];
      }
    }

    setIsSavingIps(true);
    try {
      const updated = await patchOrganizationSettings({
        allowedOfficeIps: nextIps,
      });
      const savedIps = updated.allowedOfficeIps ?? nextIps;
      setSettings(updated);
      setAllowedOfficeIps(savedIps);
      setIpInput('');
      setIpSaveMessage(
        savedIps.length > 0
          ? `Office IP restriction active (${savedIps.length} allowed ${savedIps.length === 1 ? 'entry' : 'entries'}). Outside-office check-in/check-out is now blocked.`
          : 'Office IP allowlist cleared. Check-in/check-out is currently unrestricted.',
      );
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details && err.details.length > 0) {
          setIpErrorMessage(err.details.map((d) => d.message).join('. '));
        } else {
          setIpErrorMessage(err.message || getErrorMessageForCode(err.code));
        }
      } else {
        setIpErrorMessage('Unable to update office IP allowlist.');
      }
    } finally {
      setIsSavingIps(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (isSaving) return;

    setSaveMessage(null);
    setErrorMessage(null);

    if (workStart >= workEnd) {
      setErrorMessage('Shift end time must be after shift start time.');
      return;
    }

    const trimmedTz = timezone.trim() || 'Asia/Dhaka';
    try {
      Intl.DateTimeFormat(undefined, { timeZone: trimmedTz });
    } catch {
      setErrorMessage('Please enter a valid IANA timezone (e.g. Asia/Dhaka, UTC).');
      return;
    }

    setIsSaving(true);

    const payload: OrganizationShiftSettings = {
      timezone: trimmedTz,
      workStart,
      workEnd,
      graceMinutes: Math.max(0, Math.min(180, Number(graceMinutes) || 0)),
    };

    try {
      const updated = await patchOrganizationSettings(payload);
      setSettings(updated);
      setWorkStart(updated.workStart);
      setWorkEnd(updated.workEnd);
      setGraceMinutes(String(updated.graceMinutes));
      setTimezone(updated.timezone);
      setSaveMessage(
        `Shift schedule updated to ${format24hTo12h(updated.workStart)} – ${format24hTo12h(updated.workEnd)}.`,
      );
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details && err.details.length > 0) {
          setErrorMessage(err.details.map((d) => d.message).join('. '));
        } else {
          setErrorMessage(err.message || getErrorMessageForCode(err.code));
        }
      } else {
        setErrorMessage('Unable to update organization shift settings.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="space-y-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#23302B] pb-5">
        <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-[#F0F5F2] md:text-3xl">
          Organization Management
        </h1>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-[#23302B] bg-[#131A17] px-4 py-2 text-xs">
          <Clock className="h-4 w-4 text-[#4CAF7D]" />
          <span className="text-[#A3B3AC]">Active Shift:</span>
          <strong className="text-[#F0F5F2]">
            {settings
              ? `${format24hTo12h(settings.workStart)} – ${format24hTo12h(settings.workEnd)} · ${settings.graceMinutes}m grace`
              : '—'}
          </strong>
        </div>
      </header>

      {isLoading ? (
        <div className="flex h-56 items-center justify-center rounded-3xl border border-[#23302B] bg-[#131A17]">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#23302B] border-t-[#4CAF7D]" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Dynamic Shift Schedule Form */}
          <section className="rounded-3xl border border-[#23302B] bg-[#131A17] p-6 lg:col-span-7">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#2E8B57]/40 bg-[#1F5C3A]/35 text-[#4CAF7D]">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-heading text-lg font-semibold text-[#F0F5F2]">
                  Dynamic Work Shift Settings
                </h2>
                <p className="text-xs text-[#A3B3AC]">
                  Changes apply immediately across attendance check-ins, stopwatches, and status calculation.
                </p>
              </div>
            </div>

            {/* Seasonal Quick Presets */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => applyPreset('10:00', '18:00')}
                className="flex items-center justify-between rounded-2xl border border-[#23302B] bg-[#0B0F0E]/80 px-4 py-3 text-left transition-colors hover:border-[#2E8B57]"
              >
                <div>
                  <p className="text-xs font-semibold text-[#F0F5F2]">Standard / Summer Shift</p>
                  <p className="mt-0.5 text-[11px] text-[#A3B3AC]">10:00 AM – 06:00 PM</p>
                </div>
                <Sun className="h-4 w-4 text-[#F59E0B]" />
              </button>

              <button
                type="button"
                onClick={() => applyPreset('09:00', '17:00')}
                className="flex items-center justify-between rounded-2xl border border-[#23302B] bg-[#0B0F0E]/80 px-4 py-3 text-left transition-colors hover:border-[#2E8B57]"
              >
                <div>
                  <p className="text-xs font-semibold text-[#F0F5F2]">Winter Shift</p>
                  <p className="mt-0.5 text-[11px] text-[#A3B3AC]">09:00 AM – 05:00 PM</p>
                </div>
                <Snowflake className="h-4 w-4 text-[#38BDF8]" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="org-work-start"
                    className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                  >
                    Shift Start Time
                  </label>
                  <input
                    id="org-work-start"
                    type="time"
                    value={workStart}
                    onChange={(e) => setWorkStart(e.target.value)}
                    required
                    className="h-11 w-full rounded-2xl border border-[#23302B] bg-[#0B0F0E] px-3.5 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="org-work-end"
                    className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                  >
                    Shift End Time
                  </label>
                  <input
                    id="org-work-end"
                    type="time"
                    value={workEnd}
                    onChange={(e) => setWorkEnd(e.target.value)}
                    required
                    className="h-11 w-full rounded-2xl border border-[#23302B] bg-[#0B0F0E] px-3.5 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="org-grace-minutes"
                    className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                  >
                    Late Grace Period (Minutes)
                  </label>
                  <input
                    id="org-grace-minutes"
                    type="number"
                    min={0}
                    max={180}
                    value={graceMinutes}
                    onChange={(e) => setGraceMinutes(e.target.value)}
                    required
                    className="h-11 w-full rounded-2xl border border-[#23302B] bg-[#0B0F0E] px-3.5 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="org-timezone"
                    className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                  >
                    Organization Timezone
                  </label>
                  <div className="relative">
                    <Globe className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6E8078]" />
                    <input
                      id="org-timezone"
                      type="text"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      required
                      className="h-11 w-full rounded-2xl border border-[#23302B] bg-[#0B0F0E] pr-3.5 pl-10 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    />
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-2xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-3 text-xs text-[#FCA5A5]"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#EF4444]" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {saveMessage && (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-2xl border border-[#2E8B57]/40 bg-[#1F5C3A]/35 px-4 py-3 text-xs font-medium text-[#4CAF7D]"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{saveMessage}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#2E8B57] px-6 text-xs font-semibold text-[#F0F5F2] shadow-[0_6px_20px_-6px_rgba(46,139,87,0.55)] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Save Shift Schedule</span>
                </button>
              </div>
            </form>
          </section>

          {/* Current Policy Summary */}
          <section className="rounded-3xl border border-[#23302B] bg-[#131A17] p-6 lg:col-span-5">
            <h2 className="font-heading text-base font-semibold text-[#F0F5F2]">
              Active Schedule Summary
            </h2>
            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 p-4">
                <span className="text-[#6E8078]">Shift Window</span>
                <p className="mt-1 font-heading text-lg font-bold text-[#F0F5F2]">
                  {settings
                    ? `${format24hTo12h(settings.workStart)} – ${format24hTo12h(settings.workEnd)}`
                    : '—'}
                </p>
              </div>
              <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 p-4">
                <span className="text-[#6E8078]">Grace Period</span>
                <p className="mt-1 font-heading text-lg font-bold text-[#4CAF7D]">
                  {settings ? `${settings.graceMinutes} minutes` : '—'}
                </p>
              </div>
              <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 p-4">
                <span className="text-[#6E8078]">Timezone</span>
                <p className="mt-1 text-sm font-semibold text-[#F0F5F2]">
                  {settings?.timezone ?? '—'}
                </p>
              </div>
              <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 p-4">
                <span className="text-[#6E8078]">Office IP Security</span>
                <div className="mt-1.5 flex items-center gap-2">
                  {(settings?.allowedOfficeIps?.length ?? 0) > 0 ||
                  settings?.ipRestrictionEnabled ? (
                    <>
                      <ShieldCheck className="h-4 w-4 text-[#4CAF7D]" />
                      <p className="text-sm font-semibold text-[#4CAF7D]">
                        Protected ({settings?.allowedOfficeIps?.length ?? 0} allowed{' '}
                        {(settings?.allowedOfficeIps?.length ?? 0) === 1 ? 'IP' : 'IPs'})
                      </p>
                    </>
                  ) : (
                    <>
                      <ShieldOff className="h-4 w-4 text-[#F59E0B]" />
                      <p className="text-sm font-semibold text-[#F59E0B]">
                        Unrestricted (Any Network)
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Office Network IP Security Card (Super Admin, Admin, HR Manager only) */}
          {canManageOfficeIps && (
            <section className="rounded-3xl border border-[#23302B] bg-[#131A17] p-6 lg:col-span-12">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#2E8B57]/40 bg-[#1F5C3A]/35 text-[#4CAF7D]">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-[#F0F5F2]">
                      Office Network IP Security
                    </h2>
                    <p className="text-xs text-[#A3B3AC]">
                      Restrict attendance Check In &amp; Check Out strictly to approved office public IP addresses or CIDR ranges. Accessible only to Super Admin, Admin, and HR.
                    </p>
                  </div>
                </div>

                <span
                  className={
                    allowedOfficeIps.length > 0
                      ? 'inline-flex items-center gap-1.5 rounded-full border border-[#2E8B57]/40 bg-[#1F5C3A]/35 px-3 py-1 text-xs font-semibold text-[#4CAF7D]'
                      : 'inline-flex items-center gap-1.5 rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3 py-1 text-xs font-semibold text-[#F59E0B]'
                  }
                >
                  {allowedOfficeIps.length > 0 ? (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Enforcement Active ({allowedOfficeIps.length})
                    </>
                  ) : (
                    <>
                      <ShieldOff className="h-3.5 w-3.5" />
                      Unrestricted
                    </>
                  )}
                </span>
              </div>

              {currentIp && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#23302B] bg-[#0B0F0E]/80 px-4 py-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Wifi className="h-4 w-4 text-[#4CAF7D]" />
                    <span className="text-[#A3B3AC]">Your Detected Office IP:</span>
                    <code className="rounded-lg border border-[#23302B] bg-[#131A17] px-2.5 py-0.5 font-mono text-xs font-semibold text-[#F0F5F2]">
                      {currentIp}
                    </code>
                  </div>
                  <button
                    type="button"
                    disabled={allowedOfficeIps.includes(currentIp)}
                    onClick={() => handleAddOfficeIp(currentIp)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#2E8B57]/50 bg-[#1F5C3A]/30 px-3 py-1.5 text-xs font-semibold text-[#4CAF7D] transition-colors hover:bg-[#2E8B57] hover:text-[#F0F5F2] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {allowedOfficeIps.includes(currentIp)
                      ? 'Current IP Added'
                      : 'Add Current IP'}
                  </button>
                </div>
              )}

              <form onSubmit={handleSaveOfficeIps} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="org-office-ip-input"
                    className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                  >
                    Add Office IP Address or CIDR Range
                  </label>
                  <div className="flex flex-col gap-2.5 sm:flex-row">
                    <input
                      id="org-office-ip-input"
                      type="text"
                      value={ipInput}
                      onChange={(e) => {
                        setIpInput(e.target.value);
                        setIpErrorMessage(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddOfficeIp();
                        }
                      }}
                      placeholder="e.g. 203.0.113.42 or 203.0.113.0/24"
                      className="h-11 flex-1 rounded-2xl border border-[#23302B] bg-[#0B0F0E] px-4 font-mono text-sm text-[#F0F5F2] placeholder-[#6E8078] outline-none focus:border-[#4CAF7D]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddOfficeIp()}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-[#2E8B57] bg-[#1F5C3A]/35 px-5 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#2E8B57]"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add IP</span>
                    </button>
                  </div>
                </div>

                {/* Configured Allowed IPs List */}
                <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/60 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[#6E8078]">
                    Allowed Office Networks ({allowedOfficeIps.length})
                  </p>
                  {allowedOfficeIps.length === 0 ? (
                    <p className="mt-2 text-xs text-[#A3B3AC]">
                      No office IPs configured yet. Add your office router&apos;s public IP address above and click <strong className="text-[#F0F5F2]">Save Office IPs</strong> to block off-site check-in and check-out attempts.
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {allowedOfficeIps.map((ip) => (
                        <span
                          key={ip}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#2E8B57]/40 bg-[#131A17] px-3 py-1.5 font-mono text-xs text-[#F0F5F2]"
                        >
                          <Wifi className="h-3.5 w-3.5 text-[#4CAF7D]" />
                          <span>{ip}</span>
                          <button
                            type="button"
                            aria-label={`Remove IP ${ip}`}
                            onClick={() => handleRemoveOfficeIp(ip)}
                            className="rounded-md p-0.5 text-[#A3B3AC] transition-colors hover:bg-[#EF4444]/15 hover:text-[#FCA5A5]"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {ipErrorMessage && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-2xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-3 text-xs text-[#FCA5A5]"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-[#EF4444]" />
                    <span>{ipErrorMessage}</span>
                  </div>
                )}

                {ipSaveMessage && (
                  <div
                    role="status"
                    className="flex items-center gap-2 rounded-2xl border border-[#2E8B57]/40 bg-[#1F5C3A]/35 px-4 py-3 text-xs font-medium text-[#4CAF7D]"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{ipSaveMessage}</span>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSavingIps}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#2E8B57] px-6 text-xs font-semibold text-[#F0F5F2] shadow-[0_6px_20px_-6px_rgba(46,139,87,0.55)] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:opacity-50"
                  >
                    {isSavingIps && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Save Office IPs</span>
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      )}
    </motion.div>
  );
}
