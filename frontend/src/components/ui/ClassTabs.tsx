"use client";

/**
 * ClassTabs — sınıf düzeyi sekmeleri.
 *
 * Tümü | 1. Sınıf | 2. Sınıf | 3. Sınıf | 4. Sınıf  şeklinde butonlar.
 * Her sekme: öğrenci sayısı (badge) + şube sayısı + şube listesi (chip).
 *
 * Stats endpoint'ten gerçek sayılar gelir; "Tüm Şubeler" toggle'ı sekme altında.
 *
 * Reusable: Projects sayfası ve Reports sayfası bu komponenti paylaşır.
 */

import { useEffect, useState } from "react";
import { Users, GraduationCap } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { GRADE_OPTIONS } from "@/constants/grades";

interface SectionStats {
  grade_label: string;
  student_count: number;
  section_count: number;
  sections: string[];
}

interface Props {
  activeGrade: string | null;
  activeBranch: string | null;
  showAllBranches: boolean;
  departmentId?: string | null;
  onChange: (next: {
    grade: string | null;
    branch: string | null;
    showAll: boolean;
  }) => void;
}

export default function ClassTabs({
  activeGrade,
  activeBranch,
  showAllBranches,
  departmentId,
  onChange,
}: Props) {
  const [stats, setStats] = useState<Record<string, SectionStats>>({});
  const [loading, setLoading] = useState(false);

  // Stats'ı her grade için ayrı çek (paralel)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const results = await Promise.all(
          GRADE_OPTIONS.map((g) =>
            apiClient
              .get<SectionStats>("/api/v1/class-sections/stats", {
                params: {
                  grade_label: g,
                  ...(departmentId ? { department_id: departmentId } : {}),
                },
              })
              .then((r) => r.data)
              .catch(() => ({
                grade_label: g,
                student_count: 0,
                section_count: 0,
                sections: [],
              }))
          )
        );
        if (cancelled) return;
        const map: Record<string, SectionStats> = {};
        for (const s of results) map[s.grade_label] = s;
        setStats(map);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [departmentId]);

  const selectedSections = activeGrade ? stats[activeGrade]?.sections ?? [] : [];

  return (
    <div className="space-y-3">
      {/* Sekme satırı */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-slate-700 pb-2">
        <button
          type="button"
          onClick={() =>
            onChange({ grade: null, branch: null, showAll: false })
          }
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            activeGrade === null
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Tümü
        </button>

        {GRADE_OPTIONS.map((g) => {
          const s = stats[g];
          const isActive = activeGrade === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() =>
                onChange({ grade: g, branch: null, showAll: true })
              }
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              {g}
              {s && (
                <span
                  className={`ml-1 inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                  }`}
                  title={`${s.student_count} öğrenci · ${s.section_count} şube`}
                >
                  {loading ? "…" : s.student_count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Aktif sekme altı: şube chip'leri + tüm şubeler toggle */}
      {activeGrade && selectedSections.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Şubeler:
          </span>
          <button
            type="button"
            onClick={() =>
              onChange({ grade: activeGrade, branch: null, showAll: true })
            }
            className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
              showAllBranches && activeBranch === null
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
            }`}
          >
            Tüm Şubeler
          </button>
          {selectedSections.map((br) => (
            <button
              key={br}
              type="button"
              onClick={() =>
                onChange({
                  grade: activeGrade,
                  branch: br,
                  showAll: false,
                })
              }
              className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                activeBranch === br
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
              }`}
            >
              {br} Şubesi
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
