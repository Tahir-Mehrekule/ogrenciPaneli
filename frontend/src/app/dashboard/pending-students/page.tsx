"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/Card";
import { UserCheck, UserX, Clock, GraduationCap, Building2 } from "lucide-react";
import toast from "react-hot-toast";

interface PendingStudent {
  id: string;
  email: string;
  name: string;
  student_no: string | null;
  department: string | null;
  created_at: string;
}

export default function PendingStudentsPage() {
  const [students, setStudents] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    try {
      const { data } = await apiClient.get<PendingStudent[]>("/api/v1/admin/pending-students");
      setStudents(data);
    } catch {
      toast.error("Liste yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleApprove = async (id: string, name: string) => {
    setProcessingId(id);
    try {
      await apiClient.post(`/api/v1/admin/pending-students/${id}/approve`);
      toast.success(`${name} onaylandı. Artık sisteme giriş yapabilir.`);
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Onaylama başarısız.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    if (!confirm(`${name} adlı öğrencinin kaydını reddetmek istediğinize emin misiniz?`)) return;
    setProcessingId(id);
    try {
      await apiClient.post(`/api/v1/admin/pending-students/${id}/reject`);
      toast.success(`${name} kaydı reddedildi.`);
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Red işlemi başarısız.");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("tr-TR", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Onay Bekleyen Öğrenciler</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Yükleniyor...</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-24 p-6 bg-gray-50 dark:bg-slate-800/50 rounded-2xl" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Onay Bekleyen Öğrenciler
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kayıt başvurusunda bulunan ve onayınızı bekleyen öğrenciler.
          </p>
        </div>
        {students.length > 0 && (
          <span className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
            <Clock className="h-4 w-4" />
            {students.length} bekleyen
          </span>
        )}
      </div>

      {/* Boş durum */}
      {students.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
              <UserCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-base font-semibold text-gray-900 dark:text-white">Harika!</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Onay bekleyen öğrenci bulunmuyor.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Öğrenci kartları */}
      <div className="space-y-3">
        {students.map((student) => (
          <Card key={student.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                {/* Öğrenci Bilgileri */}
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                    <GraduationCap className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{student.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{student.email}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {student.student_no && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          No: {student.student_no}
                        </span>
                      )}
                      {student.department && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                          <Building2 className="h-3 w-3" />
                          {student.department}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(student.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Aksiyon Butonları */}
                <div className="flex shrink-0 items-center gap-2 pl-15 sm:pl-0">
                  <button
                    onClick={() => handleApprove(student.id, student.name)}
                    disabled={processingId === student.id}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserCheck className="h-4 w-4" />
                    Onayla
                  </button>
                  <button
                    onClick={() => handleReject(student.id, student.name)}
                    disabled={processingId === student.id}
                    className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-800/40 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserX className="h-4 w-4" />
                    Reddet
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
