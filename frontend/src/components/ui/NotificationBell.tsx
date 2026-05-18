"use client";

/**
 * NotificationBell — Header/Sidebar'a yerleştirilen bildirim çan komponenti.
 *
 * Özellikler:
 *  - Okunmamış sayacı (60 saniyede bir refresh)
 *  - Açılır dropdown: son 10 bildirim
 *  - "Tümünü oku" butonu
 *  - Tekil bildirime tıklayınca okundu işaretle
 *  - Türkçe relative time ("3 saat önce")
 *
 * Backend: GET /notifications, GET /notifications/unread-count,
 * PATCH /notifications/{id}/read, PATCH /notifications/read-all
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, Inbox } from "lucide-react";
import apiClient from "@/lib/apiClient";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_id: string | null;
}

const POLL_INTERVAL_MS = 60_000; // 60 sn

function relativeTime(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const diffSec = Math.floor((Date.now() - then) / 1000);
    if (diffSec < 60) return "az önce";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} dakika önce`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} saat önce`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} gün önce`;
    return new Date(iso).toLocaleDateString("tr-TR");
  } catch {
    return "";
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await apiClient.get<{ unread_count?: number; count?: number } | number>(
        "/api/v1/notifications/unread-count"
      );
      const count =
        typeof data === "number"
          ? data
          : data?.unread_count ?? data?.count ?? 0;
      setUnread(count);
    } catch {
      /* sessizce yok say */
    }
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<{ items: Notification[] }>(
        "/api/v1/notifications?size=10&sort_by=created_at&order=desc"
      );
      setItems(data?.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 60 sn'de bir okunmamış sayacı
  useEffect(() => {
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchUnreadCount]);

  // Dropdown açıldığında listeyi çek
  useEffect(() => {
    if (open) fetchItems();
  }, [open, fetchItems]);

  // Dış tıklama ile kapat
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markOne = async (n: Notification) => {
    if (n.is_read) return;
    try {
      await apiClient.patch(`/api/v1/notifications/${n.id}/read`);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnread((c) => Math.max(0, c - 1));
    } catch {
      /* yok say */
    }
  };

  const markAll = async () => {
    try {
      await apiClient.patch("/api/v1/notifications/read-all");
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
      setUnread(0);
    } catch {
      /* yok say */
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Bildirimler"
        title="Bildirimler"
        className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
            <p className="text-sm font-semibold text-white">Bildirimler</p>
            {items.some((n) => !n.is_read) && (
              <button
                onClick={markAll}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-400 hover:bg-indigo-900/30 hover:text-indigo-300"
              >
                <Check className="h-3 w-3" />
                Tümünü oku
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-800" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <Inbox className="h-8 w-8 text-gray-600" />
                <p className="text-sm text-gray-500">Henüz bildiriminiz yok.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-800">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => markOne(n)}
                      className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-800 ${
                        n.is_read ? "opacity-70" : "bg-indigo-900/10"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && (
                          <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-100 line-clamp-1">
                            {n.title}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">
                            {n.message}
                          </p>
                          <p className="mt-1 text-[10px] text-gray-500">
                            {relativeTime(n.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
