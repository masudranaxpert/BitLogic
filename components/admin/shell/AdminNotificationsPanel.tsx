'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import type { AdminNotificationItem, AdminSupportTicket, AdminTab, DigitalDelivery } from '@/lib/admin-data';

export type AdminNotificationsPanelDeps = {
  adminNotifications: AdminNotificationItem[];
  deliveries: DigitalDelivery[];
  commitNotifications: (
    updater: React.SetStateAction<AdminNotificationItem[]>,
  ) => void;
  commitDeliveries: (updater: React.SetStateAction<DigitalDelivery[]>) => void;
  commitTickets: (updater: React.SetStateAction<AdminSupportTicket[]>) => void;
  setActiveTab: (tab: AdminTab) => void;
  handleSelectTicket: (ticketId: string | null) => void;
  handleSelectChatDelivery: (deliveryId: string | null) => void;
  children?: React.ReactNode;
};

export function AdminNotificationsPanel({
  children,
  ...deps
}: AdminNotificationsPanelDeps) {
  const {
    adminNotifications,
    deliveries,
    commitNotifications,
    commitDeliveries,
    commitTickets,
    setActiveTab,
    handleSelectTicket,
    handleSelectChatDelivery,
  } = deps;

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [liveAdminToast, setLiveAdminToast] = useState<{
    id: string;
    title: string;
    message: string;
    orderId?: string;
    deliveryId?: string;
    ticketId?: string;
  } | null>(null);
  const notifContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [notifOpen]);

  const handleNotificationClick = (notif: AdminNotificationItem) => {
    commitNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
    );
    setNotifOpen(false);

    if (notif.type === 'ticket' && notif.ticketId) {
      setActiveTab('tickets');
      handleSelectTicket(notif.ticketId);
      return;
    }

    if (notif.type === 'payment') {
      setActiveTab('payments');
      return;
    }

    const matchedDelivery =
      deliveries.find((d) => d.id === notif.deliveryId) ||
      deliveries.find((d) => d.orderId === notif.orderId);
    if (matchedDelivery) {
      handleSelectChatDelivery(matchedDelivery.id);
    } else {
      setActiveTab('deliveries');
    }
  };

  const handleMarkAllAdminNotifsRead = () => {
    commitNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    commitDeliveries((prev) => prev.map((d) => ({ ...d, unreadChatCount: 0 })));
    commitTickets((prev) => prev.map((t) => ({ ...t, unreadCount: 0 })));
  };

  const unreadNotificationsCount = adminNotifications.filter((n) => !n.read).length;
  const visibleAdminNotifications = adminNotifications
    .filter((n) => (notifFilter === 'UNREAD' ? !n.read : true))
    .slice(0, 7);

  return (
    <>
      {liveAdminToast ? (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-3.5 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[350px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg shadow-[0_10px_28px_-6px_rgba(15,23,42,0.18)] p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
            {liveAdminToast.title}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {liveAdminToast.message}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (liveAdminToast.ticketId) {
              setActiveTab('tickets');
              handleSelectTicket(liveAdminToast.ticketId);
            } else if (liveAdminToast.deliveryId) {
              handleSelectChatDelivery(liveAdminToast.deliveryId);
            }
            setLiveAdminToast(null);
          }}
          className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
        >
          View
        </button>
        <button
          type="button"
          onClick={() => setLiveAdminToast(null)}
          className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      ) : null}

    <div className="flex items-center gap-2" ref={notifContainerRef}>
      {children}
      <div className="relative">
      <button
        type="button"
        onClick={() => setNotifOpen((prev) => !prev)}
        className={`relative w-9 h-9 rounded-lg border transition-colors inline-flex items-center justify-center cursor-pointer shadow-2xs ${
          notifOpen
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 text-slate-700 dark:text-slate-200'
        }`}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadNotificationsCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-bold inline-flex items-center justify-center ring-2 ring-white dark:ring-slate-900 tabular-nums">
            {unreadNotificationsCount}
          </span>
        )}
      </button>

      {notifOpen && (
        <div className="fixed inset-x-3 top-15 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[360px] z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-display text-xs font-bold text-slate-900 dark:text-slate-100">
                Notifications
              </span>
              <div className="inline-flex p-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setNotifFilter('ALL')}
                  className={`px-2 py-0.5 rounded-xs font-semibold cursor-pointer ${
                    notifFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setNotifFilter('UNREAD')}
                  className={`px-2 py-0.5 rounded-xs font-semibold cursor-pointer ${
                    notifFilter === 'UNREAD'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Unread ({unreadNotificationsCount})
                </button>
              </div>
            </div>

            {unreadNotificationsCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAdminNotifsRead}
                className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 cursor-pointer whitespace-nowrap"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {visibleAdminNotifications.length === 0 ? (
              <div className="py-8 px-4 text-center text-xs text-slate-400">
                No unread notifications.
              </div>
            ) : (
              visibleAdminNotifications.map((item) => {
                const refCode = item.ticketId || item.orderId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNotificationClick(item)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 transition-colors cursor-pointer ${
                      !item.read
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/35'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                        !item.read
                          ? 'bg-emerald-600'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs truncate ${
                            !item.read
                              ? 'font-bold text-slate-900 dark:text-slate-100'
                              : 'font-semibold text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 whitespace-nowrap tabular-nums shrink-0">
                          {item.time}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                        {refCode && (
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                            {refCode} ·{' '}
                          </span>
                        )}
                        {item.message}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="px-3.5 py-2 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex items-center justify-between text-[11px] text-slate-500">
            <span />
            <button
              type="button"
              onClick={() => {
                setNotifOpen(false);
                setActiveTab('deliveries');
              }}
              className="font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 cursor-pointer"
            >
              Orders →
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
    </>
  );
}
