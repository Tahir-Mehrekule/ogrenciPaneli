"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FocusTrapContainer } from "@/components/ui/FocusTrapContainer";
import { SkeletonDetail } from "@/components/ui/Skeleton";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SoftDeleteModal } from "@/components/ui/SoftDeleteModal";
import { CheckCircle, Circle, Clock, Plus, Pencil, X, Users, UserPlus, Search, Crown, Github, Trash2, User, Calendar, GripVertical } from "lucide-react";
import toast from "react-hot-toast";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

type ProjectStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
type ProjectType = "individual" | "team" | "both";
type MemberStatus = "ACTIVE" | "INVITED" | "JOIN_REQUESTED" | "REJECTED";

interface Project {
  id: string; title: string; description: string;
  status: ProjectStatus; created_by: string;
  project_type?: ProjectType; created_by_name?: string;
  github_url?: string | null;
  rejection_reason?: string | null;
  course_id?: string | null;
  department_id?: string | null;
  share_code?: string | null;
}
interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  due_date: string | null;
  ai_suggested: boolean;
  assigned_to?: string | null;
  assignee_name?: string | null;
}

interface MemberUser { id: string; name: string; email: string; grade_label?: string; }
interface ProjectMember { id: string; user_id: string; role: string; status: MemberStatus; user?: MemberUser; }
interface PendingMember  { id: string; user_id: string; status: MemberStatus; user?: MemberUser; }
interface UserSearchResult { id: string; name: string; email: string; student_no?: string; }

const PROJECT_STATUS: Record<ProjectStatus, { label: string; className: string }> = {
  DRAFT:    { label: "Taslak",     className: "bg-slate-700 text-slate-300" },
  PENDING:  { label: "Bekliyor",   className: "bg-amber-500/20 text-amber-400" },
  APPROVED: { label: "Onaylı",     className: "bg-emerald-500/20 text-emerald-400" },
  REJECTED: { label: "Reddedildi", className: "bg-red-500/20 text-red-400" },
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "Yapılacak",
  IN_PROGRESS: "Devam Ediyor",
  REVIEW: "İncelemede",
  DONE: "Tamamlandı",
};

// Backend TASK_TRANSITIONS ile uyumlu, rol-aware ileri geçiş.
// STUDENT REVIEW → DONE yapamaz (öğretmen onayı gerekir).
const TASK_STATUS_NEXT_BY_ROLE: Record<string, Partial<Record<TaskStatus, TaskStatus>>> = {
  STUDENT: {
    TODO: "IN_PROGRESS",
    IN_PROGRESS: "REVIEW",
    REVIEW: "IN_PROGRESS",
  },
  TEACHER: {
    TODO: "IN_PROGRESS",
    IN_PROGRESS: "REVIEW",
    REVIEW: "DONE",
  },
  ADMIN: {
    TODO: "IN_PROGRESS",
    IN_PROGRESS: "REVIEW",
    REVIEW: "DONE",
  },
};

// ── Proje Düzenleme Modalı (FE-2) ────────────────────────────────────────────
interface EditProjectModalProps {
  project: { id: string; title: string; description: string; github_url?: string | null };
  onClose: () => void;
  onUpdated: () => void;
}

function EditProjectModal({ project, onClose, onUpdated }: EditProjectModalProps) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [githubUrl, setGithubUrl] = useState(project.github_url ?? "");
  const [loading, setLoading] = useState(false);

  const inputCls =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) return toast.error("Başlık en az 3 karakter olmalıdır.");
    if (description.trim().length < 10) return toast.error("Açıklama en az 10 karakter olmalıdır.");

    try {
      setLoading(true);
      await apiClient.patch(`/api/v1/projects/${project.id}`, {
        title: title.trim(),
        description: description.trim(),
        ...(githubUrl.trim() ? { github_url: githubUrl.trim() } : {}),
      });
      toast.success("Proje başarıyla güncellendi.");
      onUpdated();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Güncelleme başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Projeyi Düzenle">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <FocusTrapContainer className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-purple-500" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Projeyi Düzenle</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5" htmlFor="edit-title">
                Başlık <span className="text-red-400">*</span>
              </label>
              <input
                id="edit-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5" htmlFor="edit-desc">
                Açıklama <span className="text-red-400">*</span>
              </label>
              <textarea
                id="edit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className={inputCls + " resize-none"}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5" htmlFor="edit-github">
                GitHub URL <span className="text-gray-400 font-normal">(opsiyonel)</span>
              </label>
              <input
                id="edit-github"
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/kullanici/repo"
                className={inputCls}
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" type="button" onClick={onClose}>İptal</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </Button>
            </div>
          </form>
        </div>
      </FocusTrapContainer>
    </div>
  );
}

// ── Üye Davet Modalı ─────────────────────────────────────────────────────────
interface InviteMemberModalProps {
  projectId: string;
  departmentId?: string | null;
  excludeUserIds: Set<string>;
  currentUserId?: string;
  onClose: () => void;
  onInvited: () => void;
}

