'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Snowflake,
  Sun,
} from 'lucide-react';
import {
  fetchOrganizationSettings,
  patchOrganizationSettings,
} from '@/features/attendance/api';
import type { OrganizationShiftSettings } from '@/features/attendance/types';
import { ApiError, getErrorMessageForCode } from '@/lib/api/errors';

const EASE = [0.22, 1, 0.36, 1] as const;

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
  const [settings, setSettings] = useState<OrganizationShiftSettings | null>(null);
  const [workStart, setWorkStart] = useState('');
  const [workEnd, setWorkEnd] = useState('');
  const [graceMinutes, setGraceMinutes] = useState('15');
  const [timezone, setTimezone] = useState('Asia/Dhaka');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
            </div>
          </section>
        </div>
      )}
    </motion.div>
  );
}
