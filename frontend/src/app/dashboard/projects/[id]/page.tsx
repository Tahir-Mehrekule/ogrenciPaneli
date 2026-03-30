"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CheckCircle, Circle, Clock, Plus } from "lucide-react";

type ProjectStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

interface Project { id: string; title: string; description: string; status: ProjectStatus; created_by: string; }
interface Task { id: string; title: string; description: string; status: TaskStatus; due_date: string | null; ai_suggested: boolean; }

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

  const fetchData = useCallback(async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        apiClient.get(`/api/v1/projects/${id}`),
        apiClient.get(`/api/v1/tasks?project_id=${id}&per_page=100`),
      ]);
      setProject(projRes.data);
      setTasks(taskRes.data.items ?? []);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!confirm("Projeyi onay için göndermek istiyor musunuz?")) return;
    await apiClient.post(`/api/v1/projects/${id}/submit`);
    fetchData();
  };

  const handleApprove = async () => {
    await apiClient.post(`/api/v1/projects/${id}/approve`);
    fetchData();
  };

  const handleReject = async () => {
    if (!confirm("Bu projeyi reddetmek istediğinize emin misiniz?")) return;
    await apiClient.post(`/api/v1/projects/${id}/reject`);
    router.push("/dashboard/projects");
  };

  const toggleTaskStatus = async (task: Task) => {
    const next = TASK_STATUS_NEXT[task.status];
    await apiClient.patch(`/api/v1/tasks/${task.id}/status`, { status: next });
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: next } : t));
  };

  if (loading) return <div className="py-20 text-center text-sm text-gray-400">Yükleniyor...</div>;
  if (!project) return <div className="py-20 text-center text-sm text-gray-400">Proje bulunamadı.</div>;

  const statusCfg = PROJECT_STATUS[project.status];
  const grouped: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
  tasks.forEach((t) => { if (grouped[t.status]) grouped[t.status].push(t); });

  return (
    <div className="space-y-6">
      {/* Proje Bilgi Kartı */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <span className={`inline-block rounded-lg px-2 py-0.5 text-xs font-bold ${statusCfg.className} mb-3`}>
                {statusCfg.label}
              </span>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{project.title}</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{project.description}</p>
            </div>

            {/* Aksiyon Butonları */}
            <div className="flex flex-col gap-2 shrink-0">
              {user?.role === "STUDENT" && project.status === "DRAFT" && (
                <button onClick={handleSubmit} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 whitespace-nowrap">
                  📨 Onaya Gönder
                </button>
              )}
              {user?.role === "TEACHER" && project.status === "PENDING" && (
                <>
                  <button onClick={handleApprove} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                    ✅ Onayla
                  </button>
                  <button onClick={handleReject} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">
                    ❌ Reddet
                  </button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Görevler */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Görevler</h3>
        {user?.role === "STUDENT" && (
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
    </div>
  );
}
