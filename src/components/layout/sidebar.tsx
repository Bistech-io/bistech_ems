'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Layers,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  X,
} from 'lucide-react';
import {
  ACCOUNT_NAV_ITEMS,
  getFilteredNavigation,
  type NavItem,
} from '@/config/navigation';
import { useSignOut } from '@/features/auth/hooks';
import { ROLE_LABELS, type RoleName } from '@/lib/auth/permissions';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';

const SIDEBAR_EASE = [0.22, 1, 0.36, 1] as const;
const COLLAPSED_WIDTH = 76;
const EXPANDED_WIDTH = 264;

const ROLES_LIST: RoleName[] = ['super_admin', 'hr_manager', 'dept_head', 'employee'];

function isPathActive(pathname: string, href: string, exact = false): boolean {
  if (exact) return pathname === href;
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isItemOrChildActive(pathname: string, item: NavItem): boolean {
  if (isPathActive(pathname, item.href, Boolean(item.children))) return true;
  if (!item.children) return false;
  return item.children.some((child) => isPathActive(pathname, child.href, true));
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, activeRole, setPreviewRole } = useAuth();
  const { signOut, isPending: isSigningOut } = useSignOut();

  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const isExpanded = isHovered || isPinned;

  const navGroups = useMemo(() => getFilteredNavigation(user), [user]);

  const toggleSubmenu = useCallback((id: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const isSubmenuOpen = useCallback(
    (item: NavItem) => {
      if (openGroups[item.id] !== undefined) return openGroups[item.id];
      return isItemOrChildActive(pathname, item);
    },
    [openGroups, pathname],
  );

  const renderSidebarBody = (expanded: boolean, onNavigate?: () => void) => (
    <div className="flex h-full flex-col justify-between overflow-hidden py-5">
      {/* Brand Header */}
      <div className="px-3.5">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CAF7D]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#23302B] bg-[#1A2420] text-[#4CAF7D] shadow-sm transition-colors duration-200 hover:border-[#2E8B57]/60">
              <Layers className="h-5 w-5" strokeWidth={2} />
            </div>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  key="brand-text"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.16, ease: SIDEBAR_EASE }}
                  className="flex flex-col overflow-hidden whitespace-nowrap"
                >
                  <span
                    className="text-[15px] font-bold tracking-[-0.02em] text-[#F0F5F2]"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    BisTech EMS
                  </span>
                  <span className="text-[11px] font-medium text-[#6E8078]">
                    {ROLE_LABELS[activeRole]}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.button
                key="pin-button"
                type="button"
                onClick={() => setIsPinned((prev) => !prev)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                title={isPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
                aria-label={isPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
                className={cn(
                  'hidden h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors md:flex',
                  isPinned
                    ? 'border-[#2E8B57]/50 bg-[#1F5C3A]/40 text-[#4CAF7D]'
                    : 'border-transparent text-[#6E8078] hover:bg-[#1A2420] hover:text-[#F0F5F2]',
                )}
              >
                {isPinned ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Subtle Divider */}
        <div className="mx-auto my-4 h-px w-full bg-[#23302B]/80" />
      </div>

      {/* Main RBAC-Filtered Navigation */}
      <nav
        aria-label="Primary Navigation"
        className="sidebar-scroll flex-1 space-y-4 overflow-y-auto px-3.5"
      >
        {navGroups.map((group) => (
          <div key={group.id} className="space-y-1">
            {expanded ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
                className="px-3 pb-1 text-[10px] font-semibold tracking-[0.08em] text-[#6E8078] uppercase"
              >
                {group.label}
              </motion.p>
            ) : (
              <div className="mx-auto my-2 h-px w-6 bg-[#23302B]/60 first:hidden" />
            )}

            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isItemOrChildActive(pathname, item);
                const hasChildren = Boolean(item.children?.length);
                const submenuExpanded = expanded && hasChildren && isSubmenuOpen(item);

                return (
                  <li key={item.id}>
                    <div className="relative flex items-center">
                      {active && (
                        <motion.span
                          layoutId="sidebar-active-pill"
                          transition={{ duration: 0.22, ease: SIDEBAR_EASE }}
                          className="absolute inset-0 rounded-2xl bg-[#2E8B57] shadow-[0_6px_20px_-4px_rgba(46,139,87,0.5)]"
                        />
                      )}

                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        title={!expanded ? item.label : undefined}
                        className={cn(
                          'relative z-10 flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CAF7D]',
                          active
                            ? 'text-[#F0F5F2]'
                            : 'text-[#A3B3AC] hover:bg-[#1A2420]/90 hover:text-[#F0F5F2]',
                        )}
                      >
                        <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                          <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.2 : 1.85} />
                          {item.hasDot && !expanded && (
                            <span
                              className={cn(
                                'absolute -top-1 -right-1 h-2 w-2 rounded-full ring-2',
                                active
                                  ? 'bg-[#F0F5F2] ring-[#2E8B57]'
                                  : 'bg-[#4CAF7D] ring-[#131A17]',
                              )}
                            />
                          )}
                        </span>

                        <AnimatePresence initial={false}>
                          {expanded && (
                            <motion.span
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -6 }}
                              transition={{ duration: 0.15, ease: SIDEBAR_EASE }}
                              className="flex-1 truncate whitespace-nowrap"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {expanded && item.hasDot && !hasChildren && (
                          <span
                            className={cn(
                              'h-2 w-2 shrink-0 rounded-full',
                              active ? 'bg-[#F0F5F2]' : 'bg-[#4CAF7D]',
                            )}
                          />
                        )}
                      </Link>

                      {expanded && hasChildren && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            toggleSubmenu(item.id);
                          }}
                          aria-label={`Toggle ${item.label} submenu`}
                          aria-expanded={submenuExpanded}
                          className={cn(
                            'relative z-10 mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-colors',
                            active
                              ? 'text-[#F0F5F2]/90 hover:bg-white/10'
                              : 'text-[#6E8078] hover:bg-[#1A2420] hover:text-[#F0F5F2]',
                          )}
                        >
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 transition-transform duration-200',
                              submenuExpanded && 'rotate-180',
                            )}
                          />
                        </button>
                      )}
                    </div>

                    {/* Smooth Submenu */}
                    <AnimatePresence initial={false}>
                      {submenuExpanded && item.children && (
                        <motion.ul
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18, ease: SIDEBAR_EASE }}
                          className="mt-1 ml-5 space-y-0.5 overflow-hidden border-l border-[#23302B] pl-3"
                        >
                          {item.children.map((sub) => {
                            const SubIcon = sub.icon;
                            const subActive = isPathActive(pathname, sub.href, true);

                            return (
                              <li key={sub.id}>
                                <Link
                                  href={sub.href}
                                  onClick={onNavigate}
                                  className={cn(
                                    'flex h-9 items-center gap-2.5 rounded-xl px-2.5 text-[13px] transition-colors duration-150',
                                    subActive
                                      ? 'bg-[#1F5C3A]/45 font-medium text-[#4CAF7D]'
                                      : 'text-[#A3B3AC] hover:bg-[#1A2420]/70 hover:text-[#F0F5F2]',
                                  )}
                                >
                                  <SubIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.85} />
                                  <span className="truncate whitespace-nowrap">{sub.label}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom Utility & RBAC Role Switcher */}
      <div className="mt-3 space-y-2 border-t border-[#23302B]/80 px-3.5 pt-3">
        {/* RBAC Role Switcher (visible when expanded for testing/optimizing role views) */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: SIDEBAR_EASE }}
              className="overflow-hidden pb-1"
            >
              <label
                htmlFor="rbac-role-select"
                className="mb-1 flex items-center gap-1.5 px-2 text-[10px] font-semibold tracking-[0.08em] text-[#6E8078] uppercase"
              >
                <Shield className="h-3 w-3 text-[#4CAF7D]" />
                <span>RBAC Role View</span>
              </label>
              <select
                id="rbac-role-select"
                value={activeRole}
                onChange={(e) => setPreviewRole(e.target.value as RoleName)}
                className="h-9 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-2.5 text-xs font-medium text-[#F0F5F2] transition-colors outline-none hover:border-[#2E8B57]/60 focus:border-[#4CAF7D]"
              >
                {ROLES_LIST.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Account Links */}
        <ul className="space-y-1">
          {ACCOUNT_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isPathActive(pathname, item.href, true);

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  title={!expanded ? item.label : undefined}
                  className={cn(
                    'flex h-10 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors duration-150',
                    active
                      ? 'bg-[#1F5C3A]/50 text-[#4CAF7D]'
                      : 'text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]',
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.85} />
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.15, ease: SIDEBAR_EASE }}
                        className="truncate whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </li>
            );
          })}

          <li>
            <button
              type="button"
              disabled={isSigningOut}
              onClick={() => signOut(onNavigate)}
              title={!expanded ? 'Sign Out' : undefined}
              className="flex h-10 w-full items-center gap-3 rounded-2xl px-3 text-sm font-medium text-[#A3B3AC] transition-colors duration-150 hover:bg-[#EF4444]/10 hover:text-[#EF4444] disabled:opacity-50"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.85} />
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.15, ease: SIDEBAR_EASE }}
                    className="truncate whitespace-nowrap"
                  >
                    {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Floating Pill Sidebar (Expands smoothly on hover) */}
      <motion.aside
        aria-label="Sidebar"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={false}
        animate={{ width: isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH }}
        transition={{ duration: 0.24, ease: SIDEBAR_EASE }}
        className="sticky top-4 z-40 hidden h-[calc(100vh-2rem)] shrink-0 rounded-[2rem] border border-[#23302B] bg-[#131A17]/95 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.65)] backdrop-blur-md md:block"
      >
        {renderSidebarBody(isExpanded)}
      </motion.aside>

      {/* Mobile Floating Trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        className="fixed bottom-5 left-5 z-40 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#23302B] bg-[#131A17] text-[#4CAF7D] shadow-xl md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.24, ease: SIDEBAR_EASE }}
              className="fixed top-3 bottom-3 left-3 z-50 w-[272px] rounded-[2rem] border border-[#23302B] bg-[#131A17] shadow-2xl md:hidden"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="absolute top-5 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-xl text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
              >
                <X className="h-4 w-4" />
              </button>
              {renderSidebarBody(true, () => setMobileOpen(false))}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
