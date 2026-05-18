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
import { CheckCircle, Circle, Clock, Plus, Pencil, X, Users, UserPlus, Search, Crown, Github, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

type ProjectStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
type ProjectType = "individual" | "team" | "both";
type MemberStatus = "ACTIVE" | "INVITED" | "JOIN_REQUESTED" | "REJECTED";

interface Project {
  id: string; title: string; description: string;
  status: ProjectStatus; created_by: string;
  project_type?: ProjectType; created_by_name?: string;
  github_url?: string | null;
  rejection_reason?: string | null;
}
interface Task { id: string; title: string; description: string; status: TaskStatus; due_date: string | null; ai_suggested: boolean; }

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
  DONE: "Tamamlandı",
};

const TASK_STATUS_NEXT: Record<TaskStatus, TaskStatus> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "TODO",
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

// Görev oluşturma mini formu
const NewTaskForm = ({ projectId, onCreated }: { projectId: string; onCreated: () => void }) => {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.length < 3 || !desc.trim() || desc.length < 5) return;
    try {
      setLoading(true);
      await apiClient.post("/api/v1/tasks", { title: title.trim(), description: desc.trim(), project_id: projectId });
      setTitle(""); setDesc("");
      onCreated();
    } finally { setLoading(false); }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="Görev başlığı (en az 3 karakter)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400"
          />
          <input
            placeholder="Açıklama (en az 5 karakter)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Ekleniyor..." : "Görev Ekle"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Ekip üyeleri
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<UserSearchResult[]>([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState<string | null>(null);

  // Onay diyaloğu: hangi aksiyon bekliyor?
  type PendingAction = "submit" | "reject" | "ai" | null;
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  // Soft / Hard delete modalları
  const [showSoftDelete, setShowSoftDelete] = useState(false);
  const [showHardDelete, setShowHardDelete] = useState(false);

  const fetchMembers = useCallback(async (projectType?: ProjectType) => {
    if (projectType !== "team") return;
    try {
      const [activeRes, pendingRes] = await Promise.all([
        apiClient.get(`/api/v1/projects/${id}/members`),
        apiClient.get(`/api/v1/projects/${id}/members/pending`).catch(() => ({ data: [] })),
      ]);
      setMembers(activeRes.data ?? []);
      setPendingMembers(pendingRes.data ?? []);
    } catch { /* üye listesi sessizce hata verebilir */ }
  }, [id]);

  const fetchData = useCallback(async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        apiClient.get(`/api/v1/projects/${id}`),
        apiClient.get(`/api/v1/tasks?project_id=${id}&per_page=100`),
      ]);
      setProject(projRes.data);
      setTasks(taskRes.data.items ?? []);
      fetchMembers(projRes.data.project_type);
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

  const handleUserSearch = async (query: string) => {
    setMemberSearchQuery(query);
    if (query.trim().length < 2) { setMemberSearchResults([]); return; }
    try {
      setMemberSearchLoading(true);
      const { data } = await apiClient.get(`/api/v1/users?search=${encodeURIComponent(query)}&role=STUDENT&per_page=5`);
      setMemberSearchResults(data.items ?? []);
    } catch { setMemberSearchResults([]); } finally { setMemberSearchLoading(false); }
  };

  const handleInvite = async (userId: string) => {
    try {
      setInviteLoading(userId);
      await apiClient.post(`/api/v1/projects/${id}/invite`, { user_id: userId });
      toast.success("Davet gönderildi.");
      setMemberSearchQuery(""); setMemberSearchResults([]);
      fetchMembers("team");
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "Davet gönderilemedi.");
    } finally { setInviteLoading(null); }
  };

  const handleAcceptInvite = async (memberId: string) => {
    try {
      await apiClient.post(`/api/v1/projects/${id}/members/${memberId}/accept`);
      toast.success("Daveti kabul ettiniz.");
      fetchMembers("team");
    } catch (err: unknown) { toast.error((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "Hata."); }
  };

  const handleRejectInvite = async (memberId: string) => {
    try {
      await apiClient.post(`/api/v1/projects/${id}/members/${memberId}/reject`);
      toast.success("Davet reddedildi.");
      fetchMembers("team");
    } catch (err: unknown) { toast.error((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "Hata."); }
  };

  const handleCancelInvite = async (memberId: string) => {
    try {
      await apiClient.delete(`/api/v1/projects/${id}/members/${memberId}/cancel-invite`);
      toast.success("Davet iptal edildi.");
      fetchMembers("team");
    } catch (err: unknown) { toast.error((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "Hata."); }
  };

  const toggleTaskStatus = async (task: Task) => {
    const next = TASK_STATUS_NEXT[task.status];
    await apiClient.patch(`/api/v1/tasks/${task.id}/status`, { status: next });
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: next } : t));
  };

  if (loading) return <SkeletonDetail />;
  if (!project) return <div className="py-20 text-center text-sm text-gray-400">Proje bulunamadı.</div>;

  const normalizedStatus = project.status?.toUpperCase() as ProjectStatus;
  const statusCfg = PROJECT_STATUS[normalizedStatus] ?? { label: project.status, className: "bg-slate-700 text-slate-300" };
  const role = user?.role?.toUpperCase();
  const grouped: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
  tasks.forEach((t) => { if (grouped[t.status]) grouped[t.status].push(t); });

  const isTeamProject = project.project_type === "team";
  // Current user's own membership record (to show accept/reject if INVITED)
  const myMembership = pendingMembers.find((m) => m.user_id === user?.id && m.status === "INVITED");
  // Current user is project manager if they are the creator or have MANAGER role
  const amManager = String(project.created_by) === String(user?.id) ||
    members.some((m) => m.user_id === user?.id && m.role === "MANAGER");

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
            {role === "STUDENT" && (
              <button
                onClick={() => setShowNewTask(!showNewTask)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold text-indigo-400 hover:bg-slate-700"
              >
                <Plus className="h-4 w-4" />
                Görev Ekle
              </button>
            )}
          </div>

          {showNewTask && (
            <NewTaskForm projectId={id!} onCreated={() => { setShowNewTask(false); fetchData(); }} />
          )}

          {/* Kanban Kolonları */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(["TODO", "IN_PROGRESS", "DONE"] as TaskStatus[]).map((status) => (
              <div key={status}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {TASK_STATUS_LABELS[status]}
                  </span>
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {grouped[status].length}
                  </span>
                </div>
                <div className="space-y-2">
                  {grouped[status].map((task) => (
                    <Card key={task.id} className="cursor-pointer hover:ring-2 hover:ring-indigo-500/20 transition-all" onClick={() => toggleTaskStatus(task)}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          {status === "DONE"
                            ? <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                            : status === "IN_PROGRESS"
                            ? <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                            : <Circle className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />}
                          <div>
                            <p className={`text-sm font-medium ${status === "DONE" ? "line-through text-gray-500" : "text-gray-900 dark:text-white"}`}>
                              {task.title}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{task.description}</p>
                            {task.ai_suggested && (
                              <span className="mt-1 inline-block text-xs text-indigo-400">🤖 AI Önerisi</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {grouped[status].length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center dark:border-slate-700">
                      <p className="text-xs text-gray-400">Görev yok</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Ekip Üyeleri Paneli ──────────────────────────────────────────── */}
      {isTeamProject && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ekip Üyeleri</h3>
            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {members.length}
            </span>
          </div>

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

          {/* Aktif Üyeler */}
          {members.length > 0 ? (
            <Card>
              <CardContent className="p-4 space-y-2">
                {members.map((m) => (
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
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                      m.role === "MANAGER"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}>
                      {m.role === "MANAGER" ? "Yönetici" : "Üye"}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-700 p-6 text-center">
              <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-400">Henüz aktif ekip üyesi yok.</p>
            </div>
          )}

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
                      {amManager && (
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

          {/* Üye Davet Et — yönetici / admin */}
          {(amManager || role === "ADMIN") && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Üye Davet Et</p>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Ad, e-posta veya öğrenci no ile ara..."
                        value={memberSearchQuery}
                        onChange={(e) => handleUserSearch(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400"
                      />
                    </div>
                  </div>

                  {memberSearchLoading && (
                    <p className="text-xs text-gray-400 px-1">Aranıyor...</p>
                  )}

                  {memberSearchResults.length > 0 && (
                    <div className="space-y-1 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                      {memberSearchResults.map((u) => {
                        const alreadyInvited = pendingMembers.some((m) => m.user_id === u.id) ||
                                               members.some((m) => m.user_id === u.id);
                        return (
                          <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-800">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</p>
                              <p className="text-xs text-gray-400">{u.email}{u.student_no ? ` · ${u.student_no}` : ""}</p>
                            </div>
                            <button
                              disabled={alreadyInvited || inviteLoading === u.id}
                              onClick={() => handleInvite(u.id)}
                              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              {alreadyInvited ? "Zaten Eklendi" : inviteLoading === u.id ? "Gönderiliyor..." : "Davet Et"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!memberSearchLoading && memberSearchQuery.trim().length >= 2 && memberSearchResults.length === 0 && (
                    <p className="text-xs text-gray-400 px-1">Sonuç bulunamadı.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
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
