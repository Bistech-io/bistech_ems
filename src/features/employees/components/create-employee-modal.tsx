'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Loader2, UserPlus, X } from 'lucide-react';
import { ApiError, getErrorMessageForCode } from '@/lib/api/errors';
import { createDesignation, createEmployee } from '../api';
import type {
  CreateEmployeePayload,
  DepartmentOption,
  DesignationOption,
  EmployeeItem,
  EmploymentType,
} from '../types';

const EASE = [0.22, 1, 0.36, 1] as const;

interface CreateEmployeeModalProps {
  open: boolean;
  departments: DepartmentOption[];
  designations: DesignationOption[];
  onClose: () => void;
  onCreated: (employee: EmployeeItem) => void;
  onDesignationCreated?: (designation: DesignationOption) => void;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `emp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function CreateEmployeeModal({
  open,
  departments,
  designations,
  onClose,
  onCreated,
  onDesignationCreated,
}: CreateEmployeeModalProps) {
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Core TAD / FSD fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designationTitle, setDesignationTitle] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full_time');
  const [joiningDate, setJoiningDate] = useState('2026-11-22');

  // Optional personal profile fields (TAD / FSD section 2.3)
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [personalPhone, setPersonalPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [countryCode, setCountryCode] = useState('BD');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('');

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setIdempotencyKey(generateIdempotencyKey());
      setErrorMessage(null);
      const today = new Date().toISOString().slice(0, 10);
      setJoiningDate(today);
      if (departments[0] && !departmentId) setDepartmentId(departments[0].id);
    }, 0);
    return () => clearTimeout(timer);
  }, [open, departments, departmentId]);

  function resetForm() {
    setFirstName('');
    setLastName('');
    setWorkEmail('');
    setUsername('');
    setPassword('');
    setPhone('');
    setDesignationTitle('');
    setEmploymentType('full_time');
    setDateOfBirth('');
    setPersonalEmail('');
    setPersonalPhone('');
    setAddressLine('');
    setCity('');
    setCountryCode('BD');
    setEmergencyContactName('');
    setEmergencyContactPhone('');
    setEmergencyContactRelation('');
    setErrorMessage(null);
  }

  async function resolveDesignationId(typedTitle: string): Promise<string> {
    const normalized = typedTitle.trim().toLowerCase();
    const matched = designations.find(
      (d) => d.title.trim().toLowerCase() === normalized,
    );
    if (matched) return matched.id;

    const createdDesig = await createDesignation(typedTitle.trim());
    onDesignationCreated?.(createdDesig);
    return createdDesig.id;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedDesignation = designationTitle.trim();
    if (!departmentId || !trimmedDesignation) {
      setErrorMessage('Please select a department and enter a designation.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    let resolvedDesignationId: string;
    try {
      resolvedDesignationId = await resolveDesignationId(trimmedDesignation);
    } catch (err) {
      setIsSubmitting(false);
      if (err instanceof ApiError) {
        setErrorMessage(err.message || 'Failed to create new designation.');
      } else {
        setErrorMessage('Failed to create or verify designation. Please check your network and try again.');
      }
      return;
    }

    if (!resolvedDesignationId) {
      setErrorMessage('No designation available in organization.');
      setIsSubmitting(false);
      return;
    }

    const hasPersonalFields = Boolean(
      dateOfBirth ||
        personalEmail.trim() ||
        personalPhone.trim() ||
        addressLine.trim() ||
        city.trim() ||
        emergencyContactName.trim() ||
        emergencyContactPhone.trim() ||
        emergencyContactRelation.trim(),
    );

    const payload: CreateEmployeePayload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      workEmail: workEmail.trim(),
      ...(username.trim() ? { username: username.trim().toLowerCase() } : {}),
      ...(password ? { password } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      departmentId,
      designationId: resolvedDesignationId,
      employmentType,
      joiningDate,
      ...(hasPersonalFields
        ? {
            personalProfile: {
              ...(dateOfBirth ? { dateOfBirth } : {}),
              ...(personalEmail.trim() ? { personalEmail: personalEmail.trim() } : {}),
              ...(personalPhone.trim() ? { personalPhone: personalPhone.trim() } : {}),
              ...(addressLine.trim() ? { addressLine: addressLine.trim() } : {}),
              ...(city.trim() ? { city: city.trim() } : {}),
              ...(countryCode.trim().length === 2
                ? { countryCode: countryCode.trim().toUpperCase() }
                : {}),
              ...(emergencyContactName.trim()
                ? { emergencyContactName: emergencyContactName.trim() }
                : {}),
              ...(emergencyContactPhone.trim()
                ? { emergencyContactPhone: emergencyContactPhone.trim() }
                : {}),
              ...(emergencyContactRelation.trim()
                ? { emergencyContactRelation: emergencyContactRelation.trim() }
                : {}),
            },
          }
        : {}),
    };

    try {
      const created = await createEmployee(payload, idempotencyKey || generateIdempotencyKey());
      const withTypedDesignation: EmployeeItem = {
        ...created,
        designation: {
          ...created.designation,
          title: trimmedDesignation,
        },
      };
      resetForm();
      onCreated(withTypedDesignation);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details.length > 0) {
          setErrorMessage(
            err.details.map((d) => `${d.field}: ${d.message}`).join(' · '),
          );
        } else {
          setErrorMessage(err.message || getErrorMessageForCode(err.code));
        }
      } else {
        setErrorMessage('Failed to create employee. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
        >
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[#23302B] bg-[#131A17] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#23302B] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F5C3A]/40 text-[#4CAF7D]">
                  <UserPlus className="h-4 w-4" />
                </span>
                <h2 className="font-heading text-lg font-bold text-[#F0F5F2]">
                  New Employee
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="rounded-xl p-1.5 text-[#A3B3AC] transition-colors hover:bg-[#1A2420] hover:text-[#F0F5F2]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="sidebar-scroll flex-1 space-y-6 overflow-y-auto p-6">
              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-2xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-3 text-xs text-[#FCA5A5]"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Section 1: Work Identity */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold tracking-[0.06em] text-[#4CAF7D] uppercase">
                  Work Identity
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="emp-first-name"
                      className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                    >
                      First Name *
                    </label>
                    <input
                      id="emp-first-name"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="emp-last-name"
                      className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                    >
                      Last Name *
                    </label>
                    <input
                      id="emp-last-name"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="emp-work-email"
                      className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                    >
                      Work Email *
                    </label>
                    <input
                      id="emp-work-email"
                      type="email"
                      required
                      value={workEmail}
                      onChange={(e) => setWorkEmail(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="emp-phone"
                      className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                    >
                      Work Phone
                    </label>
                    <input
                      id="emp-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="emp-username"
                      className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                    >
                      Username
                    </label>
                    <input
                      id="emp-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="emp-password"
                      className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                    >
                      Initial Password <span className="text-[#6E8078]">(one-time use)</span>
                    </label>
                    <input
                      id="emp-password"
                      type="password"
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Assignment & Employment */}
              <div className="space-y-3 border-t border-[#23302B] pt-5">
                <h3 className="text-xs font-semibold tracking-[0.06em] text-[#4CAF7D] uppercase">
                  Department &amp; Employment
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="emp-department"
                      className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                    >
                      Department *
                    </label>
                    <select
                      id="emp-department"
                      required
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    >
                      <option value="">Select department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="emp-designation-input"
                      className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                    >
                      Designation *
                    </label>
                    <input
                      id="emp-designation-input"
                      type="text"
                      required
                      list="designations-datalist"
                      placeholder="Select or type a designation"
                      value={designationTitle}
                      onChange={(e) => setDesignationTitle(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    />
                    <datalist id="designations-datalist">
                      {designations.map((d) => (
                        <option key={d.id} value={d.title} />
                      ))}
                    </datalist>
                    <p className="mt-1 text-[11px] text-[#6E8078]">
                      Pick an existing title or type a new one to create it.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="emp-type"
                      className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                    >
                      Employment Type *
                    </label>
                    <select
                      id="emp-type"
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    >
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="emp-joining-date"
                      className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                    >
                      Joining Date *
                    </label>
                    <input
                      id="emp-joining-date"
                      type="date"
                      required
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Personal & Emergency Profile (Optional per TAD/FSD) */}
              <div className="space-y-3 border-t border-[#23302B] pt-5">
                <h3 className="text-xs font-semibold tracking-[0.06em] text-[#4CAF7D] uppercase">
                  Personal Profile (Optional)
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="emp-dob"
                      className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                    >
                      Date of Birth
                    </label>
                    <input
                      id="emp-dob"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="emp-personal-email"
                      className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                    >
                      Personal Email
                    </label>
                    <input
                      id="emp-personal-email"
                      type="email"
                      value={personalEmail}
                      onChange={(e) => setPersonalEmail(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="emp-personal-phone"
                      className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                    >
                      Personal Phone
                    </label>
                    <input
                      id="emp-personal-phone"
                      type="tel"
                      value={personalPhone}
                      onChange={(e) => setPersonalPhone(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="emp-address"
                      className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                    >
                      Address Line
                    </label>
                    <input
                      id="emp-address"
                      type="text"
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="emp-city"
                      className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                    >
                      City
                    </label>
                    <input
                      id="emp-city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="emp-emg-name"
                      className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                    >
                      Emergency Contact Name
                    </label>
                    <input
                      id="emp-emg-name"
                      type="text"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="emp-emg-phone"
                      className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                    >
                      Emergency Contact Phone
                    </label>
                    <input
                      id="emp-emg-phone"
                      type="tel"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="emp-emg-rel"
                      className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                    >
                      Relation
                    </label>
                    <input
                      id="emp-emg-rel"
                      type="text"
                      value={emergencyContactRelation}
                      onChange={(e) => setEmergencyContactRelation(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-[#23302B] px-6 py-4">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="rounded-xl border border-[#23302B] px-4 py-2 text-xs font-medium text-[#A3B3AC] transition-colors hover:bg-[#1A2420] hover:text-[#F0F5F2]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2E8B57] px-5 py-2 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Employee</span>
                )}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
