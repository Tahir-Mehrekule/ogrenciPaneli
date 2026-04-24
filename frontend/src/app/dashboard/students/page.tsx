"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/apiClient";
import { Search, X, ChevronLeft, ChevronRight, Edit2 } from "lucide-react";
import toast from "react-hot-toast";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  student_no?: string;
  grade_label?: string;
  departments: { id: string; name: string }[];
  created_at: string;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface EditModal {
  student: Student;
  student_no: string;
  grade_label: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  const [editModal, setEditModal] = useState<EditModal | null>(null);
  const [saving, setSaving] = useState(false);

  const SIZE = 20;

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(SIZE),
      });
      if (search) params.set("search", search);
      if (gradeFilter) params.set("grade_label", gradeFilter);
      if (deptFilter) params.set("department_id", deptFilter);

      const { data } = await apiClient.get(`/api/v1/users/my-students?${params}`);
      setStudents(data.items);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch {
      toast.error("Öğrenciler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [page, search, gradeFilter, deptFilter]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  useEffect(() => {
    apiClient
      .get<DepartmentOption[]>("/api/v1/admin/departments")
      .then(({ data }) => setDepartments(data))
      .catch(() => {});
  }, []);

  const clearFilters = () => {
    setSearch("");
    setGradeFilter("");
    setDeptFilter("");
    setPage(1);
  };

  const hasFilters = search || gradeFilter || deptFilter;

  const openEdit = (s: Student) =>
    setEditModal({ student: s, student_no: s.student_no ?? "", grade_label: s.grade_label ?? "" });

  const saveStudentInfo = async () => {
    if (!editModal) return;
    if (editModal.student_no && !/^\d{9}$/.test(editModal.student_no)) {
      toast.error("Öğrenci numarası 9 haneli rakamdan oluşmalıdır.");
      return;
    }
    setSaving(true);
    try {
      await apiClient.patch(`/api/v1/users/${editModal.student.id}/student-info`, {
        student_no: editModal.student_no || undefined,
        grade_label: editModal.grade_label || undefined,
      });
      toast.success("Bilgiler güncellendi.");
      setEditModal(null);
      fetchStudents();
    } catch (err: any) {
      const msg = err.response?.data?.detail;
      toast.error(msg || "Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Öğrencilerim</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Bölümünüzdeki öğrenciler — toplam {total} kayıt
          </p>
        </div>
      </div>

      {/* Filtre Çubuğu */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Ad, soyad, email veya numara..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
          />
        </div>

        <select
          value={gradeFilter}
          onChange={(e) => { setGradeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
        >
          <option value="">Tüm Sınıflar</option>
          <option value="1. Sınıf">1. Sınıf</option>
          <option value="2. Sınıf">2. Sınıf</option>
          <option value="3. Sınıf">3. Sınıf</option>
          <option value="4. Sınıf">4. Sınıf</option>
        </select>

        <select
          value={deptFilter}
          onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
        >
          <option value="">Tüm Bölümler</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800/40 dark:text-red-400"
          >
            <X className="h-3.5 w-3.5" /> Temizle
          </button>
        )}
      </div>

      {/* Tablo */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/60">
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Ad Soyad</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Okul No</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Bölüm</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Sınıf</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">E-posta</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    {hasFilters ? "Filtrelere uyan öğrenci bulunamadı." : "Bölümünüzde kayıtlı öğrenci yok."}
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {s.full_name}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">
                      {s.student_no ?? <span className="text-gray-300 dark:text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {s.departments.map((d) => d.name).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {s.grade_label ? (
                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {s.grade_label}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{s.email}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(s)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 dark:hover:bg-slate-700 dark:hover:text-indigo-400"
                        title="Numara/Sınıf Düzenle"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Sayfalama */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-slate-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {total} kayıttan {(page - 1) * SIZE + 1}–{Math.min(page * SIZE, total)} arası
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border p-1.5 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border p-1.5 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Düzenleme Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditModal(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-white">
              Bilgileri Düzenle
            </h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {editModal.student.full_name}
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Öğrenci Numarası
                </label>
                <input
                  type="text"
                  maxLength={9}
                  placeholder="123456789"
                  value={editModal.student_no}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                    setEditModal((m) => m && { ...m, student_no: val });
                  }}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 font-mono text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
                />
                <p className="mt-1 text-xs text-gray-400">
                  9 haneli numara girilirse sınıf otomatik güncellenir
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sınıf Etiketi (opsiyonel override)
                </label>
                <select
                  value={editModal.grade_label}
                  onChange={(e) => setEditModal((m) => m && { ...m, grade_label: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
                >
                  <option value="">Otomatik (numaradan belirle)</option>
                  <option value="1. Sınıf">1. Sınıf</option>
                  <option value="2. Sınıf">2. Sınıf</option>
                  <option value="3. Sınıf">3. Sınıf</option>
                  <option value="4. Sınıf">4. Sınıf</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-400"
              >
                İptal
              </button>
              <button
                onClick={saveStudentInfo}
                disabled={saving}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
