"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FileText, Paperclip, X, AlertTriangle } from "lucide-react";

interface Project {
  id: string;
  title: string;
  course_id: string | null;
}

interface CourseRequirements {
  require_youtube: boolean;
  require_file: boolean;
}

export default function NewReportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [courseReq, setCourseReq] = useState<CourseRequirements | null>(null);

  useEffect(() => {
    apiClient.get("/api/v1/projects").then(({ data }) => setProjects(data.items ?? [])).catch(() => {});
  }, []);

  // Proje seçildiğinde course gereksinimlerini çek
  const handleProjectChange = async (projectId: string) => {
    setSelectedProjectId(projectId);
    setCourseReq(null);
    const project = projects.find((p) => p.id === projectId);
    if (!project?.course_id) return;
    try {
      const { data } = await apiClient.get(`/api/v1/courses/${project.course_id}`);
      if (data.require_youtube || data.require_file) {
        setCourseReq({ require_youtube: data.require_youtube, require_file: data.require_file });
      }
    } catch { /* sessizce devam */ }
  };

  const uploadFile = async (reportId: string) => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      await apiClient.post(`/api/v1/reports/${reportId}/files`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch {
      alert("Rapor oluşturuldu fakat dosya yüklenirken hata oluştu. Dosyayı daha sonra ekleyebilirsiniz.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return setError("Lütfen bir proje seçin.");
    if (!content.trim() || content.length < 20) return setError("Rapor içeriği en az 20 karakter olmalı.");

    try {
      setIsLoading(true);
      setError("");
      const { data } = await apiClient.post("/api/v1/reports", {
        project_id: selectedProjectId,
        content: content.trim(),
        ...(youtubeUrl.trim() ? { youtube_url: youtubeUrl.trim() } : {}),
      });

      // Dosya seçildiyse rapor oluşturulduktan sonra yükle
      if (selectedFile && data?.id) {
        await uploadFile(data.id);
      }

      router.push("/dashboard/reports");
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError("Bu proje için bu hafta zaten bir rapor oluşturdunuz. Mevcut raporunuzu raporlar sayfasından düzenleyebilirsiniz.");
      } else {
        const detail = err.response?.data?.detail;
        if (typeof detail === "string") setError(detail);
        else if (Array.isArray(detail)) setError(detail.map((d: any) => d.msg).join(", "));
        else setError("Rapor oluşturulamadı.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 mb-4">
            <FileText className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <CardTitle>Haftalık Rapor Oluştur</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Hafta ve yıl otomatik belirlenir. Rapor TASLAK olarak başlar.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Proje *</label>
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                <option value="">— Proje seçin</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            {/* Ders Gereksinim Uyarısı */}
            {courseReq && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-400 mb-0.5">Ders Gereksinimleri</p>
                  <p className="text-xs text-gray-400">
                    Teslim sırasında şunlar zorunlu:
                    {courseReq.require_youtube ? " YouTube video linki" : ""}
                    {courseReq.require_youtube && courseReq.require_file ? " ve" : ""}
                    {courseReq.require_file ? " dosya eklenmesi" : ""}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bu Hafta Ne Yaptınız? *
              </label>
              <textarea
                rows={6}
                placeholder="Bu hafta proje üzerinde yaptığınız çalışmalar, ilerlemeler ve karşılaşılan zorluklar... (min 20 karakter)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400 resize-none"
              />
              <p className="mt-1 text-xs text-gray-400">{content.length} / min 20 karakter</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Video Rapor Linki {courseReq?.require_youtube ? "(Zorunlu) *" : "(Opsiyonel)"}
              </label>
              <input
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>

            {/* Dosya Ekleme */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Dosya Ekle {courseReq?.require_file ? "(Zorunlu) *" : "(Opsiyonel)"}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setSelectedFile(file);
                  e.target.value = "";
                }}
              />
              {selectedFile ? (
                <div className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="h-4 w-4 flex-shrink-0 text-indigo-400" />
                    <span className="text-sm text-indigo-300 truncate">{selectedFile.name}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      ({(selectedFile.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="ml-2 flex-shrink-0 p-1 rounded hover:bg-red-500/20 transition-colors"
                  >
                    <X className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 bg-transparent px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400 hover:border-indigo-500/50 hover:text-indigo-400 transition-colors"
                >
                  <Paperclip className="h-4 w-4" />
                  Dosya seçmek için tıklayın
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Oluşturuluyor..." : "Raporu Oluştur"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
