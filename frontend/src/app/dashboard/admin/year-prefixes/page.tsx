"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errorMessage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import toast from "react-hot-toast";

interface YearPrefix {
  id: string;
  prefix: string;
  entry_year: number;
  label: string;
  created_at: string;
}

const INPUT =
  "w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-200 outline-none transition-colors focus:border-indigo-500 placeholder-gray-500";

const isValidPrefix = (p: string) => /^\d{6}$/.test(p);

export default function AdminYearPrefixesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [prefixes, setPrefixes] = useState<YearPrefix[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newPrefix, setNewPrefix] = useState("");
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()));
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editYear, setEditYear] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<YearPrefix | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role?.toUpperCase() !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const fetchPrefixes = useCallback(async () => {
    try {
      const { data } = await apiClient.get<YearPrefix[]>("/api/v1/admin/year-prefixes");
      setPrefixes(data);
    } catch {
      toast.error("Yıl prefixleri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrefixes();
  }, [fetchPrefixes]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const prefix = newPrefix.trim();
    const year = Number(newYear);
    const label = newLabel.trim();
    if (!isValidPrefix(prefix)) {
      toast.error("Prefix 6 haneli rakam olmalıdır.");
      return;
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      toast.error("Giriş yılı 2000-2100 aralığında olmalıdır.");
      return;
    }
    if (!label) {
      toast.error("Sınıf etiketi zorunludur.");
      return;
    }
    setAdding(true);
    try {
      const { data } = await apiClient.post<YearPrefix>("/api/v1/admin/year-prefixes", {
        prefix,
        entry_year: year,
        label,
      });
      setPrefixes((prev) => [...prev, data]);
      setAddOpen(false);
      setNewPrefix("");
      setNewYear(String(new Date().getFullYear()));
      setNewLabel("");
      toast.success("Prefix eklendi.");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Prefix eklenemedi."));
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (p: YearPrefix) => {
    setEditingId(p.id);
    setEditYear(String(p.entry_year));
    setEditLabel(p.label);
  };

  const handleEditSave = async (id: string) => {
    const year = Number(editYear);
    const label = editLabel.trim();
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      toast.error("Giriş yılı 2000-2100 aralığında olmalıdır.");
      return;
    }
    if (!label) {
      toast.error("Sınıf etiketi zorunludur.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await apiClient.patch<YearPrefix>(
        `/api/v1/admin/year-prefixes/${id}`,
        { entry_year: year, label }
      );
      setPrefixes((prev) => prev.map((p) => (p.id === id ? data : p)));
      setEditingId(null);
      toast.success("Prefix güncellendi.");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Güncelleme başarısız."));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/v1/admin/year-prefixes/${deleteTarget.id}`);
      setPrefixes((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Prefix silindi.");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Silme başarısız."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Yıl Prefixleri</h2>
          <p className="text-sm text-gray-400 mt-1">
            Öğrenci numarasından sınıf belirleyen 6 haneli prefix kayıtları.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Prefix Ekle
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-white">
            Kayıtlı Prefixler ({prefixes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-500">Yükleniyor...</p>
          ) : prefixes.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Henüz prefix yok — öğrenci sınıf eşleşmesi çalışmaz.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-2">Prefix</th>
                    <th className="px-3 py-2">Giriş Yılı</th>
                    <th className="px-3 py-2">Sınıf Etiketi</th>
                    <th className="px-3 py-2 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {prefixes.map((p) => (
                    <tr key={p.id} className="border-b border-gray-800/60 last:border-0">
                      <td className="px-3 py-2.5 font-mono text-indigo-300">{p.prefix}</td>
                      <td className="px-3 py-2.5 text-gray-200">
                        {editingId === p.id ? (
                          <input
                            value={editYear}
                            onChange={(e) => setEditYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            className={`${INPUT} max-w-28`}
                          />
                        ) : (
                          p.entry_year
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-gray-200">
                        {editingId === p.id ? (
                          <input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className={`${INPUT} max-w-44`}
                          />
                        ) : (
                          p.label
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1.5">
                          {editingId === p.id ? (
                            <>
                              <button
                                onClick={() => handleEditSave(p.id)}
                                disabled={saving}
                                className="rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
                                title="Kaydet"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-700/50"
                                title="İptal"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(p)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
                                title="Düzenle"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(p)}
                                className="rounded-lg p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                                title="Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !adding && setAddOpen(false)} />
          <form
            onSubmit={handleAdd}
            className="relative w-full max-w-md space-y-4 rounded-2xl border border-gray-800 bg-gray-900 p-6"
          >
            <h3 className="text-lg font-semibold text-white">Prefix Ekle</h3>
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Prefix (6 hane)</label>
              <input
                value={newPrefix}
                onChange={(e) => setNewPrefix(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="245235"
                className={INPUT}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm text-gray-300">Giriş Yılı</label>
                <input
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="2024"
                  className={INPUT}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-300">Sınıf Etiketi</label>
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="2. Sınıf"
                  className={INPUT}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                disabled={adding}
                className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={adding}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {adding ? "Ekleniyor..." : "Ekle"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Prefixi Sil"
        description={`"${deleteTarget?.prefix}" kaydı silinecek. Bu prefix ile eşleşen yeni kayıtlar sınıf bilgisi alamaz.`}
        confirmText="Sil"
        cancelText="Vazgeç"
        isDestructive
        loading={deleting}
      />
    </div>
  );
}
