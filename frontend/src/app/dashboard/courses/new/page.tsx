"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BookOpen } from "lucide-react";

type ProjectType = "individual" | "team" | "both";

interface Department {
  id: string;
  name: string;
}

const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string; desc: string }[] = [
  { value: "both",       label: "Her İkisi",              desc: "Öğrenci bireysel veya ekip seçer" },
  { value: "individual", label: "Bireysel Proje Zorunlu", desc: "Sadece bireysel proje açılabilir" },
  { value: "team",       label: "Ekip Projesi Zorunlu",   desc: "Sadece ekip projesi açılabilir" },
];

export default function NewCoursePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [semester, setSemester] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [branch, setBranch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("both");
  const [requireYoutube, setRequireYoutube] = useState(false);
  const [requireFile, setRequireFile] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient.get("/api/v1/departments?size=100").then((res) => {
      setDepartments(res.data?.items ?? []);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !semester) {
      setError("Ders adı, kodu ve dönemi zorunludur.");
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      await apiClient.post("/api/v1/courses", {
        name,
        code,
        semester,
        grade_level: gradeLevel || undefined,
        branch: branch || undefined,
        department_id: departmentId || undefined,
        project_type: projectType,
        require_youtube: requireYoutube,
        require_file: requireFile,
      });
      router.push("/dashboard/courses");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") setError(detail);
      else if (Array.isArray(detail)) setError(detail.map((d: any) => d.msg).join(", "));
      else setError("Ders oluşturulamadı.");
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
            Bölümünüzdeki öğrenciler bu dersi otomatik olarak görür.
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
              <label htmlFor="crs-name" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ders Adı
              </label>
              <input
                id="crs-name"
                type="text"
                placeholder="Yazılım Mühendisliği"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="crs-code" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ders Kodu
              </label>
              <input
                id="crs-code"
                type="text"
                placeholder="CENG314"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="crs-semester" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Dönem
              </label>
              <input
                id="crs-semester"
                type="text"
                placeholder="2025-2026 Güz"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Bölüm */}
            <div>
              <label htmlFor="crs-department" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bölüm <span className="text-gray-400 font-normal">(Opsiyonel)</span>
              </label>
              <select
                id="crs-department"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className={inputClass}
              >
                <option value="">— Bölüm seçin —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Seçilen bölümdeki öğrenciler bu dersi otomatik görür.
              </p>
            </div>

            {/* Sınıf / Şube */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="crs-grade" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sınıf / Yıl <span className="text-gray-400 font-normal">(Opsiyonel)</span>
                </label>
                <input
                  id="crs-grade"
                  type="text"
                  placeholder="2. Sınıf"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="crs-branch" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Şube <span className="text-gray-400 font-normal">(Opsiyonel)</span>
                </label>
                <input
                  id="crs-branch"
                  type="text"
                  placeholder="A Şubesi"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Proje Tipi */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Proje Tipi
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Bu derse öğrencilerin oluşturabileceği proje türü.
              </p>
              <div className="space-y-2">
                {PROJECT_TYPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      projectType === opt.value
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-200 dark:border-slate-600 hover:border-indigo-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="project_type"
                      value={opt.value}
                      checked={projectType === opt.value}
                      onChange={() => setProjectType(opt.value)}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{opt.label}</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Rapor Gereksinimleri */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Haftalık Rapor Gereksinimleri
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Öğrencilerin rapor teslim ederken uyması gereken zorunluluklar.
              </p>

              <label className="flex items-center gap-3 cursor-pointer">
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

              <label className="flex items-center gap-3 cursor-pointer">
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
