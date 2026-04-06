"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BookOpen } from "lucide-react";

export default function NewCoursePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [semester, setSemester] = useState("");
  const [requireYoutube, setRequireYoutube] = useState(false);
  const [requireFile, setRequireFile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !semester) {
      setError("Tüm alanları doldurun.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      await apiClient.post("/api/v1/courses", {
        name,
        code,
        semester,
        require_youtube: requireYoutube,
        require_file: requireFile,
      });
      router.push("/dashboard/courses");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg).join(", "));
      } else {
        setError("Ders oluşturulamadı.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400";

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 mb-4">
            <BookOpen className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <CardTitle>Yeni Ders Oluştur</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Öğrencilerin kaydolabileceği yeni bir ders açın.
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
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ders Adı
              </label>
              <input
                type="text"
                placeholder="Yazılım Mühendisliği"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ders Kodu
              </label>
              <input
                type="text"
                placeholder="CENG314"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Dönem
              </label>
              <input
                type="text"
                placeholder="2025-2026 Güz"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Rapor Gereksinimleri */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Haftalık Rapor Gereksinimleri
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Öğrencilerin rapor teslim ederken uyması gereken zorunluluklar.
              </p>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={requireYoutube}
                    onChange={(e) => setRequireYoutube(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-300 dark:bg-slate-600 rounded-full peer-checked:bg-indigo-600 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
                </div>
                <div>
                  <span className="text-sm text-gray-700 dark:text-gray-200">YouTube video zorunlu</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Rapor tesliminde video linki şartı</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={requireFile}
                    onChange={(e) => setRequireFile(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-300 dark:bg-slate-600 rounded-full peer-checked:bg-indigo-600 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
                </div>
                <div>
                  <span className="text-sm text-gray-700 dark:text-gray-200">Dosya ekleme zorunlu</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Rapor tesliminde en az bir dosya şartı</p>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Oluşturuluyor..." : "Dersi Oluştur"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
