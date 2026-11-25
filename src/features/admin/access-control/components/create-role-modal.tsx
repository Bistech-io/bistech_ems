'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Check,
  Loader2,
  Search,
  ShieldPlus,
  X,
} from 'lucide-react';
import { SCOPE_LEVELS, type ScopeLevel } from '@ems/contracts';
import { ApiError } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import { createCustomRole } from '../api';
import {
  PERMISSION_CATEGORIES,
  SCOPE_LABELS,
  slugifyRoleName,
  type AccessControlRole,
  type PermissionCatalogItem,
  type PermissionCategory,
} from '../types';

const EASE = [0.22, 1, 0.36, 1] as const;

interface CreateRoleModalProps {
  open: boolean;
  existingRoleNames: string[];
  permissionCatalog: PermissionCatalogItem[];
  onClose: () => void;
  onRoleCreated: (role: AccessControlRole, syncedWithServer: boolean) => void;
}

export function CreateRoleModal({
  open,
  existingRoleNames,
  permissionCatalog,
  onClose,
  onRoleCreated,
}: CreateRoleModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<
    Record<string, ScopeLevel>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const normalizedSlug = useMemo(() => slugifyRoleName(displayName), [displayName]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isSubmitting, onClose]);

  const groupedPermissions = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();
    const groups = new Map<PermissionCategory, PermissionCatalogItem[]>();

    for (const cat of PERMISSION_CATEGORIES) {
      groups.set(cat, []);
    }

    for (const item of permissionCatalog) {
      if (
        query &&
        !item.label.toLowerCase().includes(query) &&
        !item.key.toLowerCase().includes(query) &&
        !item.description.toLowerCase().includes(query) &&
        !item.category.toLowerCase().includes(query)
      ) {
        continue;
      }
      const list = groups.get(item.category) ?? [];
      list.push(item);
      groups.set(item.category, list);
    }

    return Array.from(groups.entries()).filter(([, items]) => items.length > 0);
  }, [permissionCatalog, permissionSearch]);

  const selectedCount = Object.keys(selectedPermissions).length;

  function togglePermission(item: PermissionCatalogItem) {
    setSelectedPermissions((prev) => {
      const next = { ...prev };
      if (next[item.key]) {
        delete next[item.key];
      } else {
        next[item.key] = item.defaultScope;
      }
      return next;
    });
  }

  function updatePermissionScope(key: string, scope: ScopeLevel) {
    setSelectedPermissions((prev) => {
      if (!prev[key]) return prev;
      return { ...prev, [key]: scope };
    });
  }

  function toggleCategory(items: PermissionCatalogItem[]) {
    const allSelected = items.every((item) => Boolean(selectedPermissions[item.key]));
    setSelectedPermissions((prev) => {
      const next = { ...prev };
      for (const item of items) {
        if (allSelected) {
          delete next[item.key];
        } else if (!next[item.key]) {
          next[item.key] = item.defaultScope;
        }
      }
      return next;
    });
  }

  function handleSelectAll() {
    const next: Record<string, ScopeLevel> = {};
    for (const item of permissionCatalog) {
      next[item.key] = selectedPermissions[item.key] ?? item.defaultScope;
    }
    setSelectedPermissions(next);
  }

  function handleClearAll() {
    setSelectedPermissions({});
  }

  function resetAndClose() {
    setDisplayName('');
    setDescription('');
    setPermissionSearch('');
    setSelectedPermissions({});
    setErrorMessage(null);
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!displayName.trim()) {
      setErrorMessage('Please enter a role name.');
      return;
    }

    if (!normalizedSlug || normalizedSlug.length < 2) {
      setErrorMessage('Role name must contain at least 2 alphanumeric characters.');
      return;
    }

    if (
      existingRoleNames.some(
        (existing) => existing.toLowerCase() === normalizedSlug.toLowerCase(),
      )
    ) {
      setErrorMessage(`A role with key "${normalizedSlug}" already exists.`);
      return;
    }

    if (selectedCount === 0) {
      setErrorMessage('Select at least one permission to grant to this role.');
      return;
    }

    setIsSubmitting(true);
    try {
      const permissionsPayload = Object.entries(selectedPermissions).map(
        ([key, scope]) => ({ key, scope }),
      );

      const { role, syncedWithServer } = await createCustomRole({
        name: normalizedSlug,
        displayName: displayName.trim(),
        description: description.trim() || undefined,
        permissions: permissionsPayload,
      });

      onRoleCreated(role, syncedWithServer);
      resetAndClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || 'Could not create custom role.');
      } else {
        setErrorMessage('Could not create custom role. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Create custom role"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !isSubmitting && onClose()}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#23302B] bg-[#131A17] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#23302B] px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#2E8B57]/40 bg-[#1F5C3A]/35 text-[#4CAF7D]">
                  <ShieldPlus className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-heading text-lg font-bold text-[#F0F5F2]">
                    Create Custom Role
                  </h2>
                  <p className="text-xs text-[#A3B3AC]">
                    Define a new organization role and check the permissions to grant.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isSubmitting && onClose()}
                aria-label="Close create role modal"
                className="rounded-xl p-1.5 text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                {errorMessage && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-2xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-3 text-xs text-[#EF4444]"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Role Name & Description */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="custom-role-name"
                      className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                    >
                      Role Name <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      id="custom-role-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Finance Auditor"
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3.5 text-sm text-[#F0F5F2] placeholder-[#6E8078] focus:border-[#4CAF7D] focus:outline-none"
                    />
                    {normalizedSlug && (
                      <p className="mt-1.5 text-[11px] text-[#6E8078]">
                        Role key:{' '}
                        <code className="rounded bg-[#1A2420] px-1.5 py-0.5 font-mono text-[#4CAF7D]">
                          {normalizedSlug}
                        </code>
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="custom-role-description"
                      className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                    >
                      Description
                    </label>
                    <input
                      id="custom-role-description"
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Short summary of responsibilities"
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3.5 text-sm text-[#F0F5F2] placeholder-[#6E8078] focus:border-[#4CAF7D] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Permissions Checklist Section */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A3B3AC]">
                        Permissions Checklist
                      </h3>
                      <p className="mt-0.5 text-[11px] text-[#6E8078]">
                        Selected permissions are granted to this role ({selectedCount} of{' '}
                        {permissionCatalog.length} selected)
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="rounded-lg border border-[#23302B] bg-[#1A2420] px-2.5 py-1 text-[11px] font-medium text-[#A3B3AC] hover:border-[#2E8B57]/60 hover:text-[#F0F5F2]"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        disabled={selectedCount === 0}
                        className="rounded-lg border border-[#23302B] bg-[#0B0F0E] px-2.5 py-1 text-[11px] font-medium text-[#6E8078] hover:text-[#F0F5F2] disabled:opacity-40"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Permission Search */}
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6E8078]" />
                    <input
                      type="search"
                      value={permissionSearch}
                      onChange={(e) => setPermissionSearch(e.target.value)}
                      placeholder="Filter permissions by name, key, or module..."
                      aria-label="Filter permissions"
                      className="h-9 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] pl-9 pr-3 text-xs text-[#F0F5F2] placeholder-[#6E8078] focus:border-[#4CAF7D] focus:outline-none"
                    />
                  </div>

                  {/* Categorized Checklist */}
                  <div className="space-y-3">
                    {groupedPermissions.length === 0 ? (
                      <div className="rounded-2xl border border-[#23302B] bg-[#0B0F0E]/60 py-8 text-center text-xs text-[#6E8078]">
                        No permissions match &ldquo;{permissionSearch}&rdquo;.
                      </div>
                    ) : (
                      groupedPermissions.map(([category, items]) => {
                        const categorySelectedCount = items.filter((item) =>
                          Boolean(selectedPermissions[item.key]),
                        ).length;
                        const allCategorySelected =
                          categorySelectedCount === items.length && items.length > 0;

                        return (
                          <div
                            key={category}
                            className="overflow-hidden rounded-2xl border border-[#23302B] bg-[#0B0F0E]/70"
                          >
                            <div className="flex items-center justify-between border-b border-[#23302B]/80 bg-[#1A2420]/55 px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-[#F0F5F2]">
                                  {category}
                                </span>
                                <span className="rounded-full bg-[#131A17] px-2 py-0.5 text-[10px] font-medium text-[#A3B3AC]">
                                  {categorySelectedCount}/{items.length}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleCategory(items)}
                                className="text-[11px] font-medium text-[#4CAF7D] hover:underline"
                              >
                                {allCategorySelected ? 'Unselect group' : 'Select group'}
                              </button>
                            </div>

                            <div className="divide-y divide-[#23302B]/50">
                              {items.map((item) => {
                                const grantedScope = selectedPermissions[item.key];
                                const isChecked = Boolean(grantedScope);

                                return (
                                  <div
                                    key={item.key}
                                    className={cn(
                                      'flex items-start justify-between gap-3 px-4 py-3 transition-colors',
                                      isChecked ? 'bg-[#1F5C3A]/15' : 'hover:bg-[#1A2420]/40',
                                    )}
                                  >
                                    <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => togglePermission(item)}
                                        className="sr-only"
                                      />
                                      <span
                                        aria-hidden="true"
                                        className={cn(
                                          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                                          isChecked
                                            ? 'border-[#2E8B57] bg-[#2E8B57] text-[#F0F5F2]'
                                            : 'border-[#23302B] bg-[#131A17]',
                                        )}
                                      >
                                        {isChecked && <Check className="h-3 w-3" strokeWidth={3} />}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-xs font-medium text-[#F0F5F2]">
                                            {item.label}
                                          </span>
                                          <code className="rounded bg-[#131A17] px-1.5 py-0.5 font-mono text-[10px] text-[#4CAF7D]">
                                            {item.key}
                                          </code>
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-[#6E8078]">
                                          {item.description}
                                        </p>
                                      </div>
                                    </label>

                                    {isChecked && (
                                      <select
                                        aria-label={`Scope for ${item.label}`}
                                        value={grantedScope}
                                        onChange={(e) =>
                                          updatePermissionScope(
                                            item.key,
                                            e.target.value as ScopeLevel,
                                          )
                                        }
                                        className="h-7 shrink-0 rounded-lg border border-[#2E8B57]/40 bg-[#131A17] px-2 text-[11px] font-medium text-[#4CAF7D] focus:border-[#4CAF7D] focus:outline-none"
                                      >
                                        {SCOPE_LEVELS.map((level) => (
                                          <option key={level} value={level}>
                                            {SCOPE_LABELS[level]}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 border-t border-[#23302B] bg-[#131A17] px-6 py-4">
                <span className="text-xs text-[#A3B3AC]">
                  <strong className="text-[#F0F5F2]">{selectedCount}</strong>{' '}
                  {selectedCount === 1 ? 'permission' : 'permissions'} selected
                </span>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={resetAndClose}
                    disabled={isSubmitting}
                    className="h-10 rounded-xl border border-[#23302B] bg-[#0B0F0E] px-4 text-xs font-medium text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2E8B57] px-4 text-xs font-semibold text-[#F0F5F2] shadow-sm transition-colors hover:bg-[#349960] disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <ShieldPlus className="h-3.5 w-3.5" />
                        Create Role
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
