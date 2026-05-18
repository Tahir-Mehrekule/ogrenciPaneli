"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { FilterPanel, ActiveFilter, SortOption } from "@/components/ui/FilterPanel";
import { useSortableTable } from "@/hooks/useSortableTable";
import ClassTabs from "@/components/ui/ClassTabs";
import { FolderKanban, Plus, Search, X, LayoutGrid, List, CheckCircle, XCircle, FileText, Clock, Play, CheckCheck, Github } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type ProjectStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "COMPLETED";

interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  created_by: string;
  created_by_name: string | null;
  course_id: string | null;
  course_name: string | null;
  course_code: string | null;
  project_type: string | null;
  created_at: string;
  github_url: string | null;
}

interface CourseOption {
  id: string;
  name: string;
  code: string;
}

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; className: string; icon: LucideIcon }
> = {
  DRAFT:       { label: "Taslak",        className: "bg-slate-700/60 text-slate-300 border-slate-600/50",        icon: FileText   },
  PENDING:     { label: "Bekliyor",      className: "bg-amber-500/15 text-amber-400 border-amber-500/30",        icon: Clock      },
  APPROVED:    { label: "Onaylı",        className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",  icon: CheckCircle},
  REJECTED:    { label: "Reddedildi",    className: "bg-red-500/15 text-red-400 border-red-500/30",              icon: XCircle    },
  IN_PROGRESS: { label: "Devam Ediyor",  className: "bg-blue-500/15 text-blue-400 border-blue-500/30",          icon: Play       },
  COMPLETED:   { label: "Tamamlandı",    className: "bg-teal-500/15 text-teal-400 border-teal-500/30",          icon: CheckCheck },
};

const SORT_OPTIONS: SortOption[] = [
  { value: "created_at", label: "Oluşturma Tarihi" },
  { value: "title", label: "Proje Adı" },
  { value: "status", label: "Durum" },
  { value: "created_by_name", label: "Öğrenci" },
  { value: "course_name", label: "Ders" },
];

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toUpperCase() as ProjectStatus;
  const cfg = STATUS_CONFIG[normalized] ?? {
    label: status,
    className: "bg-slate-700 text-slate-300 border-slate-600",
    icon: FileText,
  };
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${cfg.className}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [courseFilter, setCourseFilter] = useState("");
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);

  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [rejectModal, setRejectModal] = useState<{ id: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const isStaff = role === "TEACHER" || role === "ADMIN";

  const { sorted: sortedProjects, sortKey: sortBy, sortOrder, toggleSort } =
    useSortableTable(projects, { defaultKey: "created_at", defaultOrder: "desc" });

  // Ders filtre seçeneklerini yükle (teacher/admin için)
  useEffect(() => {
    if (!isStaff) return;
    apiClient.get("/api/v1/courses?size=200").then((res) => {
      setCourseOptions(res.data?.items ?? []);
    }).catch(() => {});
  }, [isStaff]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(pageSize),
        sort_by: sortBy,
        order: sortOrder,
      });
      if (search)         params.set("search", search);
      if (studentSearch)  params.set("student_search", studentSearch);
      if (statusFilter) {
        // ADMIN_PLAN_2 E1: backend ProjectStatus enum lowercase ("draft"/"pending"/...); 422'yi önle.
        params.set("status", statusFilter.toLowerCase());
      } else if (role !== "STUDENT") {
        // Admin Plan B2: staff (TEACHER+ADMIN) DRAFT görmez; sadece sahip öğrenci kendi DRAFT'ını görür.
        params.set("exclude_status", "draft");
      }
      if (gradeFilter)  params.set("grade_label", gradeFilter);
      if (branchFilter) params.set("branch_code", branchFilter);
      if (courseFilter) params.set("course_id", courseFilter);
      const { data } = await apiClient.get(`/api/v1/projects?${params}`);
      setProjects(data.items);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch (err: unknown) {
      // ADMIN_PLAN_2 E1: Pydantic 422 detail bazen array dönebilir; array-safe handler.
      const detail = (err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d?.msg || JSON.stringify(d)).join(", ")
          : "Projeler yüklenemedi.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [search, studentSearch, statusFilter, gradeFilter, branchFilter, courseFilter, page, pageSize, sortBy, sortOrder, role]);

  useEffect(() => {
    setPage(1);
  }, [search, studentSearch, statusFilter, gradeFilter, branchFilter, courseFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.post(`/api/v1/projects/${id}/approve`);
      fetchProjects();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "Onaylama başarısız.");
    }
  };

  const handleReject = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRejectModal({ id, title });
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectModal || rejectReason.trim().length < 10) return;
    setRejecting(true);
    try {
      await apiClient.post(`/api/v1/projects/${rejectModal.id}/reject`, { reason: rejectReason.trim() });
      setRejectModal(null);
      fetchProjects();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "Reddetme başarısız.");
    } finally {
      setRejecting(false);
    }
  };

  const activeFilters: ActiveFilter[] = [
    ...(search ? [{ key: "search", label: "Arama", displayValue: search }] : []),
    ...(studentSearch ? [{ key: "student", label: "Öğrenci", displayValue: studentSearch }] : []),
    ...(statusFilter
      ? [{ key: "status", label: "Durum", displayValue: STATUS_CONFIG[statusFilter.toUpperCase() as ProjectStatus]?.label ?? statusFilter }]
      : []),
    ...(gradeFilter ? [{ key: "grade", label: "Sınıf", displayValue: gradeFilter }] : []),
    ...(branchFilter ? [{ key: "branch", label: "Şube", displayValue: `${branchFilter} Şubesi` }] : []),
    ...(courseFilter
      ? [{ key: "course", label: "Ders", displayValue: courseOptions.find((c) => c.id === courseFilter)?.name ?? courseFilter }]
      : []),
  ];

  const clearFilter = (key: string) => {
    if (key === "search") setSearch("");
    if (key === "student") setStudentSearch("");
    if (key === "status") setStatusFilter("");
    if (key === "grade") { setGradeFilter(""); setBranchFilter(null); setShowAllBranches(false); }
    if (key === "branch") setBranchFilter(null);
    if (key === "course") setCourseFilter("");
  };

  const columns: Column<Project>[] = [
    {
      key: "title",
      header: "Proje Adı",
      sortable: true,
      render: (p) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-100">{p.title}</span>
            {p.github_url && (
              <a
                href={p.github_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="GitHub Reposu"
                className="text-gray-500 hover:text-indigo-400 transition-colors"
              >
                <Github className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <span className="text-xs text-gray-500 line-clamp-1 max-w-[220px]">
            {p.description}
          </span>
        </div>
      ),
    },
    ...(isStaff
      ? [{
          key: "created_by_name",
          header: "Öğrenci",
          sortable: true,
          render: (p: Project) => (
            <span className="text-sm text-gray-300">
              {p.created_by_name ?? "—"}
            </span>
          ),
        }]
      : []),
    {
      key: "course_name",
      header: "Ders",
      sortable: true,
      render: (p) => (
        <div className="flex flex-col gap-0.5">
          {p.course_code && (
            <span className="text-xs font-mono bg-indigo-900/20 border border-indigo-800/30 text-indigo-400 rounded-md px-1.5 py-0.5 w-fit">
              {p.course_code}
            </span>
          )}
          <span className="text-sm text-gray-400">
            {p.course_name ?? "Ders Atanmamış"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Durum",
      sortable: true,
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: "created_at",
      header: "Tarih",
      sortable: true,
      render: (p) => (
        <span className="text-sm text-gray-500">
          {new Date(p.created_at).toLocaleDateString("tr-TR")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (p) => {
        const normalized = p.status?.toUpperCase();
        if (isStaff && normalized === "PENDING") {
          return (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={(e) => handleApprove(p.id, e)}
                title="Onayla"
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle className="h-3.5 w-3.5" /> Onayla
              </button>
              <button
                onClick={(e) => handleReject(p.id, p.title, e)}
                title="Reddet"
                className="flex items-center gap-1 rounded-lg bg-red-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-800 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" /> Reddet
              </button>
            </div>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {isStaff ? "Tüm Projeler" : "Projelerim"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isStaff
              ? "Sistemdeki tüm projeler."
              : "Oluşturduğunuz tüm projeler."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Görünüm Toggle */}
          <div className="flex rounded-lg border border-gray-700 bg-gray-800/50 p-0.5">
            <button
              onClick={() => setViewMode("table")}
              title="Tablo Görünümü"
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "table"
                  ? "bg-gray-700 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("card")}
              title="Kart Görünümü"
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "card"
                  ? "bg-gray-700 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {role === "STUDENT" && (
            <button
              onClick={() => router.push("/dashboard/projects/new")}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Yeni Proje
            </button>
          )}
        </div>
      </div>

      {/* Filtre Çubuğu */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Proje adı veya açıklaması..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
          />
        </div>
        {/* Öğrenci ara (sadece staff) */}
        {isStaff && (
          <div className="relative min-w-44">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Öğrenci ara (ad/e-posta)"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
            />
          </div>
        )}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 outline-none focus:border-indigo-400"
        >
          <option value="">{role !== "STUDENT" ? "Taslak Hariç Tümü" : "Tüm Durumlar"}</option>
          {role === "STUDENT" && <option value="DRAFT">Taslak</option>}
          <option value="PENDING">Bekliyor</option>
          <option value="APPROVED">Onaylı</option>
          <option value="REJECTED">Reddedildi</option>
          <option value="IN_PROGRESS">Devam Ediyor</option>
          <option value="COMPLETED">Tamamlandı</option>
        </select>

        {/* Sınıf filtresi */}
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 outline-none focus:border-indigo-400"
        >
          <option value="">Tüm Sınıflar</option>
          <option value="1. Sınıf">1. Sınıf</option>
          <option value="2. Sınıf">2. Sınıf</option>
          <option value="3. Sınıf">3. Sınıf</option>
          <option value="4. Sınıf">4. Sınıf</option>
        </select>

        {/* Ders filtresi (sadece staff) */}
        {isStaff && courseOptions.length > 0 && (
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 outline-none focus:border-indigo-400"
          >
            <option value="">Tüm Dersler</option>
            {courseOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
            ))}
          </select>
        )}

        {(search || studentSearch || statusFilter || gradeFilter || courseFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setStudentSearch("");
              setStatusFilter("");
              setGradeFilter("");
              setCourseFilter("");
            }}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800/40 dark:text-red-400 dark:hover:bg-red-900/10"
          >
            <X className="h-3.5 w-3.5" /> Temizle
          </button>
        )}
      </div>

      {/* FilterPanel: aktif chiplar + sıralama */}
      <FilterPanel
        activeFilters={activeFilters}
        onRemoveFilter={clearFilter}
        onClearAll={() => {
          setSearch("");
          setStudentSearch("");
          setStatusFilter("");
          setGradeFilter("");
          setBranchFilter(null);
          setShowAllBranches(false);
          setCourseFilter("");
        }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        sortOptions={SORT_OPTIONS}
        onSortChange={toggleSort}
        resultCount={total}
      />

      {/* Sınıf sekmeleri (staff için) */}
      {isStaff && (
        <ClassTabs
          activeGrade={gradeFilter || null}
          activeBranch={branchFilter}
          showAllBranches={showAllBranches}
          onChange={({ grade, branch, showAll }) => {
            setGradeFilter(grade ?? "");
            setBranchFilter(branch);
            setShowAllBranches(showAll);
          }}
        />
      )}

      {/* Hata */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ─── TABLO GÖRÜNÜMÜ ─── */}
      {viewMode === "table" && (
        <DataTable
          columns={columns}
          data={sortedProjects}
          total={total}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          sortBy={sortBy}
          sortOrder={sortOrder}
          loading={loading}
          onSort={toggleSort}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          onRowClick={(p) => router.push(`/dashboard/projects/${p.id}`)}
          emptyMessage={
            search || statusFilter
              ? "Filtrelere uyan proje bulunamadı."
              : isStaff
              ? "Henüz gönderilmiş proje yok."
              : "Henüz bir proje oluşturmadınız."
          }
        />
      )}

      {/* ─── KART GÖRÜNÜMÜ ─── */}
      {viewMode === "card" && !loading && (
        <>
          {projects.length === 0 && !error && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <FolderKanban className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  {isStaff
                    ? "Henüz gönderilmiş proje yok."
                    : "Henüz bir proje oluşturmadınız."}
                </p>
              </CardContent>
            </Card>
          )}

          {(() => {
            const grouped = projects.reduce(
              (acc, project) => {
                const key = project.course_name ?? "Ders Atanmamış";
                if (!acc[key])
                  acc[key] = { code: project.course_code, projects: [] };
                acc[key].projects.push(project);
                return acc;
              },
              {} as Record<
                string,
                { code: string | null; projects: Project[] }
              >
            );

            return Object.entries(grouped).map(
              ([courseName, { code, projects: courseProjects }]) => (
                <div key={courseName} className="space-y-4">
                  <div className="flex items-center gap-3">
                    {code && (
                      <span className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs font-bold text-indigo-400">
                        {code}
                      </span>
                    )}
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {courseName}
                    </h3>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                    <span className="text-xs text-gray-400">
                      {courseProjects.length} proje
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {courseProjects.map((project) => (
                      <Card
                        key={project.id}
                        className="cursor-pointer hover:ring-2 hover:ring-indigo-500/30 transition-all"
                        onClick={() =>
                          router.push(`/dashboard/projects/${project.id}`)
                        }
                      >
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-3">
                            <StatusBadge status={project.status} />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(project.created_at).toLocaleDateString(
                                "tr-TR"
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {project.title}
                            </h3>
                            {project.github_url && (
                              <a
                                href={project.github_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="GitHub Reposu"
                                className="text-gray-500 hover:text-indigo-400 transition-colors"
                              >
                                <Github className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                            {project.description}
                          </p>

                          {isStaff &&
                            project.status?.toUpperCase() === "PENDING" && (
                              <div
                                className="mt-4 flex gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => handleApprove(project.id, e)}
                                  className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                                >
                                  Onayla
                                </button>
                                <button
                                  onClick={(e) => handleReject(project.id, project.title, e)}
                                  className="flex-1 rounded-lg bg-red-700 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
                                >
                                  Reddet
                                </button>
                              </div>
                            )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            );
          })()}

          {/* Kart görünümünde de pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-gray-800/50 bg-gray-900/30 p-4 text-sm text-gray-400">
              <span>
                Toplam <strong className="text-white">{total}</strong> proje
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs hover:bg-gray-700 disabled:opacity-40"
                >
                  Önceki
                </button>
                <span>
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs hover:bg-gray-700 disabled:opacity-40"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {viewMode === "card" && loading && (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-gray-400">Projeler yükleniyor...</p>
        </div>
      )}

      {/* B2 — Reddetme Sebebi Modalı */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setRejectModal(null)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Projeyi Reddet</h3>
            <p className="text-sm text-gray-400">
              <span className="font-medium text-gray-200">{rejectModal.title}</span> projesini reddediyorsunuz.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">
                Reddetme Sebebi <span className="text-red-400">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Öğrenciye iletilecek reddetme sebebini yazın... (min 10 karakter)"
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-gray-200 outline-none focus:border-red-500 resize-none"
              />
              <p className="text-xs text-gray-500 text-right">{rejectReason.length}/2000</p>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => setRejectModal(null)}
                className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800"
              >
                Vazgeç
              </button>
              <button
                onClick={confirmReject}
                disabled={rejecting || rejectReason.trim().length < 10}
                className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejecting ? "Reddediliyor..." : "Reddet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
