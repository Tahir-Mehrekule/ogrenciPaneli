"use client";

import React, { useCallback, useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errorMessage";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
  project_approved: "Proje Onayi",
  project_rejected: "Proje Reddi",
  task_assigned: "Gorev Atamasi",
  report_reviewed: "Rapor Incelemesi",
  report_review_pending: "Inceleme Hatirlatma",
  system_alert: "Sistem",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "simdi";
  if (minutes < 60) return `${minutes} dk once`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa once`;
  return `${Math.floor(hours / 24)} gun once`;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<NotificationItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = unreadOnly ? "?unread_only=true&size=50" : "?size=50";
      const { data } = await apiClient.get(`/api/v1/notifications${params}`);
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Bildirimler yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRead = async (id: string) => {
    try {
      await apiClient.patch(`/api/v1/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      toast.error("Isaretleme basarisiz.");
    }
  };

  const handleReadAll = async () => {
    try {
      await apiClient.patch("/api/v1/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("Tumu okundu olarak isaretlendi.");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Islem basarisiz."));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/v1/notifications/${deleteTarget.id}`);
      setItems((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      setTotal((t) => Math.max(0, t - 1));
      setDeleteTarget(null);
      toast.success("Bildirim silindi.");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Silme basarisiz."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Bildirimler</h2>
          <p className="text-sm text-gray-400 mt-1">Toplam {total} bildirim.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setUnreadOnly((v) => !v)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              unreadOnly
                ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                : "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {unreadOnly ? "Tumu" : "Okunmamislar"}
          </button>
          <button
            onClick={handleReadAll}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <CheckCheck className="h-4 w-4" />
            Tumunu Okundu Yap
          </button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-gray-500">
            Yukleniyor...
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-sm text-gray-500">
            <Bell className="h-8 w-8 text-gray-600" />
            Bildirim yok.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} className={n.is_read ? "opacity-70" : ""}>
              <CardContent className="flex items-start gap-3 py-3">
                <div
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    n.is_read ? "bg-gray-600" : "bg-indigo-500"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-100">{n.title}</p>
                    <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
                      {TYPE_LABEL[n.type] ?? n.type}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-400">{n.message}</p>
                  <p className="mt-1 text-xs text-gray-600">{timeAgo(n.created_at)}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {!n.is_read && (
                    <button
                      onClick={() => handleRead(n.id)}
                      title="Okundu isaretle"
                      className="rounded-lg p-1.5 text-gray-500 hover:bg-emerald-500/10 hover:text-emerald-400"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteTarget(n)}
                    title="Bildirimi sil"
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Bildirimi Sil"
        description={`"${deleteTarget?.title}" kalici olarak silinecek.`}
        confirmText="Sil"
        cancelText="Vazgec"
        isDestructive
        loading={deleting}
      />
    </div>
  );
}
