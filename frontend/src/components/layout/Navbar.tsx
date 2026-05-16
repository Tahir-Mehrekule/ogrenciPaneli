"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Menu, CheckCircle, Inbox, X } from "lucide-react";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/apiClient";

interface NavbarProps {
  onMenuToggle: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "şimdi";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuToggle }) => {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const res = await apiClient.get("/api/v1/notifications/unread-count");
      const cnt =
        typeof res.data === "number"
          ? res.data
          : res.data?.count ?? res.data?.detail ?? 0;
      setUnreadCount(Number(cnt));
    } catch {}
  };

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get("/api/v1/notifications");
      setNotifications(res.data?.items || []);
    } catch {}
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(() => {
      if (!document.hidden) fetchUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/api/v1/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.patch("/api/v1/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const toggleNotifications = () => {
    const opening = !showNotifications;
    setShowNotifications(opening);
    if (opening) fetchNotifications();
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-white/90 px-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/90 md:px-6">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Menü"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={toggleNotifications}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="badge-pulse absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          <div
            className={cn(
              "absolute right-0 mt-2 w-80 origin-top-right overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl transition-all duration-200 dark:border-slate-700 dark:bg-slate-900",
              showNotifications
                ? "visible translate-y-0 opacity-100"
                : "invisible -translate-y-2 opacity-0"
            )}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  Bildirimler
                </span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                    {unreadCount} yeni
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                  >
                    Tümü okundu
                  </button>
                )}
                <button
                  onClick={() => setShowNotifications(false)}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-[340px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Inbox className="h-8 w-8 text-gray-300 dark:text-slate-600" />
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    Henüz bildirim yok
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-slate-800">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 transition-colors",
                        !notif.is_read
                          ? "bg-indigo-50/60 dark:bg-indigo-950/30"
                          : "hover:bg-gray-50 dark:hover:bg-slate-800/60"
                      )}
                    >
                      {!notif.is_read && (
                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                      )}
                      {notif.is_read && <div className="mt-1.5 h-1.5 w-1.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                          {notif.title}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400 line-clamp-2">
                          {notif.message}
                        </p>
                        <span className="mt-1 block text-[10px] text-gray-400">
                          {timeAgo(notif.created_at)}
                        </span>
                      </div>
                      {!notif.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          title="Okundu işaretle"
                          className="shrink-0 rounded-md p-1 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-900/30"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User chip */}
        <div className="flex h-8 items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-600 text-[10px] font-bold text-white">
            {user?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <span className="hidden text-xs font-medium text-gray-700 sm:block dark:text-slate-300">
            {user?.full_name?.split(" ")[0] ?? "Kullanıcı"}
          </span>
        </div>
      </div>
    </header>
  );
};
