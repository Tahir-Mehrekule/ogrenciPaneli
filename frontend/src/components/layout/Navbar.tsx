"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Bell, LogOut, User as UserIcon, Menu, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/apiClient";

interface NavbarProps {
  onMenuToggle: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const res = await apiClient.get("/api/v1/notifications/unread-count");
      // JSON response if dict format or plain number
      const cnt = typeof res.data === 'number' ? res.data : (res.data?.detail ?? res.data?.count ?? res.data ?? 0);
      setUnreadCount(Number(cnt));
    } catch(e) {}
  };

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get("/api/v1/notifications");
      setNotifications(res.data?.items || []);
    } catch(e) {}
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const toggleNotifications = () => {
    const isOpening = !showNotifications;
    setShowNotifications(isOpening);
    setShowProfileMenu(false);
    if (isOpening) {
      fetchNotifications();
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/api/v1/notifications/${id}/read`);
      fetchNotifications();
      fetchUnreadCount();
    } catch(e) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.patch("/api/v1/notifications/read-all");
      fetchNotifications();
      fetchUnreadCount();
    } catch(e) {}
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white/80 px-6 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex items-center gap-4">
        {/* Hamburger Menü — mobilde sidebar açar */}
        <button
          onClick={onMenuToggle}
          className="block rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden dark:text-gray-400 dark:hover:bg-slate-800"
          aria-label="Menüyü aç/kapat"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
          UniTrack AI
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Bildirimler */}
        <div className="relative">
          <button 
            onClick={toggleNotifications}
            className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors dark:text-gray-400 dark:hover:bg-slate-800"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Bildirim Menüsü */}
          <div
            className={cn(
              "absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-gray-200 bg-white shadow-lg transition-all dark:border-slate-700 dark:bg-slate-800 flex flex-col",
              showNotifications ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0"
            )}
            style={{ maxHeight: '400px' }}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-700">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Bildirimler</span>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                  Tümünü Okundu İşaretle
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto w-full p-2">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                  Hiç bildiriminiz yok.
                </div>
              ) : (
                notifications.map((notif: any) => (
                  <div key={notif.id} className={cn(
                    "flex items-start gap-3 rounded-lg p-3 text-left mb-1 transition-colors",
                    !notif.is_read ? "bg-indigo-50 dark:bg-indigo-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  )}>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {new Date(notif.created_at).toLocaleString('tr-TR')}
                      </span>
                    </div>
                    {!notif.is_read && (
                      <button 
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="shrink-0 p-1 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
                        title="Okundu İşaretle"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Kullanıcı Profili */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu((prev) => !prev);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
              <UserIcon className="h-4 w-4" />
            </div>
            <span className="hidden font-medium text-gray-700 md:block dark:text-gray-200">
              {user?.name || "Kullanıcı"}
            </span>
          </button>

          {/* Kolay Açılır Menü */}
          <div
            className={cn(
              "absolute right-0 mt-2 w-48 origin-top-right rounded-xl border border-gray-200 bg-white shadow-lg transition-all dark:border-slate-700 dark:bg-slate-800",
              showProfileMenu
                ? "visible scale-100 opacity-100"
                : "invisible scale-95 opacity-0"
            )}
          >
            <div className="border-b border-gray-100 px-4 py-3 dark:border-slate-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.name}
              </p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {user?.email}
              </p>
            </div>
            <div className="p-1">
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
