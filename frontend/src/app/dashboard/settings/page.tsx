"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Building2, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import toast from "react-hot-toast";

interface Department {
  id: string;
  name: string;
  created_at: string;
}

export default function SettingsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

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

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const { data } = await apiClient.post<Department>("/api/v1/admin/departments", { name });
      setDepartments((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, "tr")));
      setNewName("");
      toast.success(`"${data.name}" bölümü eklendi.`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Bölüm eklenemedi.");
    } finally {
      setAdding(false);
    }
  };

  const handleEditStart = (dept: Department) => {
    setEditingId(dept.id);
    setEditName(dept.name);
  };

  const handleEditSave = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const { data } = await apiClient.patch<Department>(`/api/v1/admin/departments/${id}`, { name });
      setDepartments((prev) =>
        prev.map((d) => (d.id === id ? data : d)).sort((a, b) => a.name.localeCompare(b.name, "tr"))
      );
      setEditingId(null);
      toast.success("Bölüm güncellendi.");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" bölümünü silmek istediğinize emin misiniz?`)) return;
    try {
      await apiClient.delete(`/api/v1/admin/departments/${id}`);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      toast.success(`"${name}" bölümü silindi.`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Silinemedi.");
    }
  };

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-gray-400";

  return (
    <div className="space-y-8">
      {/* Başlık */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Ayarlar</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Sistem genelindeki yapılandırmaları yönetin.
        </p>
      </div>

      {/* Bölüm Yönetimi */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40">
              <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-base">Bölüm Yönetimi</CardTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Kayıt formunda görünecek bölüm listesini yönetin.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Yeni bölüm ekleme formu */}
          <form onSubmit={handleAdd} className="flex gap-3">
            <input
              type="text"
              placeholder="Yeni bölüm adı (örn: Mekatronik Mühendisliği)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={`${inputClass} flex-1`}
            />
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              {adding ? "Ekleniyor..." : "Ekle"}
            </button>
          </form>

          {/* Bölüm listesi */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : departments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 p-8 text-center">
              <Building2 className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Henüz bölüm eklenmemiş. Yukarıdan ilk bölümü ekleyin.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              {departments.map((dept) => (
                <div key={dept.id} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <Building2 className="h-4 w-4 shrink-0 text-gray-400" />

                  {editingId === dept.id ? (
                    /* Düzenleme modu */
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEditSave(dept.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 rounded-lg border border-indigo-400 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:bg-slate-800 dark:text-white"
                      />
                      <button
                        onClick={() => handleEditSave(dept.id)}
                        disabled={saving}
                        className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg bg-gray-200 p-1.5 text-gray-600 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    /* Görüntüleme modu */
                    <>
                      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                        {dept.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditStart(dept)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-700 dark:hover:text-gray-200"
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(dept.id, dept.name)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          title="Sil"
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

          <p className="text-xs text-gray-400 dark:text-gray-500">
            Toplam {departments.length} bölüm
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
