"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FolderKanban, Clock, ArrowRight, Send } from "lucide-react";

interface Course {
  id: string;
  name: string;
  code: string;
  semester: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [submittedForApproval, setSubmittedForApproval] = useState(false);

  useEffect(() => {
    apiClient.get("/api/v1/courses").then(({ data }) => setCourses(data.items ?? [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent, submitForApproval = false) => {
    e.preventDefault();
    if (!title.trim() || title.length < 3) return setError("Proje başlığı en az 3 karakter olmalı.");
    if (!description.trim() || description.length < 10) return setError("Açıklama en az 10 karakter olmalı.");

    try {
      setIsLoading(true);
      setError("");
      const { data } = await apiClient.post("/api/v1/projects", {
        title: title.trim(),
        description: description.trim(),
        ...(selectedCourseId ? { course_id: selectedCourseId } : {}),
      });

      // Direkt onaya gönder seçildiyse submit endpoint'ini de çağır
      if (submitForApproval) {
        try {
          await apiClient.post(`/api/v1/projects/${data.id}/submit`);
        } catch {
          // submit başarısız olsa bile proje oluşturuldu, DRAFT kalır
        }
      }

      setSubmittedForApproval(submitForApproval);
      setCreatedProjectId(data.id);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") setError(detail);
      else if (Array.isArray(detail)) setError(detail.map((d: any) => d.msg).join(", "));
      else setError("Proje oluşturulamadı.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Başarı Ekranı ──
  if (createdProjectId) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardContent className="p-8 flex flex-col items-center text-center gap-4">
            <div className={`flex h-20 w-20 items-center justify-center rounded-full border-2 ${submittedForApproval ? "bg-amber-500/10 border-amber-500/30" : "bg-slate-500/10 border-slate-500/30"}`}>
              <Clock className={`h-10 w-10 ${submittedForApproval ? "text-amber-400" : "text-slate-400"}`} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {submittedForApproval ? "Proje Onaya Gönderildi! 🚀" : "Proje Taslak Olarak Kaydedildi! 📝"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                <strong className="text-gray-900 dark:text-white">&quot;{title}&quot;</strong>{" "}
                {submittedForApproval ? "projeniz öğretmeninizin onayına gönderildi." : "projeniz taslak olarak kaydedildi."}
              </p>
            </div>

            {/* Durum Kutusu */}
            {submittedForApproval ? (
              <div className="w-full rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-left">
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">⏳</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-400 mb-1">Öğretmen Onayı Bekleniyor</p>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Öğretmeniniz projenizi inceleyip onayladıktan sonra proje aktif hale gelecek ve görev ekleyebileceksiniz.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full rounded-xl bg-slate-500/10 border border-slate-500/20 p-4 text-left">
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">💾</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-300 mb-1">Taslak Olarak Kaydedildi</p>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Proje henüz öğretmeninize gönderilmedi. Proje detayına gidip hazır olduğunuzda <strong className="text-white">&quot;Onaya Gönder&quot;</strong> butonunu kullanabilirsiniz.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Adımlar */}
            {!submittedForApproval && (
              <div className="w-full space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">Sonraki Adımlar</p>
                {[
                  { icon: "1️⃣", text: "Proje detayına gir ve içeriği gözden geçir" },
                  { icon: "2️⃣", text: "\"Onaya Gönder\" butonuna bas" },
                  { icon: "3️⃣", text: "Öğretmen onayı sonrası görev ekleyebilirsin" },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2">
                    <span className="text-base">{step.icon}</span>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{step.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Butonlar */}
            <div className="w-full flex gap-3 mt-2">
              <button
                onClick={() => router.push(`/dashboard/projects/${createdProjectId}`)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                Projeyi Görüntüle
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => router.push("/dashboard/projects")}
                className="flex-1 rounded-xl bg-slate-200 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Proje Listesi
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Form Ekranı ──
  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 mb-4">
            <FolderKanban className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <CardTitle>Yeni Proje Oluştur</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            İstersen taslak olarak kaydet, istersen hemen onaya gönder.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Proje Başlığı</label>
              <input
                type="text"
                placeholder="örn. Yapay Zeka Destekli Not Uygulaması"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Proje Açıklaması</label>
              <textarea
                rows={4}
                placeholder="Projenizin amacını ve kapsamını açıklayın..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400 resize-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Ders (Opsiyonel)</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                <option value="">— Ders seçme</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name} ({c.semester})</option>
                ))}
              </select>
            </div>

            {/* İki Buton */}
            <div className="flex gap-3 pt-1">
              {/* Taslak Kaydet */}
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? "Kaydediliyor..." : "💾 Taslak Kaydet"}
              </button>

              {/* Onaya Gönder */}
              <button
                type="button"
                disabled={isLoading}
                onClick={(e) => {
                  e.preventDefault();
                  // Validasyon
                  if (!title.trim() || title.length < 3) { setError("Proje başlığı en az 3 karakter olmalı."); return; }
                  if (!description.trim() || description.length < 10) { setError("Açıklama en az 10 karakter olmalı."); return; }
                  handleSubmit(e as any, true);
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
                {isLoading ? "Gönderiliyor..." : "Onaya Gönder"}
              </button>
            </div>

            <p className="text-xs text-center text-gray-400">
              💡 Taslak olarak kaydedip daha sonra da onaya gönderebilirsin
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
