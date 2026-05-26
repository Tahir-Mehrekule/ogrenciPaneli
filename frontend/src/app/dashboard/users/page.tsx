"use client";

import React, { useEffect, useState, useCallback, useContext } from "react";
import { useSearchParams } from "next/navigation";
import apiClient from "@/lib/apiClient";
import { Search, X, Trash2, UserPlus, UserX, RotateCcw, Eye, Save } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable, Column } from "@/components/ui/DataTable";
import { FilterPanel, ActiveFilter, SortOption } from "@/components/ui/FilterPanel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FocusTrapContainer } from "@/components/ui/FocusTrapContainer";
import { AuthContext } from "@/context/AuthContext";
import { GRADE_OPTIONS } from "@/constants/grades";
import AdminCreateUserModal from "@/components/users/AdminCreateUserModal";

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

type StatusAction = "deactivate" | "restore";

interface StatusTarget {
  user: UserItem;
  action: StatusAction;
}

interface DetailEditState {
  email: string;
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

const normalizeRole = (role?: string) => (role ?? "").toUpperCase();
const roleToApiValue = (role?: string) => (role ?? "").toLowerCase();

const SORT_OPTIONS: SortOption[] = [
  { value: "created_at", label: "Kayıt Tarihi" },
  { value: "full_name", label: "Ad Soyad" },
  { value: "email", label: "E-posta" },
];

export default function UsersPage() {
  const { user: currentUser } = useContext(AuthContext);
  const currentRole = normalizeRole(currentUser?.role);
  const isAdmin = currentRole === "ADMIN";
  const isTeacher = currentRole === "TEACHER";

  // Query param desteği (Admin Plan B4): ?role=student&onlyMine=true ile geldiğinde
  // teacher için "Öğrencilerim" görünümü açılır.
  const searchParams = useSearchParams();
  const onlyMineParam = searchParams.get("onlyMine") === "true";
  const roleParam = (searchParams.get("role") || "").toLowerCase();
  const initialTab: TabRole = roleParam === "student" ? "STUDENT"
    : roleParam === "teacher" ? "TEACHER" : "all";
  // Teacher onlyMine=true → my-students endpoint'i kullan
  const useMyStudents = isTeacher && onlyMineParam;

  const [tab, setTab] = useState<TabRole>(initialTab);
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
  const [studentNoFilter, setStudentNoFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [viewUser, setViewUser] = useState<UserItem | null>(null);
  const [detailEdit, setDetailEdit] = useState<DetailEditState | null>(null);
  const [detailSaving, setDetailSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

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
      if (tab !== "all" && !useMyStudents) params.set("role", tab.toLowerCase());
      if (search) params.set("search", search);
      if (activeFilter) params.set("is_active", activeFilter);
      if (deptFilter) params.set("department_id", deptFilter);
      if (gradeFilter && tab === "STUDENT") params.set("grade_label", gradeFilter);
      if (studentNoFilter) params.set("student_no", studentNoFilter);

      // Teacher "Öğrencilerim" görünümünde my-students endpoint'i — bölüm bazlı süzme
      const endpoint = useMyStudents
        ? `/api/v1/users/my-students?${params}`
        : `/api/v1/users?${params}`;
      const { data } = await apiClient.get(endpoint);
      setUsers(data.items);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch {
      toast.error("Kullanıcılar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [tab, page, pageSize, search, activeFilter, deptFilter, gradeFilter, studentNoFilter, sortBy, sortOrder, useMyStudents]);

  useEffect(() => { setPage(1); }, [tab, search, activeFilter, deptFilter, gradeFilter, studentNoFilter, sortBy, sortOrder]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const clearFilters = () => {
    setSearch("");
    setActiveFilter("");
    setDeptFilter("");
    setGradeFilter("");
    setStudentNoFilter("");
  };

  const toDetailEditState = (u: UserItem): DetailEditState => ({
    email: u.email ?? "",
    first_name: u.first_name ?? "",
    last_name: u.last_name ?? "",
    role: normalizeRole(u.role),
    department_ids: u.departments.map((d) => d.id),
    student_no: u.student_no ?? "",
    grade_label: u.grade_label ?? "",
  });

  const openUserDetail = (u: UserItem) => {
    setViewUser(u);
    setDetailEdit(isAdmin ? toDetailEditState(u) : null);
  };

  const closeUserDetail = () => {
    if (detailSaving) return;
    setViewUser(null);
    setDetailEdit(null);
  };

  const handleDetailSave = async () => {
    if (!isAdmin || !viewUser || !detailEdit) return;
    setDetailSaving(true);
    try {
      await apiClient.patch(`/api/v1/users/${viewUser.id}`, {
        email: detailEdit.email.trim().toLowerCase() || undefined,
        first_name: detailEdit.first_name.trim() || undefined,
        last_name: detailEdit.last_name.trim() || undefined,
        role: normalizeRole(detailEdit.role) !== normalizeRole(viewUser.role)
          ? roleToApiValue(detailEdit.role)
          : undefined,
        department_ids: detailEdit.department_ids.length > 0 ? detailEdit.department_ids : undefined,
      });

      if (normalizeRole(detailEdit.role) === "STUDENT" || normalizeRole(viewUser.role) === "STUDENT") {
        await apiClient.patch(`/api/v1/users/${viewUser.id}/student-info`, {
          student_no: detailEdit.student_no.trim() || undefined,
          grade_label: detailEdit.grade_label || undefined,
        });
      }

      const { data: refreshedUser } = await apiClient.get<UserItem>(`/api/v1/users/${viewUser.id}`);
      setViewUser(refreshedUser);
      setDetailEdit(toDetailEditState(refreshedUser));
      fetchUsers();
      toast.success("Kullanıcı güncellendi.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Güncelleme başarısız.");
    } finally {
      setDetailSaving(false);
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
      setViewUser(null);
      fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Silme işlemi başarısız.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!statusTarget) return;
    setStatusLoading(true);
    try {
      const endpoint = statusTarget.action === "deactivate" ? "deactivate" : "restore";
      await apiClient.post(`/api/v1/users/${statusTarget.user.id}/${endpoint}`);
      toast.success(
        statusTarget.action === "deactivate"
          ? `${statusTarget.user.full_name} pasif duruma getirildi.`
          : `${statusTarget.user.full_name} tekrar aktif edildi.`
      );
      setStatusTarget(null);
      setViewUser(null);
      fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Durum güncellenemedi.");
    } finally {
      setStatusLoading(false);
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
    ...(studentNoFilter ? [{ key: "studentNo", label: "Okul No", displayValue: studentNoFilter }] : []),
  ];

  const clearFilter = (key: string) => {
    if (key === "search") setSearch("");
    if (key === "active") setActiveFilter("");
    if (key === "dept") setDeptFilter("");
    if (key === "grade") setGradeFilter("");
    if (key === "studentNo") setStudentNoFilter("");
  };

  const columns: Column<UserItem>[] = [
    {
      key: "full_name",
      header: "Ad Soyad",
      sortable: true,
      className: "max-w-[180px]",
      render: (u) => (
        <span
          className={`block max-w-[180px] truncate font-medium ${!u.is_active ? "text-gray-500" : "text-gray-100"}`}
          title={u.full_name}
        >
          {u.full_name}
        </span>
      ),
    },
    {
      key: "role",
      header: "Rol",
      filter: useMyStudents ? undefined : {
        value: tab === "all" ? "" : tab,
        options: [
          { value: "", label: "Tüm Roller" },
          { value: "STUDENT", label: ROLE_LABEL.STUDENT },
          { value: "TEACHER", label: ROLE_LABEL.TEACHER },
        ],
        onChange: (value) => {
          const nextTab = (value || "all") as TabRole;
          setTab(nextTab);
          if (nextTab !== "STUDENT") setGradeFilter("");
        },
      },
      render: (u) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            normalizeRole(u.role) === "STUDENT"
              ? "bg-emerald-900/20 text-emerald-400 border border-emerald-800/50"
              : normalizeRole(u.role) === "TEACHER"
              ? "bg-indigo-900/20 text-indigo-400 border border-indigo-800/50"
              : "bg-purple-900/20 text-purple-400 border border-purple-800/50"
          } ${!u.is_active ? "opacity-50" : ""}`}
        >
          {ROLE_LABEL[normalizeRole(u.role)] ?? u.role}
        </span>
      ),
    },
    {
      key: "departments",
      header: "Bölüm",
      filter: departments.length > 0 ? {
        value: deptFilter,
        options: [
          { value: "", label: "Tüm Bölümler" },
          ...departments.map((d) => ({ value: d.id, label: d.name })),
        ],
        onChange: setDeptFilter,
      } : undefined,
      className: "max-w-[180px]",
      render: (u) => (
        <span
          className={`block max-w-[180px] truncate ${!u.is_active ? "text-gray-600" : "text-gray-400"}`}
          title={u.departments.map((d) => d.name).join(", ") || "Bölüm yok"}
        >
          {u.departments.map((d) => d.name).join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "student_no",
      header: "Okul No",
      filter: {
        type: "text",
        value: studentNoFilter,
        placeholder: "Okul no ara...",
        onChange: setStudentNoFilter,
      },
      render: (u) => (
        <span className={`font-mono ${!u.is_active ? "text-gray-600" : "text-gray-400"}`}>
          {u.student_no ?? "—"}
        </span>
      ),
    },
    {
      key: "grade",
      header: "Sınıf",
      filter: {
        value: gradeFilter,
        options: [
          { value: "", label: "Tüm Sınıflar" },
          ...GRADE_OPTIONS.map((g) => ({ value: g, label: g })),
        ],
        onChange: (value) => {
          if (value) setTab("STUDENT");
          setGradeFilter(value);
        },
      },
      render: (u) => (
        <span className={`${!u.is_active ? "text-gray-600" : "text-gray-400"}`}>
          {u.grade_label ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Durum",
      filter: {
        value: activeFilter,
        options: [
          { value: "", label: "Tüm Durumlar" },
          { value: "true", label: "Aktif" },
          { value: "false", label: "Pasif" },
        ],
        onChange: (value) => setActiveFilter(value as typeof activeFilter),
      },
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
      className: "max-w-[220px]",
      render: (u) => (
        <span
          className={`block max-w-[220px] truncate ${!u.is_active ? "text-gray-600" : "text-gray-400"}`}
          title={u.email}
        >
          {u.email}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "sticky right-0 z-20 w-16 bg-gray-800/95",
      className: "sticky right-0 z-10 w-16 bg-gray-900/95 shadow-[-12px_0_16px_-16px_rgba(0,0,0,0.9)]",
      render: (u) => (
        <div className="flex min-w-[2.5rem] items-center justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openUserDetail(u);
            }}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700 hover:text-indigo-400 transition-colors"
            title="Detayları Görüntüle"
            aria-label="Detayları Görüntüle"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {useMyStudents ? "Öğrencilerim" : "Tüm Kullanıcılar"}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {useMyStudents
              ? "Bölümünüze atanmış öğrenciler"
              : "Sistemdeki tüm hesapları yönetin"}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow"
          >
            <UserPlus className="h-4 w-4" />
            Yeni Kullanıcı Ekle
          </button>
        )}
      </div>

      <AdminCreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => fetchUsers()}
      />


      {/* Rol Tabları — my-students modunda gizlenir (endpoint rol parametresini desteklemiyor) */}
      {!useMyStudents && (
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
      )}

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

      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Kullanıcı Detayı">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={closeUserDetail} />
          <FocusTrapContainer className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl">
            <div className={`h-1 w-full ${viewUser.is_active ? "bg-gradient-to-r from-emerald-400 to-teal-400" : "bg-gradient-to-r from-slate-500 to-slate-600"}`} />
            <div className="flex items-start justify-between gap-4 border-b border-gray-800 p-5">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-white">{viewUser.full_name}</h3>
                <p className="mt-1 truncate text-sm text-gray-400">{viewUser.email}</p>
              </div>
              <button onClick={closeUserDetail} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white" aria-label="Kapat">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {isAdmin ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="detail-email" className="mb-1 block text-xs text-gray-400">E-posta</label>
                    <input
                      id="detail-email"
                      value={detailEdit?.email ?? viewUser.email}
                      onChange={(e) => setDetailEdit((prev) => (prev ? { ...prev, email: e.target.value } : prev))}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="detail-first-name" className="mb-1 block text-xs text-gray-400">Ad</label>
                    <input
                      id="detail-first-name"
                      value={detailEdit?.first_name ?? viewUser.first_name}
                      onChange={(e) => setDetailEdit((prev) => (prev ? { ...prev, first_name: e.target.value } : prev))}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="detail-last-name" className="mb-1 block text-xs text-gray-400">Soyad</label>
                    <input
                      id="detail-last-name"
                      value={detailEdit?.last_name ?? viewUser.last_name}
                      onChange={(e) => setDetailEdit((prev) => (prev ? { ...prev, last_name: e.target.value } : prev))}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="detail-role" className="mb-1 block text-xs text-gray-400">Rol</label>
                    <select
                      id="detail-role"
                      value={detailEdit?.role ?? normalizeRole(viewUser.role)}
                      onChange={(e) => setDetailEdit((prev) => (prev ? { ...prev, role: e.target.value } : prev))}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                    >
                      <option value="STUDENT">Öğrenci</option>
                      <option value="TEACHER">Öğretmen</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Durum</label>
                    <div className={`rounded-lg border px-3 py-2 text-sm ${viewUser.is_active ? "border-emerald-700/40 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-800 text-slate-300"}`}>
                      {viewUser.is_active ? "Aktif" : "Pasif"}
                    </div>
                  </div>
                  {departments.length > 0 && (
                    <div className="sm:col-span-2">
                      <p className="mb-1.5 block text-xs text-gray-400" id="detail-dept-group-label">Bölümler</p>
                      <div role="group" aria-labelledby="detail-dept-group-label" className="grid max-h-36 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800/50 p-2 sm:grid-cols-2">
                        {departments.map((d) => {
                          const checked = detailEdit?.department_ids.includes(d.id) ?? false;
                          return (
                            <label key={d.id} className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-gray-800">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setDetailEdit((prev) => {
                                    if (!prev) return prev;
                                    const nextIds = e.target.checked
                                      ? [...prev.department_ids, d.id]
                                      : prev.department_ids.filter((id) => id !== d.id);
                                    return { ...prev, department_ids: nextIds };
                                  });
                                }}
                                className="accent-indigo-500"
                              />
                              <span className="text-sm text-gray-300">{d.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {normalizeRole(detailEdit?.role ?? viewUser.role) === "STUDENT" && (
                    <>
                      <div>
                        <label htmlFor="detail-student-no" className="mb-1 block text-xs text-gray-400">Öğrenci No</label>
                        <input
                          id="detail-student-no"
                          value={detailEdit?.student_no ?? ""}
                          onChange={(e) => setDetailEdit((prev) => (prev ? { ...prev, student_no: e.target.value } : prev))}
                          maxLength={9}
                          placeholder="123456789"
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-gray-200 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="detail-grade" className="mb-1 block text-xs text-gray-400">Sınıf</label>
                        <select
                          id="detail-grade"
                          value={detailEdit?.grade_label ?? ""}
                          onChange={(e) => setDetailEdit((prev) => (prev ? { ...prev, grade_label: e.target.value } : prev))}
                          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                        >
                          <option value="">Seçiniz</option>
                          {GRADE_OPTIONS.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-800 bg-gray-800/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Rol</p>
                    <p className="mt-1 text-sm font-medium text-gray-200">{ROLE_LABEL[normalizeRole(viewUser.role)] ?? viewUser.role}</p>
                  </div>
                  <div className="rounded-xl border border-gray-800 bg-gray-800/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Durum</p>
                    <p className={viewUser.is_active ? "mt-1 text-sm font-medium text-emerald-400" : "mt-1 text-sm font-medium text-gray-400"}>{viewUser.is_active ? "Aktif" : "Pasif"}</p>
                  </div>
                  <div className="rounded-xl border border-gray-800 bg-gray-800/40 p-4 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Bölümler</p>
                    <p className="mt-1 text-sm text-gray-200">{viewUser.departments.map((d) => d.name).join(", ") || "—"}</p>
                  </div>
                  {normalizeRole(viewUser.role) === "STUDENT" && (
                    <>
                      <div className="rounded-xl border border-gray-800 bg-gray-800/40 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Öğrenci No</p>
                        <p className="mt-1 font-mono text-sm text-gray-200">{viewUser.student_no ?? "—"}</p>
                      </div>
                      <div className="rounded-xl border border-gray-800 bg-gray-800/40 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Sınıf</p>
                        <p className="mt-1 text-sm text-gray-200">{viewUser.grade_label ?? "—"}</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-gray-800 bg-gray-900/95 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                Kayıt: {new Date(viewUser.created_at).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                {isAdmin && (
                  <button
                    onClick={() => setStatusTarget({ user: viewUser, action: viewUser.is_active ? "deactivate" : "restore" })}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${viewUser.is_active ? "border-amber-700/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20" : "border-emerald-700/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"}`}
                  >
                    {viewUser.is_active ? <UserX className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                    {viewUser.is_active ? "Pasif Yap" : "Aktif Et"}
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => setDeleteTarget(viewUser)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-800/50 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Kalıcı Sil
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={handleDetailSave}
                    disabled={detailSaving}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {detailSaving ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                )}
              </div>
            </div>
          </FocusTrapContainer>
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

      <ConfirmDialog
        isOpen={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusChange}
        title={statusTarget?.action === "deactivate" ? "Kullanıcıyı Pasife Al" : "Kullanıcıyı Aktif Et"}
        description={
          statusTarget ? (
            <span>
              <strong className="text-white">{statusTarget.user.full_name}</strong> adlı kullanıcı
              {statusTarget.action === "deactivate"
                ? " pasif duruma getirilecek. Hesap korunur ama aktif kullanıcı listelerinde görünmez."
                : " tekrar aktif duruma getirilecek."}
            </span>
          ) : ""
        }
        confirmText={statusTarget?.action === "deactivate" ? "Pasife Al" : "Aktif Et"}
        isDestructive={statusTarget?.action === "deactivate"}
        loading={statusLoading}
      />
    </div>
  );
}