function InviteMemberModal({ projectId, departmentId, excludeUserIds, currentUserId, onClose, onInvited }: InviteMemberModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState<string | null>(null);
  // Modal açıkken davet edilenleri anlık tutmak için lokal set
  const [invitedLocal, setInvitedLocal] = useState<Set<string>>(new Set());

  const fetchUsers = useCallback(async (q: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (departmentId) params.set("department_id", departmentId);
      params.set("limit", "50");
      const { data } = await apiClient.get<UserSearchResult[]>(`/api/v1/users/search?${params.toString()}`);
      const filtered = (data ?? []).filter((u) => u.id !== currentUserId);
      setResults(filtered);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [departmentId, currentUserId]);

  // İlk yükleme: boş query → bölüm öğrencileri
  useEffect(() => {
    fetchUsers("");
  }, [fetchUsers]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => fetchUsers(query), 300);
    return () => clearTimeout(t);
  }, [query, fetchUsers]);

  const handleInvite = async (userId: string) => {
    try {
      setInviteLoading(userId);
      await apiClient.post(`/api/v1/projects/${projectId}/invite`, { user_id: userId });
      toast.success("Davet gönderildi.");
      setInvitedLocal((prev) => new Set(prev).add(userId));
      onInvited();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      toast.error(detail || "Davet gönderilemedi.");
    } finally {
      setInviteLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Ekip Üyesi Davet Et">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <FocusTrapContainer className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-cyan-500" />
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-400" />
              Ekip Arkadaşı Davet Et
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {departmentId ? "Bölümünüzdeki öğrenciler listeleniyor." : "Tüm öğrenciler aranabilir."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Ad, e-posta veya öğrenci no ile ara..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {loading && (
            <p className="text-xs text-gray-400 py-3 text-center">Yükleniyor...</p>
          )}

          {!loading && results.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 p-6 text-center">
              <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-400">
                {query.trim() ? "Sonuç bulunamadı." : "Listelenecek öğrenci yok."}
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-1 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              {results.map((u) => {
                const already = excludeUserIds.has(u.id) || invitedLocal.has(u.id);
                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                        {u.name?.charAt(0).toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {u.email}{u.student_no ? ` · ${u.student_no}` : ""}
                        </p>
                      </div>
                    </div>
                    <button
                      disabled={already || inviteLoading === u.id}
                      onClick={() => handleInvite(u.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {invitedLocal.has(u.id) ? "Davet Edildi" : already ? "Zaten Eklendi" : inviteLoading === u.id ? "Gönderiliyor..." : "Davet Et"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </FocusTrapContainer>
    </div>
  );
}

// ── Status Geçiş Yetki Kontrolü (Backend TASK_TRANSITIONS ile uyumlu) ────────
function canTransition(
  from: TaskStatus,
  to: TaskStatus,
  role: string | undefined,
  isCreator: boolean,
): boolean {
  if (from === to) return false;
  const r = (role ?? "STUDENT").toUpperCase();
  // Proje sahibi (creator) ve ADMIN her geçişi yapabilir (ileri + geri)
  if (isCreator || r === "ADMIN") return true;

  const map: Record<TaskStatus, Partial<Record<TaskStatus, string[]>>> = {
    TODO: { IN_PROGRESS: ["STUDENT", "TEACHER"] },
    IN_PROGRESS: {
      REVIEW: ["STUDENT", "TEACHER"],
      TODO: ["STUDENT", "TEACHER"],
    },
    REVIEW: {
      DONE: ["TEACHER"],
      IN_PROGRESS: ["TEACHER"],
    },
    DONE: {},
  };
  const allowed = map[from]?.[to];
  if (!allowed) return false;
  return allowed.includes(r);
}

// ── Görev Detay/Düzenleme Modalı ─────────────────────────────────────────────
interface TaskDetailModalProps {
  task: Task;
  isCreatorOrAdmin: boolean;
  isCreator: boolean;
  role?: string;
  assigneeOptions: AssigneeOption[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  onStatusChanged: (taskId: string, newStatus: TaskStatus) => void;
}

function TaskDetailModal({ task, isCreatorOrAdmin, isCreator, role, assigneeOptions, onClose, onSaved, onDeleted, onStatusChanged }: TaskDetailModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [assignedTo, setAssignedTo] = useState<string>(task.assigned_to ?? "");
  const [currentStatus, setCurrentStatus] = useState<TaskStatus>(
    ((task.status as string)?.toUpperCase() as TaskStatus) ?? "TODO"
  );
  const [statusLoading, setStatusLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const statusKey = currentStatus;
  const inputCls =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCreatorOrAdmin) return;
    if (title.trim().length < 3) return toast.error("Başlık en az 3 karakter olmalıdır.");
    if (description.trim().length < 5) return toast.error("Açıklama en az 5 karakter olmalıdır.");
    try {
      setLoading(true);
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
      };
      if (assignedTo) payload.assigned_to = assignedTo;
      await apiClient.patch(`/api/v1/tasks/${task.id}`, payload);
      toast.success("Görev güncellendi.");
      onSaved();
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      toast.error(detail || "Güncelleme başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isCreatorOrAdmin) return;
    if (!confirm(`"${task.title}" görevini silmek istediğinize emin misiniz?`)) return;
    try {
      setDeleting(true);
      await apiClient.delete(`/api/v1/tasks/${task.id}`);
      toast.success("Görev silindi.");
      onDeleted();
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      toast.error(detail || "Silme başarısız.");
    } finally {
      setDeleting(false);
    }
  };

  const statusBadge: Record<TaskStatus, string> = {
    TODO: "bg-slate-500/10 text-slate-400 border-slate-500/30",
    IN_PROGRESS: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    REVIEW: "bg-violet-500/10 text-violet-400 border-violet-500/30",
    DONE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Görev Detayı">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <FocusTrapContainer className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-cyan-500" />
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Görev Detayı</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusBadge[statusKey]}`}>
              {TASK_STATUS_LABELS[statusKey]}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Başlık</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!isCreatorOrAdmin}
              className={inputCls + " disabled:opacity-70"}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Açıklama</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={!isCreatorOrAdmin}
              className={inputCls + " resize-none disabled:opacity-70"}
            />
          </div>

          {isCreatorOrAdmin && assigneeOptions.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Atanan Kişi</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className={inputCls}
              >
                <option value="">— Seçilmemiş —</option>
                {assigneeOptions.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}

          {!isCreatorOrAdmin && task.assignee_name && (
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 px-3 py-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Atanan</p>
              <p className="text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />{task.assignee_name}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Durum</label>
            <select
              value={currentStatus}
              disabled={statusLoading}
              onChange={async (e) => {
                const target = e.target.value as TaskStatus;
                if (target === currentStatus) return;
                if (!canTransition(currentStatus, target, role, isCreator)) {
                  toast.error("Bu durum geçişi için yetkiniz yok.");
                  return;
                }
                try {
                  setStatusLoading(true);
                  await apiClient.patch(`/api/v1/tasks/${task.id}/status`, { status: target.toLowerCase() });
                  setCurrentStatus(target);
                  onStatusChanged(task.id, target);
                  toast.success(`Durum: ${TASK_STATUS_LABELS[target]}`);
                } catch (err: unknown) {
                  const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
                  toast.error(detail || "Durum güncellenemedi.");
                } finally {
                  setStatusLoading(false);
                }
              }}
              className={inputCls + " disabled:opacity-70"}
            >
              {(["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as TaskStatus[]).map((s) => {
                const isCurrent = s === currentStatus;
                const isAllowed = isCurrent || canTransition(currentStatus, s, role, isCreator);
                return (
                  <option key={s} value={s} disabled={!isAllowed}>
                    {TASK_STATUS_LABELS[s]}{!isAllowed ? " (yetki yok)" : ""}
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {currentStatus === "REVIEW" && !isCreator && role !== "TEACHER" && role !== "ADMIN"
                ? "Tamamlandı durumuna yalnız proje sahibi/öğretmen/admin geçirebilir."
                : "Durumu değiştirdiğinizde anında kaydedilir."}
            </p>
          </div>
        </form>

        {isCreatorOrAdmin && (
          <div className="p-5 border-t border-gray-200 dark:border-gray-800 flex justify-between gap-3">
            <Button variant="outline" type="button" onClick={handleDelete} disabled={deleting} className="border-red-500/40 text-red-400 hover:bg-red-500/10">
              {deleting ? "Siliniyor..." : "Sil"}
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" type="button" onClick={onClose}>İptal</Button>
              <Button type="button" onClick={handleSave} disabled={loading}>
                {loading ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        )}
      </FocusTrapContainer>
    </div>
  );
}

// ── Drag-Drop Kanban Komponentleri ───────────────────────────────────────────
function DraggableTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const statusKey = (task.status as string)?.toUpperCase() as TaskStatus;
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: isDragging ? 50 : "auto" as const }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group ${isDragging ? "opacity-50" : ""}`}
    >
      <Card className="hover:ring-2 hover:ring-indigo-500/30 transition-all">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            {/* Drag handle */}
            <button
              {...listeners}
              {...attributes}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-200 shrink-0 mt-0.5"
              aria-label="Görevi sürükle"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            {/* Content (click → modal) */}
            <button
              type="button"
              onClick={onClick}
              className="flex-1 text-left"
            >
              <div className="flex items-start gap-2">
                {statusKey === "DONE"
                  ? <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  : statusKey === "REVIEW"
                  ? <Clock className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                  : statusKey === "IN_PROGRESS"
                  ? <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  : <Circle className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium line-clamp-1 break-all ${statusKey === "DONE" ? "line-through text-gray-500" : "text-gray-900 dark:text-white"}`}>
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 break-all">{task.description}</p>
                  {task.assignee_name && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-cyan-400">
                      <User className="h-3 w-3" />
                      <span className="truncate">{task.assignee_name}</span>
                    </div>
                  )}
                  {task.ai_suggested && (
                    <span className="mt-1 inline-block text-xs text-indigo-400">🤖 AI Önerisi</span>
                  )}
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DroppableColumn({ status, children }: { status: TaskStatus; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 rounded-xl p-1 transition-colors ${isOver ? "bg-indigo-500/5 ring-2 ring-indigo-500/30" : ""}`}
    >
      {children}
    </div>
  );
}

// ── Görev Oluşturma Modalı ───────────────────────────────────────────────────
interface AssigneeOption { id: string; name: string; }

interface NewTaskModalProps {
  projectId: string;
  isTeamProject: boolean;
  canAssignToOthers: boolean;
  assigneeOptions: AssigneeOption[]; // Atanabilir kullanıcılar (creator + aktif üyeler)
  currentUserId?: string;
  onClose: () => void;
  onCreated: () => void;
}

function NewTaskModal({ projectId, isTeamProject, canAssignToOthers, assigneeOptions, currentUserId, onClose, onCreated }: NewTaskModalProps) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  // Boş string → backend'de current_user.id'ye düşer (oto atama)
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const inputCls =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) return toast.error("Başlık en az 3 karakter olmalıdır.");
    if (desc.trim().length < 5) return toast.error("Açıklama en az 5 karakter olmalıdır.");
    try {
      setLoading(true);
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: desc.trim(),
        project_id: projectId,
      };
      if (assignedTo) payload.assigned_to = assignedTo;
      await apiClient.post("/api/v1/tasks", payload);
      toast.success("Görev oluşturuldu.");
      onCreated();
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      toast.error(detail || "Görev oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Yeni Görev">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <FocusTrapContainer className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-purple-500" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Yeni Görev</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5" htmlFor="task-title">
                Başlık <span className="text-red-400">*</span>
              </label>
              <input
                id="task-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Görev başlığı (en az 3 karakter)"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5" htmlFor="task-desc">
                Açıklama <span className="text-red-400">*</span>
              </label>
              <textarea
                id="task-desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={4}
                placeholder="Açıklama (en az 5 karakter)"
                className={inputCls + " resize-none"}
              />
            </div>

            {isTeamProject && canAssignToOthers && assigneeOptions.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5" htmlFor="task-assignee">
                  Atanan Kişi
                </label>
                <select
                  id="task-assignee"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Bana ata (varsayılan)</option>
                  {assigneeOptions
                    .filter((u) => u.id !== currentUserId)
                    .map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Seçim yapmazsanız görev size atanır.</p>
              </div>
            )}

            {isTeamProject && !canAssignToOthers && (
              <div className="rounded-lg bg-slate-800/60 border border-slate-700 px-3 py-2">
                <p className="text-xs text-gray-400">
                  Görev otomatik olarak size atanacak. Başka üyelere atama yetkisi sadece proje yöneticisindedir.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" type="button" onClick={onClose}>İptal</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Ekleniyor..." : "Görev Ekle"}
              </Button>
            </div>
          </form>
        </div>
      </FocusTrapContainer>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Ekip üyeleri
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Onay diyaloğu: hangi aksiyon bekliyor?
  type PendingAction = "submit" | "reject" | "ai" | null;
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  // Soft / Hard delete modalları
  const [showSoftDelete, setShowSoftDelete] = useState(false);
  const [showHardDelete, setShowHardDelete] = useState(false);

  const fetchMembers = useCallback(async (projectData?: { project_type?: ProjectType; created_by?: string }) => {
    if (projectData?.project_type !== "team") return;
    try {
      const activeRes = await apiClient.get(`/api/v1/projects/${id}/members`);
      const activeMembers = activeRes.data ?? [];
      setMembers(activeMembers);

      // Pending davetler: yalnız proje sahibi, manager üye veya TEACHER/ADMIN görür
      const role = user?.role?.toUpperCase();
      const isCreator = projectData?.created_by && String(projectData.created_by) === String(user?.id);
      const isManagerMember = activeMembers.some(
        (m: ProjectMember) => String(m.user_id) === String(user?.id) && m.role === "MANAGER"
      );
      const canSeePending = isCreator || isManagerMember || role === "TEACHER" || role === "ADMIN";

      if (canSeePending) {
        const pendingRes = await apiClient
          .get(`/api/v1/projects/${id}/members/pending`)
          .catch(() => ({ data: [] }));
        setPendingMembers(pendingRes.data ?? []);
      } else {
        setPendingMembers([]);
      }
    } catch { /* üye listesi sessizce hata verebilir */ }
  }, [id, user?.id, user?.role]);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        apiClient.get(`/api/v1/projects/${id}`),
        apiClient.get(`/api/v1/tasks?project_id=${id}&per_page=100`),
      ]);
      setProject(projRes.data);
      setTasks(taskRes.data.items ?? []);
      fetchMembers(projRes.data);
    } catch (err: unknown) {
      // Ağ/sunucu hatasında overlay'e düşmek yerine kullanıcıya bildir.
      // 401 zaten apiClient interceptor'da login'e yönlendirir.
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      toast.error(detail || "Proje verileri yüklenemedi. Bağlantını kontrol et.");
    } finally { setLoading(false); }
  }, [id, fetchMembers]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    try {
      await apiClient.post(`/api/v1/projects/${id}/submit`);
      toast.success("Proje onay için gönderildi.");
      fetchData();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "İşlem başarısız.");
    } finally {
      setPendingAction(null);
    }
  };

  const handleApprove = async () => {
    await apiClient.post(`/api/v1/projects/${id}/approve`);
    fetchData();
  };

  const handleSoftDelete = async () => {
    await apiClient.delete(`/api/v1/projects/${id}`);
    toast.success("Proje silindi (geri yüklenebilir).");
    router.push("/dashboard/projects");
  };

  const handleHardDelete = async () => {
    await apiClient.delete(`/api/v1/projects/${id}/hard`);
    toast.success("Proje kalıcı olarak silindi.");
    router.push("/dashboard/projects");
  };

  const handleReject = async () => {
    if (rejectReason.trim().length < 10) return;
    setRejecting(true);
    try {
      await apiClient.post(`/api/v1/projects/${id}/reject`, { reason: rejectReason.trim() });
      toast.success("Proje reddedildi.");
      setPendingAction(null);
      setRejectReason("");
      fetchData();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "Reddetme başarısız.");
    } finally {
      setRejecting(false);
    }
  };

  const handleAiPlan = async () => {
    if (!project) return;
    try {
      setAiLoading(true);
      await apiClient.post('/api/v1/ai/suggest', { project_id: project.id });
      toast.success("AI tarafından önerilen görevler projeye eklendi.");
      fetchData();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "AI görev önerisi alınamadı.");
    } finally {
      setAiLoading(false);
      setPendingAction(null);
    }
  };

  const handleAcceptInvite = async (memberId: string) => {
    try {
      await apiClient.post(`/api/v1/projects/${id}/members/${memberId}/accept`);
      toast.success("Daveti kabul ettiniz.");
      fetchMembers(project ?? undefined);
    } catch (err: unknown) { toast.error((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "Hata."); }
  };

  const handleRejectInvite = async (memberId: string) => {
    try {
      await apiClient.post(`/api/v1/projects/${id}/members/${memberId}/reject`);
      toast.success("Davet reddedildi.");
      fetchMembers(project ?? undefined);
    } catch (err: unknown) { toast.error((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "Hata."); }
  };

  const handleCancelInvite = async (memberId: string) => {
    try {
      await apiClient.delete(`/api/v1/projects/${id}/members/${memberId}/cancel-invite`);
      toast.success("Davet iptal edildi.");
      fetchMembers(project ?? undefined);
    } catch (err: unknown) { toast.error((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "Hata."); }
  };

  // Aktif üyeyi projeden çıkar (endpoint user_id ile çalışır)
  const handleRemoveMember = async (userId: string) => {
    try {
      await apiClient.delete(`/api/v1/projects/${id}/members/${userId}`);
      toast.success("Üye projeden çıkarıldı.");
      fetchMembers(project ?? undefined);
    } catch (err: unknown) { toast.error((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "Üye çıkarılamadı."); }
  };

  // Yöneticiliği başka bir aktif üyeye devret
  const handleTransferManager = async (userId: string) => {
    try {
      await apiClient.patch(`/api/v1/projects/${id}/members/transfer-manager`, { user_id: userId });
      toast.success("Yöneticilik devredildi.");
      fetchMembers(project ?? undefined);
    } catch (err: unknown) { toast.error((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "Devir başarısız."); }
  };

  // DnD: kart başka kolona bırakıldığında çağrılır
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;
    const fromKey = (task.status as string)?.toUpperCase() as TaskStatus;
    const toKey = over.id as TaskStatus;
    if (fromKey === toKey) return;

    const role = user?.role?.toUpperCase();
    const isCreator = String(project?.created_by) === String(user?.id);

    if (!canTransition(fromKey, toKey, role, isCreator)) {
      toast.error("Bu durum geçişi için yetkiniz yok veya geçerli bir geçiş değil.");
      return;
    }

    // Optimistic update
    const prevTasks = tasks;
    setTasks((prev) => prev.map((t) =>
      t.id === task.id ? { ...t, status: toKey.toLowerCase() as TaskStatus } : t
    ));
    try {
      await apiClient.patch(`/api/v1/tasks/${task.id}/status`, { status: toKey.toLowerCase() });
    } catch (err: unknown) {
      setTasks(prevTasks);
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      toast.error(detail || "Durum güncellenemedi.");
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    // task.status backend'den lowercase gelir → UPPERCASE'e normalize et
    const currentKey = (task.status as string)?.toUpperCase() as TaskStatus;
    const roleKey = (user?.role?.toUpperCase() ?? "STUDENT") as keyof typeof TASK_STATUS_NEXT_BY_ROLE;
    const nextKey = TASK_STATUS_NEXT_BY_ROLE[roleKey]?.[currentKey];
    if (!nextKey) {
      if (currentKey === "REVIEW" && roleKey === "STUDENT") {
        toast("İnceleme aşamasındaki görevi öğretmen tamamlar.", { icon: "ℹ️" });
      } else if (currentKey === "DONE") {
        toast("Görev tamamlanmış. Tekrar açılamaz.", { icon: "ℹ️" });
      }
      return;
    }
    try {
      // Backend lowercase enum bekliyor
      await apiClient.patch(`/api/v1/tasks/${task.id}/status`, { status: nextKey.toLowerCase() });
      // Local state'i de lowercase tut (DB ile aynı)
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: nextKey.toLowerCase() as TaskStatus } : t));
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      toast.error(detail || "Görev durumu güncellenemedi.");
    }
  };

  if (loading) return <SkeletonDetail />;
  if (!project) return <div className="py-20 text-center text-sm text-gray-400">Proje bulunamadı.</div>;

  const normalizedStatus = project.status?.toUpperCase() as ProjectStatus;
  const statusCfg = PROJECT_STATUS[normalizedStatus] ?? { label: project.status, className: "bg-slate-700 text-slate-300" };
  const role = user?.role?.toUpperCase();
  // Backend TaskStatus enum value lowercase ("todo"/"in_progress"/"done");
  // frontend UPPERCASE key kullanıyor → normalize et.
  const grouped: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], REVIEW: [], DONE: [] };
  tasks.forEach((t) => {
    const key = (t.status as string)?.toUpperCase() as TaskStatus;
    if (grouped[key]) grouped[key].push(t);
  });

  // Üye katkı özeti: her atanan kişi için toplam / tamamlanan görev sayısı.
  // "kim ne kadar yapmış" — öğretmen/yöneticinin proje takibi için.
  const contributionStats = (() => {
    const map = new Map<string, { name: string; total: number; done: number }>();
    tasks.forEach((t) => {
      const key = t.assigned_to ?? "__unassigned__";
      const name = t.assignee_name ?? "Atanmamış";
      const entry = map.get(key) ?? { name, total: 0, done: 0 };
      entry.total += 1;
      if ((t.status as string)?.toUpperCase() === "DONE") entry.done += 1;
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  })();

  const isTeamProject = project.project_type === "team";
  // Current user's own membership record (to show accept/reject if INVITED)
  const myMembership = pendingMembers.find((m) => m.user_id === user?.id && m.status === "INVITED");
  // Current user is project manager if they are the creator or have MANAGER role
  const amManager = String(project.created_by) === String(user?.id) ||
    members.some((m) => m.user_id === user?.id && m.role === "MANAGER");
  const amCreator = String(project.created_by) === String(user?.id);
  const amMember = members.some((m) => String(m.user_id) === String(user?.id));
  const canCreateTask = amCreator || amMember || role === "ADMIN";
  const canAssignToOthers = amCreator || role === "ADMIN";
  // Üye yönetimi (davet/çıkar/yönetici devri): yönetici, öğretmen veya admin
  const canManageMembers = amManager || role === "TEACHER" || role === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Projeler", href: "/dashboard/projects" },
          { label: project.title },
        ]}
      />

      {/* Proje Bilgi Kartı */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className={`inline-block rounded-lg px-2 py-0.5 text-xs font-bold ${statusCfg.className}`}>
                  {statusCfg.label}
                </span>
                {project.project_type === "team" && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-400">
                    <Users className="h-3 w-3" /> Ekip Projesi
                  </span>
                )}
                {project.project_type === "individual" && (
                  <span className="inline-block rounded-lg bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-xs font-semibold text-violet-400">
                    Bireysel Proje
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{project.title}</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{project.description}</p>
              {project.github_url && (
                <a
                  href={project.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:border-indigo-500 transition-colors"
                >
                  <Github className="h-4 w-4" />
                  GitHub Reposu
                </a>
              )}
            </div>

            {/* Aksiyon Butonları */}
            <div className="flex flex-col gap-2 shrink-0">
              {/* FE-2: DRAFT projesini düzenle */}
              {normalizedStatus === "DRAFT" && String(project.created_by) === String(user?.id) && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  <Pencil className="h-4 w-4" /> Düzenle
                </button>
              )}
              {role === "STUDENT" && normalizedStatus === "DRAFT" && (
                <button onClick={() => setPendingAction("submit")} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 whitespace-nowrap">
                  📨 Onaya Gönder
                </button>
              )}
              {/* Reddedilen projeyi yeniden açma */}
              {normalizedStatus === "REJECTED" && String(project.created_by) === String(user?.id) && (
                <button
                  onClick={async () => {
                    try {
                      await apiClient.post(`/api/v1/projects/${id}/reopen`);
                      toast.success("Proje düzenleme için açıldı. İçeriği güncelleyip tekrar gönderin.");
                      fetchData();
                    } catch {
                      toast.error("İşlem başarısız.");
                    }
                  }}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 whitespace-nowrap"
                >
                  🔄 Yeniden Aç
                </button>
              )}
              {(role === "TEACHER" || role === "ADMIN") && normalizedStatus === "PENDING" && (
                <>
                  <button onClick={handleApprove} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                    ✅ Onayla
                  </button>
                  <button onClick={() => setPendingAction("reject")} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">
                    ❌ Reddet
                  </button>
                </>
              )}
              
              {/* AI Planlama Aksiyonu (Herkes görür ama yetkisi olmayan disabled olarak görür) */}
              <button
                disabled={(role !== "TEACHER" && role !== "ADMIN") || normalizedStatus !== "APPROVED" || aiLoading}
                title={(role !== "TEACHER" && role !== "ADMIN") ? "Sadece öğretmenler kullanabilir" : normalizedStatus !== "APPROVED" ? "Projenin onaylanması (APPROVED) gerekir" : "Yapay zeka ile görevleri planla"}
                onClick={() => {
                  if ((role !== "TEACHER" && role !== "ADMIN") || normalizedStatus !== "APPROVED") return;
                  setPendingAction("ai");
                }}
                className="disabled:opacity-50 disabled:cursor-not-allowed rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-400 hover:bg-indigo-500/20 transition-colors whitespace-nowrap"
              >
                {aiLoading ? "Analiz ediliyor..." : "✨ AI ile Görev Planla"}
              </button>

              {/* Soft Delete (TEACHER + ADMIN) */}
              {(role === "TEACHER" || role === "ADMIN") && (
                <button
                  onClick={() => setShowSoftDelete(true)}
                  title="Projeyi sil (geri yüklenebilir)"
                  className="flex items-center gap-2 rounded-xl border border-amber-600/40 bg-amber-600/10 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-600/20 transition-colors whitespace-nowrap"
                >
                  <Trash2 className="h-4 w-4" /> Sil
                </button>
              )}

              {/* Kalıcı Sil (ADMIN) */}
              {role === "ADMIN" && (
                <button
                  onClick={() => setShowHardDelete(true)}
                  title="Projeyi kalıcı olarak sil"
                  className="flex items-center gap-2 rounded-xl border border-red-600/40 bg-red-600/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-600/20 transition-colors whitespace-nowrap"
                >
                  <Trash2 className="h-4 w-4" /> Kalıcı Sil
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proje Durum Banner'ları */}
      {normalizedStatus === "DRAFT" && role === "STUDENT" && (
        <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-4 flex items-start gap-3">
          <span className="text-xl mt-0.5">📝</span>
          <div>
            <p className="text-sm font-semibold text-slate-300 mb-1">Proje Taslak Aşamasında</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Projenizi öğretmeninize göndermek için <strong className="text-white">&quot;Onaya Gönder&quot;</strong> butonunu kullanın.
              Onay sonrasında görev ekleyebilir ve rapor oluşturabilirsiniz.
            </p>
          </div>
        </div>
      )}

      {normalizedStatus === "PENDING" && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-start gap-3">
          <span className="text-xl mt-0.5">⏳</span>
          <div>
            <p className="text-sm font-semibold text-amber-400 mb-1">
              {role === "STUDENT" ? "Onay Bekleniyor" : "Bu Proje Onayınızı Bekliyor"}
            </p>
            <p className="text-xs text-gray-400 leading-relaxed">
              {role === "STUDENT"
                ? "Projeniz öğretmeninizin incelemesinde. Onaylandıktan sonra aktif hale gelecek ve görev ekleyebileceksiniz."
                : "Öğrenci bu projeyi onaylamanız için gönderdi. Aşağıdaki \"Onayla\" veya \"Reddet\" butonlarını kullanabilirsiniz."}
            </p>
          </div>
        </div>
      )}

      {normalizedStatus === "REJECTED" && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 flex items-start gap-3">
          <span className="text-xl mt-0.5">❌</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-400 mb-1">Proje Reddedildi</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              {role === "STUDENT"
                ? "Bu proje öğretmeniniz tarafından reddedildi. İçeriği güncelleyip tekrar onaya gönderebilirsiniz."
                : "Bu projeyi reddettiniz."}
            </p>
            {project.rejection_reason && (
              <div className="mt-2 rounded-lg border border-red-800/40 bg-red-950/30 px-3 py-2">
                <p className="text-xs font-semibold text-red-300 mb-0.5">Reddetme Sebebi:</p>
                <p className="text-xs text-gray-300 leading-relaxed">{project.rejection_reason}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Görevler */}
      {normalizedStatus !== "APPROVED" ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-700 p-8 text-center">
          <span className="text-3xl mb-3 block">🔒</span>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Görevler Kilitli</p>
          <p className="text-xs text-gray-400 mt-1">
            {role === "STUDENT" && normalizedStatus === "DRAFT" && "Önce projeyi öğretmeninize onay için gönderin."}
            {role === "STUDENT" && normalizedStatus === "PENDING" && "Projeniz öğretmen onayında, bekleniyor."}
            {role === "STUDENT" && normalizedStatus === "REJECTED" && "Proje reddedildiği için görev eklenemiyor."}
            {(role === "TEACHER" || role === "ADMIN") && normalizedStatus === "DRAFT" && "Öğrenci henüz projeyi onaya göndermedi."}
            {(role === "TEACHER" || role === "ADMIN") && normalizedStatus === "PENDING" && "Projeyi onaylamak için yukarıdaki \"Onayla\" butonunu kullanın."}
            {(role === "TEACHER" || role === "ADMIN") && normalizedStatus === "REJECTED" && "Bu proje reddedilmiş durumda."}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Görevler</h3>
            {canCreateTask && (
              <button
                onClick={() => setShowNewTask(true)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold text-indigo-400 hover:bg-slate-700"
              >
                <Plus className="h-4 w-4" />
                Görev Ekle
              </button>
            )}
          </div>

          {/* Üye Katkı Özeti — kim ne kadar yapmış */}
          {contributionStats.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Katkı Özeti</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {contributionStats.map((s, i) => {
                    const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
                    return (
                      <div key={i} className="rounded-xl border border-gray-200 dark:border-slate-700 p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-xs font-bold text-cyan-700 dark:text-cyan-300 shrink-0">
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.name}</span>
                          </div>
                          <span className="text-xs font-semibold text-gray-500 shrink-0">
                            {s.done}/{s.total}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-400">%{pct} tamamlandı</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Kanban Kolonları (Drag-Drop) */}
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as TaskStatus[]).map((status) => (
              <div key={status}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {TASK_STATUS_LABELS[status]}
                  </span>
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {grouped[status].length}
                  </span>
                </div>
                <DroppableColumn status={status}>
                  {grouped[status].map((task) => (
                    <DraggableTaskCard key={task.id} task={task} onClick={() => setDetailTask(task)} />
                  ))}
                  {grouped[status].length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center dark:border-slate-700">
                      <p className="text-xs text-gray-400">Görev yok</p>
                    </div>
                  )}
                </DroppableColumn>
              </div>
            ))}
          </div>
          </DndContext>
        </>
      )}

      {/* ── Ekip Üyeleri Paneli ──────────────────────────────────────────── */}
      {isTeamProject && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ekip Üyeleri</h3>
              <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {/* Creator + dedup edilmiş üyeler */}
                {1 + members.filter((m) => String(m.user_id) !== String(project.created_by)).length}
              </span>
            </div>
            {canManageMembers && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Ekip Arkadaşı Davet Et
              </button>
            )}
          </div>

          {/* Paylaşım kodu — sahip/üye paylaşıp başkalarını davet edebilir */}
          {project.share_code && (amCreator || amMember || role === "ADMIN") && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Paylaşım Kodu</p>
                <p className="text-base font-mono font-bold text-indigo-400 mt-0.5">{project.share_code}</p>
                <p className="text-xs text-gray-400 mt-0.5">Bu kodu paylaşarak arkadaşlarının katılım isteği göndermesini sağlayabilirsin.</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(project.share_code!);
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2000);
                }}
                className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  codeCopied
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                }`}
              >
                {codeCopied ? "Kopyalandı ✓" : "Kopyala"}
              </button>
            </div>
          )}

          {/* Davet bekleyen — invited user */}
          {myMembership && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-indigo-300">Bu projeye davet edildiniz</p>
                <p className="text-xs text-gray-400 mt-0.5">Daveti kabul ederek ekibe katılabilirsiniz.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleAcceptInvite(myMembership.id)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Kabul Et
                </button>
                <button
                  onClick={() => handleRejectInvite(myMembership.id)}
                  className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-slate-600"
                >
                  Reddet
                </button>
              </div>
            </div>
          )}

          {/* Aktif Üyeler — Proje Sahibi her zaman ilk sırada */}
          <Card>
            <CardContent className="p-4 space-y-2">
              {/* Proje Sahibi (creator) — members tablosunda kayıt olmasa da gösterilir */}
              <div className="flex items-center justify-between gap-3 py-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-xs font-bold text-amber-700 dark:text-amber-300">
                    {project.created_by_name?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {project.created_by_name ?? project.created_by}
                      </p>
                      <Crown className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <p className="text-xs text-gray-400">Projeyi başlatan kullanıcı</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400">
                  Proje Sahibi
                </span>
              </div>

              {/* Diğer aktif üyeler (creator hariç) */}
              {members
                .filter((m) => String(m.user_id) !== String(project.created_by))
                .map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 py-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        {m.user?.name?.charAt(0).toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{m.user?.name ?? m.user_id}</p>
                          {m.role === "MANAGER" && <Crown className="h-3.5 w-3.5 text-amber-400" />}
                        </div>
                        <p className="text-xs text-gray-400">{m.user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                        m.role === "MANAGER"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      }`}>
                        {m.role === "MANAGER" ? "Yönetici" : "Üye"}
                      </span>
                      {canManageMembers && (
                        <>
                          {m.role !== "MANAGER" && (
                            <button
                              onClick={() => handleTransferManager(m.user_id)}
                              title="Yöneticiliği bu üyeye devret"
                              className="flex items-center gap-1 rounded-md border border-amber-500/30 px-2 py-0.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors"
                            >
                              <Crown className="h-3 w-3" /> Yönetici Yap
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveMember(m.user_id)}
                            title="Üyeyi projeden çıkar"
                            className="rounded-md border border-red-500/30 p-1 text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}

              {members.filter((m) => String(m.user_id) !== String(project.created_by)).length === 0 && (
                <p className="text-xs text-gray-500 italic pt-1">Henüz başka aktif ekip üyesi yok.</p>
              )}
            </CardContent>
          </Card>

          {/* Bekleyen davetler — yönetici görür */}
          {(amManager || role === "TEACHER" || role === "ADMIN") && pendingMembers.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Bekleyen Davetler</p>
              <Card>
                <CardContent className="p-4 space-y-2">
                  {pendingMembers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 py-1">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-xs font-bold text-amber-700 dark:text-amber-300">
                          {m.user?.name?.charAt(0).toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{m.user?.name ?? m.user_id}</p>
                          <p className="text-xs text-gray-400">{m.user?.email}</p>
                        </div>
                      </div>
                      {canManageMembers && (
                        <button
                          onClick={() => handleCancelInvite(m.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          İptal
                        </button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      )}

      {/* Görev Detay Modalı */}
      {detailTask && project && (
        <TaskDetailModal
          task={detailTask}
          isCreatorOrAdmin={String(project.created_by) === String(user?.id) || role === "ADMIN"}
          isCreator={String(project.created_by) === String(user?.id)}
          role={role}
          assigneeOptions={[
            ...(project.created_by_name
              ? [{ id: String(project.created_by), name: project.created_by_name + " (Sahip)" }]
              : [{ id: String(project.created_by), name: "Proje Sahibi" }]),
            ...members
              .filter((m) => String(m.user_id) !== String(project.created_by))
              .map((m) => ({ id: m.user_id, name: m.user?.name ?? "Üye" })),
          ]}
          onClose={() => setDetailTask(null)}
          onSaved={() => fetchData()}
          onDeleted={() => fetchData()}
          onStatusChanged={(taskId, newStatus) => {
            setTasks((prev) =>
              prev.map((t) => (t.id === taskId ? { ...t, status: newStatus.toLowerCase() as TaskStatus } : t))
            );
          }}
        />
      )}

      {/* Yeni Görev Modalı */}
      {showNewTask && project && (
        <NewTaskModal
          projectId={id!}
          isTeamProject={isTeamProject}
          canAssignToOthers={canAssignToOthers}
          currentUserId={user?.id}
          assigneeOptions={[
            // Proje sahibi her zaman atanabilir
            ...(project.created_by_name
              ? [{ id: String(project.created_by), name: project.created_by_name + " (Sahip)" }]
              : [{ id: String(project.created_by), name: "Proje Sahibi" }]),
            // Aktif üyeler (sahibi tekrar eklemeyelim)
            ...members
              .filter((m) => String(m.user_id) !== String(project.created_by))
              .map((m) => ({ id: m.user_id, name: m.user?.name ?? "Üye" })),
          ]}
          onClose={() => setShowNewTask(false)}
          onCreated={() => fetchData()}
        />
      )}

      {/* Üye Davet Modalı */}
      {showInviteModal && (
        <InviteMemberModal
          projectId={id!}
          departmentId={project?.department_id ?? null}
          currentUserId={user?.id}
          excludeUserIds={new Set([
            ...members.map((m) => m.user_id),
            ...pendingMembers.map((m) => m.user_id),
          ])}
          onClose={() => setShowInviteModal(false)}
          onInvited={() => fetchMembers(project ?? undefined)}
        />
      )}

      {/* Onaya Gönder Onayı */}
      <ConfirmDialog
        isOpen={pendingAction === "submit"}
        onClose={() => setPendingAction(null)}
        onConfirm={handleSubmit}
        title="Onaya Gönder"
        description="Projeyi öğretmeninize onay için göndermek istiyor musunuz? Onay sürecinde proje içeriği kilitlenir."
        confirmText="Evet, Gönder"
        cancelText="Vazgeç"
      />

      {/* Reddet Modalı — sebep zorunlu */}
      {pendingAction === "reject" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPendingAction(null)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Projeyi Reddet</h3>
            <p className="text-sm text-gray-400">
              <span className="font-medium text-gray-200">{project?.title}</span> projesini reddediyorsunuz.
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
              <button onClick={() => { setPendingAction(null); setRejectReason(""); }} className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800">Vazgeç</button>
              <button
                onClick={handleReject}
                disabled={rejecting || rejectReason.trim().length < 10}
                className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejecting ? "Reddediliyor..." : "Reddet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Görev Planlama Onayı */}
      <ConfirmDialog
        isOpen={pendingAction === "ai"}
        onClose={() => setPendingAction(null)}
        onConfirm={handleAiPlan}
        title="AI ile Görev Planla"
        description="Proje açıklaması analiz edilerek üyelere otomatik görevler atanacak. Mevcut görevler etkilenmez. Devam edilsin mi?"
        confirmText="Evet, Planla"
        cancelText="Vazgeç"
      />

      {/* Soft Delete Modal */}
      <SoftDeleteModal
        open={showSoftDelete}
        onClose={() => setShowSoftDelete(false)}
        onConfirm={handleSoftDelete}
        title="Projeyi Sil"
        entityName={project?.title ?? "Proje"}
        cascadeUrl={id ? `/api/v1/projects/${id}/cascade-info` : null}
        cascadeLabels={{ tasks: "Görevler", reports: "Raporlar", members: "Üyeler" }}
        confirmLabel="Sil"
      />

      {/* Hard Delete Modal (Admin) */}
      <SoftDeleteModal
        open={showHardDelete}
        onClose={() => setShowHardDelete(false)}
        onConfirm={handleHardDelete}
        title="Projeyi Kalıcı Sil"
        entityName={project?.title ?? "Proje"}
        cascadeUrl={id ? `/api/v1/projects/${id}/cascade-info` : null}
        cascadeLabels={{ tasks: "Görevler", reports: "Raporlar", members: "Üyeler" }}
        confirmLabel="Kalıcı Sil"
        destructive
      />

      {/* FE-2: Proje Düzenleme Modalı */}
      {showEditModal && project && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEditModal(false)}
          onUpdated={fetchData}
        />
      )}
    </div>
  );
}
