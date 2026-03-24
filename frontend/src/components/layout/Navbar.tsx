"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Bell, LogOut, User as UserIcon, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white/80 px-6 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex items-center gap-4">
        {/* Mobil Menü Butonu (ileride eklenebilir) */}
        <button className="block rounded p-2 text-gray-500 hover:bg-gray-100 lg:hidden dark:text-gray-400 dark:hover:bg-slate-800">
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
          UniTrack AI
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Bildirimler */}
        <button className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors dark:text-gray-400 dark:hover:bg-slate-800">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-500"></span>
        </button>

        {/* Kullanıcı Profili */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu((prev) => !prev)}
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
