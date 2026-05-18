"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FocusTrapContainer } from "@/components/ui/FocusTrapContainer";
import { Building2, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

interface Department {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

const INPUT =
  "w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-200 outline-none transition-colors focus:border-indigo-500 placeholder-gray-500";

export default function AdminDepartmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseShortName, setCourseShortName] = useState("");
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role?.toUpperCase() !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const isValidCode = (c: string) => /^\d{3}$/.test(c);

  const resetAddForm = () => {
    setCourseName("");
    setCourseShortName("");
    setNewName("");
    setNewCode("");
  };

  const closeAddModal = () => {
    if (adding) return;
    setAddOpen(false);
    resetAddForm();
  };

  const fetchDepartments = useCallback(async () => {
    try {
      const { data } = await apiClient.get<Department[]>("/api/v1/admin/departments");
      setDepartments(data);
    } catch {
      toast.error("Bölümler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const code = newCode.trim();
    if (!name) return;
    if (!isValidCode(code)) {
      toast.error("Bölüm kodu tam 3 rakam olmalı (örn: 235).");
      return;
    }
    setAdding(true);
    try {
      const { data } = await apiClient.post<Department>("/api/v1/admin/departments", { name, code });
      setDepartments((prev) =>
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name, "tr")),
      );
      toast.success(`"${data.name}" (${data.code}) bölümü eklendi.`);
      setAddOpen(false);
      resetAddForm();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Bölüm eklenemedi.");
    } finally {
      setAdding(false);
    }
  };

  const handleEditStart = (dept: Department) => {
    setEditingId(dept.id);
    setEditName(dept.name);
    setEditCode(dept.code);
  };

  const handleEditSave = async (id: string) => {
    const name = editName.trim();
    const code = editCode.trim();
    if (!name) return;
    if (!isValidCode(code)) {
      toast.error("Bölüm kodu tam 3 rakam olmalı.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await apiClient.patch<Department>(
        `/api/v1/admin/departments/${id}`,
        { name, code },
      );
      setDepartments((prev) =>
        prev
          .map((d) => (d.id === id ? data : d))
          .sort((a, b) => a.name.localeCompare(b.name, "tr")),
      );
      setEditingId(null);
      toast.success("Bölüm güncellendi.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/v1/admin/departments/${deleteTarget.id}`);
      setDepartments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      toast.success(`"${deleteTarget.name}" bölümü silindi.`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Silinemedi.");
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || user?.role?.toUpperCase() !== "ADMIN") return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bölümler</h1>
          <p className="mt-1 text-sm text-gray-400">
            Kayıt formunda görünecek bölüm listesini ve 3 haneli kodlarını yönetin.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Bölüm Ekle
        </button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-900/40">
              <Building2 className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-base text-white">Bölüm Yönetimi</CardTitle>
              <p className="mt-0.5 text-xs text-gray-400">
                Bölüm kodu öğrenci numarasının orta 3 hanesini eşler.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-800" />
              ))}
            </div>
          ) : departments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center">
              <Building2 className="mx-auto mb-2 h-8 w-8 text-gray-600" />
              <p className="text-sm text-gray-500">
                Henüz bölüm eklenmemiş. İlk bölümü eklemek için Bölüm Ekle butonunu kullanın.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800 overflow-hidden rounded-xl border border-gray-700">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="flex items-center gap-3 bg-gray-900/50 px-4 py-3 transition-colors hover:bg-gray-800/50"
                >
                  <Building2 className="h-4 w-4 shrink-0 text-gray-500" />

                  {editingId === dept.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                        inputMode="numeric"
                        maxLength={3}
                        className="w-20 rounded-lg border border-indigo-500 bg-gray-800 px-2 py-1.5 text-center font-mono text-sm tracking-wider text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEditSave(dept.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 rounded-lg border border-indigo-500 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <button
                        onClick={() => handleEditSave(dept.id)}
                        disabled={saving}
                        className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-700 disabled:opacity-50"
                        aria-label="Kaydet"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg bg-gray-700 p-1.5 text-gray-400 hover:bg-gray-600"
                        aria-label="İptal"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="inline-flex items-center rounded-md bg-indigo-900/30 px-2 py-0.5 font-mono text-xs font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-700/40">
                        {dept.code}
                      </span>
                      <span className="flex-1 text-sm font-medium text-gray-200">
                        {dept.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditStart(dept)}
                          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-700 hover:text-gray-200"
                          aria-label={`${dept.name} bölümünü düzenle`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(dept)}
                          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-900/20 hover:text-red-400"
                          aria-label={`${dept.name} bölümünü sil`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500">Toplam {departments.length} bölüm</p>
        </CardContent>
      </Card>

      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAddModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Bölüm Ekle"
        >
          <FocusTrapContainer className="w-full max-w-xl rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
            <form onSubmit={handleAdd} className="space-y-5 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Bölüm Ekle</h2>
                  <p className="mt-1 text-xs text-gray-400">Ders ve bölüm bilgilerini dengeli bir formda girin.</p>
                </div>
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={adding}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="dept-course-name" className="mb-1.5 block text-xs font-medium text-gray-400">
                    Ders İsmi
                  </label>
                  <input
                    id="dept-course-name"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    className={INPUT}
                    placeholder="Yazılım Mühendisliği"
                  />
                </div>
                <div>
                  <label htmlFor="dept-course-short" className="mb-1.5 block text-xs font-medium text-gray-400">
                    Kısaltması
                  </label>
                  <input
                    id="dept-course-short"
                    value={courseShortName}
                    onChange={(e) => setCourseShortName(e.target.value.toUpperCase())}
                    className={INPUT}
                    placeholder="CENG314"
                    maxLength={20}
                  />
                </div>
                <div>
                  <label htmlFor="dept-name" className="mb-1.5 block text-xs font-medium text-gray-400">
                    Bölüm İsmi
                  </label>
                  <input
                    id="dept-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className={INPUT}
                    placeholder="Bilgisayar Mühendisliği"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="dept-code" className="mb-1.5 block text-xs font-medium text-gray-400">
                    Bölüm Kodu
                  </label>
                  <input
                    id="dept-code"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                    inputMode="numeric"
                    maxLength={3}
                    className={`${INPUT} font-mono tracking-wider`}
                    placeholder="235"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-800 pt-4">
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={adding}
                  className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={adding || !newName.trim() || !isValidCode(newCode)}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {adding ? "Ekleniyor..." : "Ekle"}
                </button>
              </div>
            </form>
          </FocusTrapContainer>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Bölümü Sil"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" (${deleteTarget.code}) bölümünü silmek istediğinize emin misiniz? Bu bölüme bağlı kullanıcılar/dersler etkilenebilir.`
            : ""
        }
        confirmText="Evet, Sil"
        cancelText="Vazgeç"
        isDestructive
        loading={deleting}
      />
    </div>
  );
}
