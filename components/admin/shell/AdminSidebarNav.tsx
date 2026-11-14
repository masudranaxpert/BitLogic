'use client';

import React, { useEffect, useRef } from 'react';
import { X, Sun, Moon, ChevronRight, ChevronDown, Send } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { AdminTab } from '@/lib/admin-data';
import type { ConsoleUser, NavGroupItem } from '@/components/admin/shell/admin-nav-types';
import { isAdminNavGroupActive } from '@/components/admin/shell/admin-nav-config';

export type AdminSidebarNavProps = {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  visibleMainMenu: NavGroupItem[];
  visibleToolsMenu: NavGroupItem[];
  activeTab: AdminTab;
  expandedGroups: Record<string, boolean>;
  toggleGroupExpand: (groupId: string) => void;
  setActiveTab: (tab: AdminTab) => void;
  pendingDeliveriesBadge: number;
  consoleUser: ConsoleUser | null;
  darkMode: boolean;
  setDarkMode: (next: boolean) => void;
  onOpenProfile?: () => void;
};

export function AdminSidebarNav({
  mobileMenuOpen,
  setMobileMenuOpen,
  visibleMainMenu,
  visibleToolsMenu,
  activeTab,
  expandedGroups,
  toggleGroupExpand,
  setActiveTab,
  pendingDeliveriesBadge,
  consoleUser,
  darkMode,
  setDarkMode,
  onOpenProfile,
}: AdminSidebarNavProps) {
  const isGroupActive = (item: NavGroupItem) =>
    isAdminNavGroupActive(item, activeTab);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const activeEl =
      menu.querySelector<HTMLElement>('[data-sidebar-sub-active="true"]') ||
      menu.querySelector<HTMLElement>('[data-sidebar-group-active="true"]');
    if (!activeEl) return;
    const menuRect = menu.getBoundingClientRect();
    const elRect = activeEl.getBoundingClientRect();
    if (elRect.top < menuRect.top + 8 || elRect.bottom > menuRect.bottom - 8) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeTab, expandedGroups]);

  return (
    <aside
      className={`${
        mobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 flex shadow-2xl' : 'hidden'
      } lg:sticky lg:top-0 lg:h-dvh lg:flex w-60 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex-col justify-between select-none`}
    >
      {/* 1. FIXED TOP HEADER: Logo & Mobile Close (Never scrolls away) */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 shrink-0">
        <a
          href="/"
          title="Open storefront"
          className="group flex items-center gap-2 rounded-lg no-underline text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          <BrandLogo size="sm" />
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs select-none">
            Admin
          </span>
        </a>
        {mobileMenuOpen && (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. SCROLLABLE MIDDLE MENU (Main items & Tools) */}
      <div ref={menuRef} className="min-h-0 flex-1 overflow-y-auto admin-sidebar-scroll px-3 py-3 space-y-4">
        <div>
          <div className="space-y-1">
            {visibleMainMenu.map((item) => {
              const Icon = item.icon;
              const active = isGroupActive(item);
              const hasSubs = Boolean(item.subItems && item.subItems.length > 0);
              const isExpanded = Boolean(expandedGroups[item.id]);

              return (
                <div key={item.id} className="space-y-0.5">
                  <button
                    type="button"
                    data-sidebar-group-active={active ? 'true' : undefined}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => {
                      if (hasSubs) {
                        toggleGroupExpand(item.id);
                        if (!active) {
                          setActiveTab(item.id);
                        }
                      } else {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                      active
                        ? 'bg-emerald-50/90 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-semibold shadow-[inset_0_0_0_1px_rgba(5,150,105,0.22)]'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>

                    <span className="flex items-center gap-1.5 shrink-0">
                      {typeof item.count === 'number' && (
                        <span
                          suppressHydrationWarning
                          className={`px-1.5 py-0.5 rounded text-[11px] font-mono tabular-nums ${
                            active
                              ? 'bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                      {hasSubs && (
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`Toggle ${item.label} menu`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroupExpand(item.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleGroupExpand(item.id);
                            }
                          }}
                          className="p-1 -mr-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              isExpanded ? 'rotate-0' : '-rotate-90'
                            }`}
                          />
                        </span>
                      )}
                    </span>
                  </button>

                  {hasSubs && isExpanded && (
                    <div className="ml-5 pl-3 border-l border-slate-200 dark:border-slate-800 space-y-0.5 py-0.5">
                      {item.subItems?.map((sub) => {
                        const subActive =
                          activeTab === sub.id ||
                          (sub.id === 'vault' &&
                            (activeTab === 'vault-view' ||
                              activeTab === 'vault-edit')) ||
                          (sub.id === 'users' &&
                            activeTab === 'user-detail') ||
                          (sub.id === 'deliveries' &&
                            activeTab === 'deliveries' &&
                            item.id === 'deliveries');
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            data-sidebar-sub-active={subActive ? 'true' : undefined}
                            onClick={() => {
                              setActiveTab(sub.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 text-sm rounded-md transition-colors cursor-pointer flex items-center justify-between ${
                              subActive
                                ? 'text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-50/60 dark:bg-emerald-950/40'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <span>{sub.label}</span>
                            {subActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="admin-section-label px-2.5 text-[11px] uppercase mb-2">
            Tools
          </div>
          <div className="space-y-1">
            {visibleToolsMenu.map((item) => {
              const Icon = item.icon;
              const active = isGroupActive(item);
              const hasSubs = Boolean(item.subItems && item.subItems.length > 0);
              const isExpanded = Boolean(expandedGroups[item.id] || active);
              return (
                <div key={item.id} className="space-y-0.5">
                  <button
                    type="button"
                    data-sidebar-group-active={active ? 'true' : undefined}
                    aria-current={activeTab === item.id ? 'page' : undefined}
                    onClick={() => {
                      if (hasSubs) {
                        toggleGroupExpand(item.id);
                        if (!active) {
                          setActiveTab(item.id);
                        }
                      } else {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                      active
                        ? 'bg-emerald-50/90 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-semibold shadow-[inset_0_0_0_1px_rgba(5,150,105,0.22)]'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {hasSubs ? (
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                          isExpanded ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    ) : typeof item.count === 'number' && item.count > 0 ? (
                      <span suppressHydrationWarning className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-[11px] font-mono tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                        {item.count}
                      </span>
                    ) : null}
                  </button>
                  {hasSubs && isExpanded ? (
                    <div className="ml-5 pl-3 border-l border-slate-200 dark:border-slate-800 space-y-0.5 py-0.5">
                      {item.subItems?.map((sub) => {
                        const subActive = activeTab === sub.id || (sub.id === 'staff' && (activeTab === 'staff-add' || activeTab === 'staff-view'));
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            data-sidebar-sub-active={subActive ? 'true' : undefined}
                            onClick={() => {
                              setActiveTab(sub.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 text-sm rounded-md transition-colors cursor-pointer flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                              subActive
                                ? 'text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-50/60 dark:bg-emerald-950/40'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <span>{sub.label}</span>
                            {subActive ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2.5 border-t border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            setActiveTab('deliveries');
            setMobileMenuOpen(false);
          }}
          className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] hover:shadow-[inset_0_0_0_1px_#059669] flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-[6px] bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Send className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                Orders Queue
              </div>
              <div suppressHydrationWarning className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                {pendingDeliveriesBadge} pending action
              </div>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        <div className="flex items-center justify-between gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenProfile?.();
            }}
            aria-label="Open Profile Settings"
            title="Profile Settings"
            aria-current={activeTab === 'profile' ? 'page' : undefined}
            className={`group flex-1 flex items-center gap-2.5 min-w-0 rounded-lg px-2 py-1.5 -ml-2 text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
              activeTab === 'profile'
                ? 'bg-emerald-50/90 dark:bg-emerald-950/60 shadow-[inset_0_0_0_1px_rgba(5,150,105,0.22)]'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800/80'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-100 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden">
              <BrandLogo mark className="h-5 w-auto" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {consoleUser?.name || consoleUser?.email || 'Console'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {consoleUser?.isFullAdmin
                  ? 'Admin · Profile'
                  : consoleUser?.role === 'STAFF'
                    ? 'Staff · Profile'
                    : '…'}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 cursor-pointer shrink-0"
            title="Toggle Light / Dark Mode"
            aria-label="Toggle Light or Dark Mode"
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

export type AdminMobileBottomNavProps = {
  visibleMainMenu: NavGroupItem[];
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
};

export function AdminMobileBottomNav({
  visibleMainMenu,
  activeTab,
  setActiveTab,
}: AdminMobileBottomNavProps) {
  const isGroupActive = (item: NavGroupItem) =>
    isAdminNavGroupActive(item, activeTab);

  return (
    <nav
      aria-label="Mobile quick navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 h-15 px-1"
    >
      {(['overview', 'deliveries', 'payments', 'users', 'products'] as const)
        .map((id) => visibleMainMenu.find((m) => m.id === id))
        .filter((m): m is NavGroupItem => Boolean(m))
        .slice(0, 5)
        .map((item) => {
          const Icon = item.icon;
          const active = isGroupActive(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
                active
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-full px-1">{item.shortLabel}</span>
            </button>
          );
        })}
    </nav>
  );
}
