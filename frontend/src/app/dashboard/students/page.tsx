"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/apiClient";
import { Search, X, Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { DataTable, Column } from "@/components/ui/DataTable";
import { FilterPanel, ActiveFilter, SortOption } from "@/components/ui/FilterPanel";
import { ImportExportToolbar } from "@/components/ui/ImportExportToolbar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  student_no?: string;
  grade_label?: string;
  departments: { id: string; name: string }[];
  is_active: boolean;
  created_at: string;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface EditState {
  student: Student;
  // Admin alanları
  first_name: string;
  last_name: string;
  // Teacher + Admin alanları
  student_no: string;
  grade_label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { value: "full_name", label: "Ad Soyad" },
  { value: "student_no", label: "Öğrenci No" },
  { value: "grade_label", label: "Sınıf" },
  { value: "created_at", label: "Kayıt Tarihi" },
];

export default function StudentsPage() {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();
  const isAdmin = role === "ADMIN";

  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [studentNoFilter, setStudentNoFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [sortBy, setSortBy] = useState("full_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(pageSize),
        sort_by: sortBy,
        order: sortOrder,
        is_active: "true",
      });
      if (search) params.set("search", search);
      if (studentNoFilter) params.set("student_no", studentNoFilter);
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
  }, [page, pageSize, search, studentNoFilter, gradeFilter, deptFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    apiClient
      .get<DepartmentOption[]>("/api/v1/admin/departments")
      .then(({ data }) => setDepartments(data))
      .catch(() => {});
  }, []);

  const clearFilters = () => {
    setSearch("");
    setStudentNoFilter("");
    setGradeFilter("");
    setDeptFilter("");
    setPage(1);
  };

  const activeFilters: ActiveFilter[] = [
    ...(search ? [{ key: "search", label: "Arama", displayValue: search }] : []),
    ...(studentNoFilter ? [{ key: "studentNo", label: "Öğrenci No", displayValue: studentNoFilter }] : []),
    ...(gradeFilter ? [{ key: "grade", label: "Sınıf", displayValue: gradeFilter }] : []),
    ...(deptFilter
      ? [{ key: "dept", label: "Bölüm", displayValue: departments.find((d) => d.id === deptFilter)?.name ?? deptFilter }]
      : []),
  ];

  const clearFilter = (key: string) => {
    if (key === "search") setSearch("");
    if (key === "studentNo") setStudentNoFilter("");
    if (key === "grade") setGradeFilter("");
    if (key === "dept") setDeptFilter("");
  };

  const openEdit = (s: Student) =>
    setEditState({
      student: s,
      first_name: s.first_name,
      last_name: s.last_name,
      student_no: s.student_no ?? "",
      grade_label: s.grade_label ?? "",
    });

  const saveStudent = async () => {
    if (!editState) return;
    if (editState.student_no && !/^\d{9}$/.test(editState.student_no)) {
      toast.error("Öğrenci numarası 9 haneli rakamdan oluşmalıdır.");
      return;
    }
    setSaving(true);
    try {
      // Admin: isim güncelle (PATCH /users/{id})
      if (isAdmin) {
        const namePayload: any = {};
        if (editState.first_name.trim()) namePayload.first_name = editState.first_name.trim();
        if (editState.last_name.trim()) namePayload.last_name = editState.last_name.trim();
        if (Object.keys(namePayload).length > 0) {
          await apiClient.patch(`/api/v1/users/${editState.student.id}`, namePayload);
        }
      }

      // Teacher + Admin: öğrenci bilgisi güncelle (PATCH /users/{id}/student-info)
      const infoPayload: any = {};
      if (editState.student_no) infoPayload.student_no = editState.student_no;
      if (editState.grade_label) infoPayload.grade_label = editState.grade_label;
      if (Object.keys(infoPayload).length > 0) {
        await apiClient.patch(`/api/v1/users/${editState.student.id}/student-info`, infoPayload);
      }

      toast.success("Bilgiler güncellendi.");
      setEditState(null);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/v1/users/${deleteTarget.id}`);
      const msg = isAdmin
        ? `${deleteTarget.full_name} kalıcı olarak silindi.`
        : `${deleteTarget.full_name} pasifleştirildi.`;
      toast.success(msg);
      setDeleteTarget(null);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "İşlem başarısız.");
    } finally {
      setDeleting(false);
    }
  };

  const handleImport = async (data: any[]) => {
    setIsImporting(true);
    try {
      const payload = data.map((item) => ({
        first_name: item.first_name || item["Ad"] || "",
        last_name: item.last_name || item["Soyad"] || "",
        email: item.email || item["E-posta"] || "",
        student_no: item.student_no || item["Okul No"] || item["Öğrenci No"] || "",
        department_names: item.department_names
          ? String(item.department_names).split(",").map((d: string) => d.trim())
          : [],
      }));
      const res = await apiClient.post("/api/v1/users/import", payload);
      toast.success(`${res.data.successful} öğrenci aktarıldı, ${res.data.failed} başarısız.`);
      fetchStudents();
    } catch {
      toast.error("İçe aktarma başarısız oldu. Gerekli alanları kontrol edin.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({ size: "10000", is_active: "true" });
      if (search) params.set("search", search);
      if (studentNoFilter) params.set("student_no", studentNoFilter);
      if (gradeFilter) params.set("grade_label", gradeFilter);
      if (deptFilter) params.set("department_id", deptFilter);

      const { data } = await apiClient.get(`/api/v1/users/my-students?${params}`);
      const { utils, writeFile } = await import("xlsx");
      const ws = utils.json_to_sheet(
        data.items.map((s: any) => ({
          "Ad": s.first_name,
          "Soyad": s.last_name,
          "Okul No": s.student_no || "",
          "Bölüm": s.departments.map((d: any) => d.name).join(", "),
          "Sınıf": s.grade_label || "",
          "E-posta": s.email,
          "Durum": s.is_active ? "Aktif" : "Pasif",
        }))
      );
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Öğrenciler");
      writeFile(wb, "ogrenciler.xlsx");
    } catch {
      toast.error("Dışa aktarma başarısız oldu.");
    } finally {
      setIsExporting(false);
    }
  };

  const columns: Column<Student>[] = [
    {
      key: "full_name",
      header: "Ad Soyad",
      sortable: true,
      render: (s) => (
        <span className={`font-medium ${s.is_active ? "text-gray-100" : "text-gray-500 line-through"}`}>
          {s.full_name}
        </span>
      ),
    },
    {
      key: "student_no",
      header: "Okul No",
      sortable: true,
      render: (s) => (
        <span className="font-mono text-gray-400">{s.student_no ?? "—"}</span>
      ),
    },
    {
      key: "departments",
      header: "Bölüm",
      render: (s) => (
        <span className="text-gray-400">
          {s.departments.map((d) => d.name).join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "grade",
      header: "Sınıf",
      sortable: true,
      render: (s) =>
        s.grade_label ? (
          <span className="rounded-full bg-indigo-900/30 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
            {s.grade_label}
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        ),
    },
    {
      key: "status",
      header: "Durum",
      render: (s) => (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
          s.is_active
            ? "bg-green-900/20 text-green-400 border-green-800/50"
            : "bg-gray-900/50 text-gray-500 border-gray-700"
        }`}>
          {s.is_active ? "Aktif" : "Pasif"}
        </span>
      ),
    },
    {
      key: "email",
      header: "E-posta",
      render: (s) => <span className="text-gray-400">{s.email}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(s); }}
            title="Düzenle"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-slate-700 hover:text-indigo-400 transition-colors"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}
            title={isAdmin ? "Kalıcı Sil" : "Pasifleştir"}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-900/20 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Öğrencilerim</h1>
          <p className="mt-1 text-sm text-gray-400">
            Bölümünüzdeki öğrencileri yönetin ve takip edin
          </p>
        </div>
        <ImportExportToolbar
          onImport={handleImport}
          onExport={handleExport}
          isImporting={isImporting}
          isExporting={isExporting}
        />
      </div>

      {/* Filtre Çubuğu */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/50 p-4 backdrop-blur-sm shadow-sm">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Ad, soyad veya e-posta..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 text-gray-200"
          />
        </div>

        <input
          type="text"
          placeholder="Öğrenci No..."
          value={studentNoFilter}
          onChange={(e) => { setStudentNoFilter(e.target.value.replace(/\D/g, "")); setPage(1); }}
          maxLength={9}
          className="w-32 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-gray-200 outline-none focus:border-indigo-500"
        />

        <select
          value={gradeFilter}
          onChange={(e) => { setGradeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
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
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
        >
          <option value="">Tüm Bölümler</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {activeFilters.length > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 rounded-lg border border-red-900/50 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Temizle
          </button>
        )}
      </div>

      <FilterPanel
        activeFilters={activeFilters}
        onRemoveFilter={clearFilter}
        onClearAll={clearFilters}
        sortBy={sortBy}
        sortOrder={sortOrder}
        sortOptions={SORT_OPTIONS}
        onSortChange={(by, order) => { setSortBy(by); setSortOrder(order); setPage(1); }}
        resultCount={total}
      />

      <DataTable
        columns={columns}
        data={students}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        sortBy={sortBy}
        sortOrder={sortOrder}
        loading={loading}
        onSort={(col, order) => { setSortBy(col); setSortOrder(order); setPage(1); }}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        emptyMessage={activeFilters.length > 0 ? "Filtrelere uyan öğrenci bulunamadı." : "Bölümünüzde kayıtlı öğrenci yok."}
      />

      {/* ─── Düzenleme Modalı ─── */}
      {editState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditState(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-800 p-6 shadow-2xl">
            <h3 className="mb-1 text-lg font-semibold text-white">Bilgileri Düzenle</h3>
            <p className="mb-5 text-sm text-gray-400">{editState.student.full_name}</p>

            <div className="space-y-4">
              {/* Admin: isim alanları */}
              {isAdmin && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-400">Ad</label>
                      <input
                        type="text"
                        value={editState.first_name}
                        onChange={(e) => setEditState((s) => s && { ...s, first_name: e.target.value })}
                        className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 text-gray-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-400">Soyad</label>
                      <input
                        type="text"
                        value={editState.last_name}
                        onChange={(e) => setEditState((s) => s && { ...s, last_name: e.target.value })}
                        className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 text-gray-200"
                      />
                    </div>
                  </div>
                  <div className="h-px bg-gray-800" />
                </>
              )}

              {/* Teacher + Admin: öğrenci bilgileri */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Öğrenci Numarası</label>
                <input
                  type="text"
                  maxLength={9}
                  placeholder="123456789"
                  value={editState.student_no}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                    setEditState((s) => s && { ...s, student_no: val });
                  }}
                  className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3.5 py-2.5 font-mono text-sm outline-none focus:border-indigo-500 text-gray-200"
                />
                <p className="mt-1 text-xs text-gray-500">9 haneli numara girilirse sınıf otomatik güncellenir</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Sınıf Etiketi</label>
                <select
                  value={editState.grade_label}
                  onChange={(e) => setEditState((s) => s && { ...s, grade_label: e.target.value })}
                  className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 text-gray-200"
                >
                  <option value="">Otomatik (numaradan belirle)</option>
                  <option value="1. Sınıf">1. Sınıf</option>
                  <option value="2. Sınıf">2. Sınıf</option>
                  <option value="3. Sınıf">3. Sınıf</option>
                  <option value="4. Sınıf">4. Sınıf</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setEditState(null)}
                className="flex-1 rounded-xl border border-gray-700 bg-gray-800 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={saveStudent}
                disabled={saving}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
              >
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Silme Onay Dialogu ─── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        isDestructive={isAdmin}
        title={isAdmin ? "Öğrenciyi Kalıcı Sil" : "Öğrenciyi Pasifleştir"}
        description={
          isAdmin
            ? <>
                <strong className="text-white">{deleteTarget?.full_name}</strong> adlı öğrenci sistemden
                {" "}<span className="text-red-400 font-medium">kalıcı olarak silinecek</span>. Bu işlem geri alınamaz.
              </>
            : <>
                <strong className="text-white">{deleteTarget?.full_name}</strong> adlı öğrenci{" "}
                <span className="text-amber-400 font-medium">pasifleştirilecek</span> (sisteme giriş yapamaz, veri kaybolmaz).
              </>
        }
        confirmText={isAdmin ? "Kalıcı Sil" : "Pasifleştir"}
        cancelText="İptal"
      />
    </div>
  );
}
