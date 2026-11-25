"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errorMessage";
import { Card, CardContent } from "@/components/ui/Card";
import { SoftDeleteModal } from "@/components/ui/SoftDeleteModal";
import { FolderKanban, FileText, RotateCcw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface TrashItem {
  id: string;
  title?: string;
  content?: string;
  week_number?: number;
  year?: number;
  created_at: string;
}

type Tab = "projects" | "reports";

export default function AdminTrashPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("projects");
  const [items, setItems] = useState<TrashItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [hardTarget, setHardTarget] = useState<TrashItem | null>(null);
  const [hardDeleting, setHardDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role?.toUpperCase() !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        tab === "projects"
          ? "/api/v1/projects/deleted/list?size=50"
          : "/api/v1/reports/deleted/list?size=50";
      const { data } = await apiClient.get(url);
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Silinmiş kayıtlar yüklenemedi."));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const handleRestore = async (id: string) => {
    setRestoring(id);
    try {
      const url =
        tab === "projects"
          ? `/api/v1/projects/${id}/restore`
          : `/api/v1/reports/${id}/restore`;
      await apiClient.post(url);
      toast.success("Kayıt geri yüklendi.");
      fetchTrash();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Geri yükleme başarısız."));
    } finally {
      setRestoring(null);
    }
  };

  const confirmHardDelete = async () => {
    if (!hardTarget) return;
    setHardDeleting(true);
    try {
      const url =
        tab === "projects"
          ? `/api/v1/projects/${hardTarget.id}/hard`
          : `/api/v1/reports/${hardTarget.id}/hard`;
      await apiClient.delete(url);
      toast.success("Kayıt kalıcı olarak silindi.");
      setHardTarget(null);
      fetchTrash();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Kalıcı silme başarısız."));
    } finally {
      setHardDeleting(false);
    }
  };

  const label = (it: TrashItem) =>
    tab === "projects"
      ? it.title ?? "İsimsiz proje"
      : `${it.year ?? ""} - ${it.week_number ?? ""}. hafta raporu`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Geri Dönüşüm</h2>
        <p className="text-sm text-gray-400 mt-1">
          Silinmiş proje ve raporlar — geri yükleyin ya da kalıcı silin. Toplam {total} kayıt.
        </p>
      </div>

      <div className="flex gap-2">
        {(
          [
            { key: "projects", label: "Projeler", icon: FolderKanban },
            { key: "reports", label: "Raporlar", icon: FileText },
          ] as const
        ).map(({ key, label: l, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === key
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                : "bg-gray-800 text-gray-400 hover:text-gray-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-gray-500">
            Yükleniyor...
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-gray-500">
            Geri dönüşüm kutusu boş — silinmiş kayıt yok.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <Card key={it.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-100">{label(it)}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(it.created_at).toLocaleString("tr-TR")}
                  </p>
                </div>
                <button
                  onClick={() => handleRestore(it.id)}
                  disabled={restoring === it.id}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600/15 px-3 py-2 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-600/25 disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {restoring === it.id ? "Yükleniyor..." : "Geri Yükle"}
                </button>
                <button
                  onClick={() => setHardTarget(it)}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600/15 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-600/25"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Kalıcı Sil
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SoftDeleteModal
        open={!!hardTarget}
        title="Kalici olarak sil"
        entityName={hardTarget ? label(hardTarget) : ""}
        confirmLabel="Kalici Sil"
        destructive
        onClose={() => !hardDeleting && setHardTarget(null)}
        onConfirm={confirmHardDelete}
      />
    </div>
  );
}
