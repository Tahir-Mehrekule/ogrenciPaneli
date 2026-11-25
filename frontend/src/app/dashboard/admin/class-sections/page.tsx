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

interface Department {
  id: string;
  name: string;
}

interface ClassSection {
  id: string;
  department_id: string;
  department_name: string;
  grade_label: string;
  branch_code: string;
  capacity: number | null;
}

const INPUT =
  "w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-200 outline-none transition-colors focus:border-indigo-500 placeholder-gray-500";

const GRADES = ["1. Sınıf", "2. Sınıf", "3. Sınıf", "4. Sınıf"];

export default function AdminClassSectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const role = user?.role?.toUpperCase();
  const canWrite = role === "TEACHER" || role === "ADMIN";

  const [sections, setSections] = useState<ClassSection[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [newDept, setNewDept] = useState("");
  const [newGrade, setNewGrade] = useState(GRADES[0]);
  const [newBranch, setNewBranch] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGrade, setEditGrade] = useState("");
  const [editBranch, setEditBranch] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClassSection | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (role !== "TEACHER" && role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [role, authLoading, router]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [secRes, deptRes] = await Promise.all([
        apiClient.get("/api/v1/class-sections?size=100"),
        apiClient.get<Department[]>("/api/v1/departments"),
      ]);
      setSections(secRes.data.items ?? []);
      setDepartments(deptRes.data ?? []);
    } catch {
      toast.error("Şubeler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const deptName = (id: string) =>
    departments.find((d) => d.id === id)?.name ?? "—";

  const filtered = sections.filter(
    (s) =>
      (!deptFilter || s.department_id === deptFilter) &&
      (!gradeFilter || s.grade_label === gradeFilter)
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const branch = newBranch.trim().toUpperCase();
    const capacity = newCapacity ? Number(newCapacity) : undefined;
    if (!newDept) {
      toast.error("Bölüm seçin.");
      return;
    }
    if (!branch || branch.length > 10) {
      toast.error("Şube kodu 1-10 karakter olmalıdır.");
      return;
    }
    if (capacity !== undefined && (!Number.isInteger(capacity) || capacity < 1 || capacity > 500)) {
      toast.error("Kapasite 1-500 aralığında olmalıdır.");
      return;
    }
    setAdding(true);
    try {
      const { data } = await apiClient.post<ClassSection>("/api/v1/class-sections", {
        department_id: newDept,
        grade_label: newGrade,
        branch_code: branch,
        ...(capacity !== undefined ? { capacity } : {}),
      });
      setSections((prev) => [data, ...prev]);
      setAddOpen(false);
      setNewDept("");
      setNewBranch("");
      setNewCapacity("");
      toast.success("Şube oluşturuldu.");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Şube oluşturulamadı."));
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (s: ClassSection) => {
    setEditingId(s.id);
    setEditGrade(s.grade_label);
    setEditBranch(s.branch_code);
    setEditCapacity(s.capacity != null ? String(s.capacity) : "");
  };

  const handleEditSave = async (id: string) => {
    const branch = editBranch.trim().toUpperCase();
    const capacity = editCapacity ? Number(editCapacity) : null;
    if (!branch || branch.length > 10) {
      toast.error("Şube kodu 1-10 karakter olmalıdır.");
      return;
    }
    if (editCapacity && (!Number.isInteger(Number(editCapacity)) || Number(editCapacity) < 1 || Number(editCapacity) > 500)) {
      toast.error("Kapasite 1-500 aralığında olmalıdır.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await apiClient.patch<ClassSection>(`/api/v1/class-sections/${id}`, {
        grade_label: editGrade,
        branch_code: branch,
        capacity,
      });
      setSections((prev) => prev.map((s) => (s.id === id ? data : s)));
      setEditingId(null);
      toast.success("Şube güncellendi.");
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
      await apiClient.delete(`/api/v1/class-sections/${deleteTarget.id}`);
      setSections((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Şube silindi.");
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
          <h2 className="text-2xl font-bold tracking-tight text-white">Şubeler</h2>
          <p className="text-sm text-gray-400 mt-1">
            Bölüm + sınıf + şube kombinasyonları. Toplam {filtered.length} şube.
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Şube Ekle
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200"
        >
          <option value="">Tüm Bölümler</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200"
        >
          <option value="">Tüm Sınıflar</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        {(deptFilter || gradeFilter) && (
          <button
            onClick={() => {
              setDeptFilter("");
              setGradeFilter("");
            }}
            className="rounded-xl border border-gray-700 px-3 py-2 text-sm text-gray-400 hover:text-gray-200"
          >
            Temizle
          </button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-white">Şube Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-500">Yükleniyor...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">Şube bulunamadı.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-2">Bölüm</th>
                    <th className="px-3 py-2">Sınıf</th>
                    <th className="px-3 py-2">Şube</th>
                    <th className="px-3 py-2">Kapasite</th>
                    {canWrite && <th className="px-3 py-2 text-right">İşlemler</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b border-gray-800/60 last:border-0">
                      <td className="px-3 py-2.5 text-gray-200">
                        {s.department_name || deptName(s.department_id)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-200">
                        {editingId === s.id ? (
                          <select
                            value={editGrade}
                            onChange={(e) => setEditGrade(e.target.value)}
                            className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm"
                          >
                            {GRADES.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        ) : (
                          s.grade_label
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {editingId === s.id ? (
                          <input
                            value={editBranch}
                            onChange={(e) => setEditBranch(e.target.value.toUpperCase().slice(0, 10))}
                            className={`${INPUT} max-w-24 font-mono`}
                          />
                        ) : (
                          <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 font-mono text-indigo-300">
                            {s.branch_code}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-gray-200">
                        {editingId === s.id ? (
                          <input
                            value={editCapacity}
                            onChange={(e) => setEditCapacity(e.target.value.replace(/\D/g, "").slice(0, 3))}
                            placeholder="—"
                            className={`${INPUT} max-w-24`}
                          />
                        ) : (
                          s.capacity ?? "—"
                        )}
                      </td>
                      {canWrite && (
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end gap-1.5">
                            {editingId === s.id ? (
                              <>
                                <button
                                  onClick={() => handleEditSave(s.id)}
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
                                  onClick={() => startEdit(s)}
                                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
                                  title="Düzenle"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(s)}
                                  className="rounded-lg p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                                  title="Sil"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
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
            <h3 className="text-lg font-semibold text-white">Şube Ekle</h3>
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Bölüm</label>
              <select value={newDept} onChange={(e) => setNewDept(e.target.value)} className={INPUT}>
                <option value="">Bölüm seçin...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm text-gray-300">Sınıf</label>
                <select value={newGrade} onChange={(e) => setNewGrade(e.target.value)} className={INPUT}>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-gray-300">Şube Kodu</label>
                <input
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="A"
                  className={`${INPUT} font-mono`}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Kapasite (opsiyonel)</label>
              <input
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="30"
                className={INPUT}
              />
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
        title="Şubeyi Sil"
        description={`"${deleteTarget?.grade_label} ${deleteTarget?.branch_code}" şubesi silinecek.`}
        confirmText="Sil"
        cancelText="Vazgeç"
        isDestructive
        loading={deleting}
      />
    </div>
  );
}
