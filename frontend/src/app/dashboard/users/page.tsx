"use client";

import React, { useEffect, useState, useCallback, useContext } from "react";
import apiClient from "@/lib/apiClient";
import { Search, X, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable, Column } from "@/components/ui/DataTable";
import { FilterPanel, ActiveFilter, SortOption } from "@/components/ui/FilterPanel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AuthContext } from "@/context/AuthContext";

type TabRole = "all" | "STUDENT" | "TEACHER";

interface UserItem {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
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
  user: UserItem;
  first_name: string;
  last_name: string;
  role: string;
  department_ids: string[];
  student_no: string;
  grade_label: string;
}

const ROLE_LABEL: Record<string, string> = {
  STUDENT: "Öğrenci",
  TEACHER: "Öğretmen",
  ADMIN: "Admin",
};

const SORT_OPTIONS: SortOption[] = [
  { value: "created_at", label: "Kayıt Tarihi" },
  { value: "full_name", label: "Ad Soyad" },
  { value: "email", label: "E-posta" },
];

const GRADE_OPTIONS = ["1. Sınıf", "2. Sınıf", "3. Sınıf", "4. Sınıf"];

export default function UsersPage() {
  const { user: currentUser } = useContext(AuthContext);
  const isAdmin = currentUser?.role === "ADMIN";

  const [tab, setTab] = useState<TabRole>("all");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [deptFilter, setDeptFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    apiClient
      .get<DepartmentOption[]>("/api/v1/admin/departments")
      .then(({ data }) => setDepartments(data))
      .catch(() => {});
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(pageSize),
        sort_by: sortBy,
        order: sortOrder,
      });
      if (tab !== "all") params.set("role", tab);
      if (search) params.set("search", search);
      if (activeFilter) params.set("is_active", activeFilter);
      if (deptFilter) params.set("department_id", deptFilter);
      if (gradeFilter && tab === "STUDENT") params.set("grade_label", gradeFilter);

      const { data } = await apiClient.get(`/api/v1/users?${params}`);
      setUsers(data.items);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch {
      toast.error("Kullanıcılar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [tab, page, pageSize, search, activeFilter, deptFilter, gradeFilter, sortBy, sortOrder]);

  useEffect(() => { setPage(1); }, [tab, search, activeFilter, deptFilter, gradeFilter, sortBy, sortOrder]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const clearFilters = () => {
    setSearch("");
    setActiveFilter("");
    setDeptFilter("");
    setGradeFilter("");
  };

  const openEdit = (u: UserItem) => {
    setEditState({
      user: u,
      first_name: u.first_name ?? "",
      last_name: u.last_name ?? "",
      role: u.role,
      department_ids: u.departments.map((d) => d.id),
      student_no: u.student_no ?? "",
      grade_label: u.grade_label ?? "",
    });
  };

  const handleSave = async () => {
    if (!editState) return;
    setEditLoading(true);
    try {
      const { user: u, first_name, last_name, role, department_ids, student_no, grade_label } = editState;

      if (isAdmin) {
        await apiClient.patch(`/api/v1/users/${u.id}`, {
          first_name: first_name.trim() || undefined,
          last_name: last_name.trim() || undefined,
          role: role !== u.role ? role : undefined,
          department_ids: department_ids.length > 0 ? department_ids : undefined,
        });
      }

      if (u.role === "STUDENT") {
        await apiClient.patch(`/api/v1/users/${u.id}/student-info`, {
          student_no: student_no.trim() || undefined,
          grade_label: grade_label || undefined,
        });
      }

      toast.success("Kullanıcı güncellendi.");
      setEditState(null);
      fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Güncelleme başarısız.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/api/v1/users/${deleteTarget.id}`);
      toast.success(
        isAdmin
          ? `${deleteTarget.full_name} kalıcı olarak silindi.`
          : `${deleteTarget.full_name} pasifleştirildi.`
      );
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Silme işlemi başarısız.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const activeFilters: ActiveFilter[] = [
    ...(search ? [{ key: "search", label: "Arama", displayValue: search }] : []),
    ...(activeFilter ? [{ key: "active", label: "Durum", displayValue: activeFilter === "true" ? "Aktif" : "Pasif" }] : []),
    ...(deptFilter
      ? [{
          key: "dept",
          label: "Bölüm",
          displayValue: departments.find((d) => d.id === deptFilter)?.name ?? deptFilter,
        }]
      : []),
    ...(gradeFilter && tab === "STUDENT"
      ? [{ key: "grade", label: "Sınıf", displayValue: gradeFilter }]
      : []),
  ];

  const clearFilter = (key: string) => {
    if (key === "search") setSearch("");
    if (key === "active") setActiveFilter("");
    if (key === "dept") setDeptFilter("");
    if (key === "grade") setGradeFilter("");
  };

  const canEdit = (u: UserItem) => isAdmin || u.role === "STUDENT";

  const columns: Column<UserItem>[] = [
    {
      key: "full_name",
      header: "Ad Soyad",
      sortable: true,
      render: (u) => (
        <span className={`font-medium ${!u.is_active ? "text-gray-500" : "text-gray-100"}`}>
          {u.full_name}
        </span>
      ),
    },
    {
      key: "role",
      header: "Rol",
      render: (u) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            u.role === "STUDENT"
              ? "bg-emerald-900/20 text-emerald-400 border border-emerald-800/50"
              : u.role === "TEACHER"
              ? "bg-indigo-900/20 text-indigo-400 border border-indigo-800/50"
              : "bg-purple-900/20 text-purple-400 border border-purple-800/50"
          } ${!u.is_active ? "opacity-50" : ""}`}
        >
          {ROLE_LABEL[u.role] ?? u.role}
        </span>
      ),
    },
    {
      key: "departments",
      header: "Bölüm",
      render: (u) => (
        <span className={`${!u.is_active ? "text-gray-600" : "text-gray-400"}`}>
          {u.departments.map((d) => d.name).join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "student_no",
      header: "Okul No",
      render: (u) => (
        <span className={`font-mono ${!u.is_active ? "text-gray-600" : "text-gray-400"}`}>
          {u.student_no ?? "—"}
        </span>
      ),
    },
    {
      key: "grade",
      header: "Sınıf",
      render: (u) => (
        <span className={`${!u.is_active ? "text-gray-600" : "text-gray-400"}`}>
          {u.grade_label ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Durum",
      render: (u) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${
            u.is_active
              ? "bg-green-900/20 text-green-400 border-green-800/50"
              : "bg-gray-900/50 text-gray-500 border-gray-700"
          }`}
        >
          {u.is_active ? "Aktif" : "Pasif"}
        </span>
      ),
    },
    {
      key: "email",
      header: "E-posta",
      sortable: true,
      render: (u) => (
        <span className={`${!u.is_active ? "text-gray-600" : "text-gray-400"}`}>
          {u.email}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (u) => (
        <div className="flex items-center gap-1.5 justify-end">
          {canEdit(u) && (
            <button
              onClick={(e) => { e.stopPropagation(); openEdit(u); }}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700 hover:text-indigo-400 transition-colors"
              title="Düzenle"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(u); }}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700 hover:text-red-400 transition-colors"
            title={isAdmin ? "Kalıcı Sil" : "Pasifleştir"}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Tüm Kullanıcılar</h1>
        <p className="mt-1 text-sm text-gray-400">
          Sistemdeki tüm hesapları yönetin
        </p>
      </div>

      {/* Rol Tabları */}
      <div className="flex gap-1 rounded-xl border border-gray-800 bg-gray-900/50 p-1 w-fit backdrop-blur-sm shadow-sm">
        {(["all", "STUDENT", "TEACHER"] as TabRole[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              if (t !== "STUDENT") setGradeFilter("");
            }}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
              tab === t
                ? "bg-gray-800 text-white shadow-sm border border-gray-700"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
            }`}
          >
            {t === "all" ? "Tümü" : ROLE_LABEL[t]}
          </button>
        ))}
      </div>

      {/* Filtre Çubuğu */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/50 p-4 backdrop-blur-sm shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Ad, soyad veya e-posta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 text-gray-200"
          />
        </div>

        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
        >
          <option value="">Tüm Durumlar</option>
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </select>

        {departments.length > 0 && (
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
          >
            <option value="">Tüm Bölümler</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}

        {tab === "STUDENT" && (
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
          >
            <option value="">Tüm Sınıflar</option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        )}

        {activeFilters.length > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 rounded-lg border border-red-900/50 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Temizle
          </button>
        )}
      </div>

      {/* FilterPanel: aktif chiplar + sıralama */}
      <FilterPanel
        activeFilters={activeFilters}
        onRemoveFilter={clearFilter}
        onClearAll={clearFilters}
        sortBy={sortBy}
        sortOrder={sortOrder}
        sortOptions={SORT_OPTIONS}
        onSortChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
        resultCount={total}
      />

      <DataTable
        columns={columns}
        data={users}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        sortBy={sortBy}
        sortOrder={sortOrder}
        loading={loading}
        onSort={(col, order) => { setSortBy(col); setSortOrder(order); }}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        emptyMessage={
          activeFilters.length > 0
            ? "Filtrelere uyan kullanıcı bulunamadı."
            : "Kullanıcı bulunamadı."
        }
      />

      {/* Düzenleme Modalı */}
      {editState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !editLoading && setEditState(null)}
          />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Kullanıcı Düzenle</h2>
              <button
                onClick={() => setEditState(null)}
                disabled={editLoading}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ADMIN: Ad / Soyad / Rol / Bölümler */}
            {isAdmin && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Ad</label>
                    <input
                      value={editState.first_name}
                      onChange={(e) => setEditState((s) => s && { ...s, first_name: e.target.value })}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Soyad</label>
                    <input
                      value={editState.last_name}
                      onChange={(e) => setEditState((s) => s && { ...s, last_name: e.target.value })}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Rol</label>
                  <select
                    value={editState.role}
                    onChange={(e) => setEditState((s) => s && { ...s, role: e.target.value })}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                  >
                    <option value="STUDENT">Öğrenci</option>
                    <option value="TEACHER">Öğretmen</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                {departments.length > 0 && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Bölümler</label>
                    <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800/50 p-2">
                      {departments.map((d) => (
                        <label key={d.id} className="flex items-center gap-2 cursor-pointer px-1">
                          <input
                            type="checkbox"
                            checked={editState.department_ids.includes(d.id)}
                            onChange={(e) => {
                              const ids = editState.department_ids;
                              setEditState((s) => s && {
                                ...s,
                                department_ids: e.target.checked
                                  ? [...ids, d.id]
                                  : ids.filter((x) => x !== d.id),
                              });
                            }}
                            className="accent-indigo-500"
                          />
                          <span className="text-sm text-gray-300">{d.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Öğrenci bilgileri: sadece STUDENT rolündeki kullanıcılar için */}
            {editState.user.role === "STUDENT" && (
              <>
                {isAdmin && <hr className="border-gray-700" />}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Öğrenci No</label>
                    <input
                      value={editState.student_no}
                      onChange={(e) => setEditState((s) => s && { ...s, student_no: e.target.value })}
                      placeholder="123456789"
                      maxLength={9}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Sınıf</label>
                    <select
                      value={editState.grade_label}
                      onChange={(e) => setEditState((s) => s && { ...s, grade_label: e.target.value })}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                    >
                      <option value="">Seçiniz</option>
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => setEditState(null)}
                disabled={editLoading}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={editLoading}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {editLoading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Silme Onay Dialogu */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={isAdmin ? "Kullanıcıyı Kalıcı Sil" : "Kullanıcıyı Pasifleştir"}
        description={
          isAdmin ? (
            <span>
              <strong className="text-white">{deleteTarget?.full_name}</strong> adlı kullanıcı
              veritabanından kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </span>
          ) : (
            <span>
              <strong className="text-white">{deleteTarget?.full_name}</strong> adlı kullanıcı
              pasifleştirilecek. Hesap devre dışı bırakılır ama kayıt korunur.
            </span>
          )
        }
        confirmText={isAdmin ? "Kalıcı Sil" : "Pasifleştir"}
        isDestructive={isAdmin}
        loading={deleteLoading}
      />
    </div>
  );
}
