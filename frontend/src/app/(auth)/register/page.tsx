"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import {
  GraduationCap,
  Users,
  Mail,
  Lock,
  User,
  Hash,
  ChevronDown,
  X,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import type { DepartmentInfo } from "@/types/auth";
import { parseStudentNumber } from "@/lib/studentNumberParser";

type SelectedRole = "STUDENT" | "TEACHER";

const isStudentEmail = (email: string) => email.toLowerCase().includes("@ogr.");

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<SelectedRole>("STUDENT");
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    student_no: "",
    department_ids: [] as string[],
  });

  useEffect(() => {
    apiClient
      .get<DepartmentInfo[]>("/api/v1/departments")
      .then(({ data }) => setDepartments(data))
      .catch((err) => {
        console.error("Bölümler yüklenemedi:", err);
      });
  }, []);

  // Öğrenci numarasından bölümü otomatik belirle
  useEffect(() => {
    if (selectedRole !== "STUDENT" || departments.length === 0) return;
    const parsed = parseStudentNumber(formData.student_no);
    if (!parsed) {
      setFormData((prev) => ({ ...prev, department_ids: [] }));
      return;
    }
    const matched = departments.find((d) => d.code === parsed.departmentCode);
    setFormData((prev) => ({
      ...prev,
      department_ids: matched ? [matched.id] : [],
    }));
  }, [formData.student_no, selectedRole, departments]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData((prev) => ({ ...prev, email }));
    if (isStudentEmail(email)) setSelectedRole("STUDENT");
    else if (selectedRole === "STUDENT") setSelectedRole("TEACHER");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleDepartment = (id: string) => {
    setFormData((prev) => {
      const already = prev.department_ids.includes(id);
      if (selectedRole === "STUDENT") {
        return { ...prev, department_ids: already ? [] : [id] };
      }
      return {
        ...prev,
        department_ids: already
          ? prev.department_ids.filter((d) => d !== id)
          : [...prev.department_ids, id],
      };
    });
  };

  const isStudent = selectedRole === "STUDENT";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isStudentEmail(formData.email) && !isStudent) {
      toast.error("@ogr. mail ile sadece öğrenci kaydı yapılabilir.");
      return;
    }
    if (!isStudentEmail(formData.email) && isStudent) {
      toast.error("Öğrenci kaydı için @ogr. uzantılı okul maili gerekli.");
      return;
    }
    if (isStudent && !/^\d{9}$/.test(formData.student_no)) {
      toast.error("Öğrenci numarası 9 haneli olmalıdır.");
      return;
    }

    try {
      setIsLoading(true);
      const payload: {
        first_name: string;
        last_name: string;
        email: string;
        password: string;
        role: string;
        department_ids: string[];
        student_no?: string;
      } = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email,
        password: formData.password,
        role: selectedRole.toLowerCase(),
        department_ids: formData.department_ids,
      };
      if (isStudent) payload.student_no = formData.student_no;

      await register(payload);
      toast.success("Hesabınız oluşturuldu!");
      router.push("/dashboard");
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "Kayıt sırasında hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDeptNames = departments
    .filter((d) => formData.department_ids.includes(d.id))
    .map((d) => d.name);

  const inputBase =
    "w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight dark:text-white">
          Hesap oluşturun
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Sisteme katılmak için bilgilerinizi girin.
        </p>
      </div>

      {/* Role selector */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setSelectedRole("STUDENT")}
          className={`flex items-center justify-center gap-2.5 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
            isStudent
              ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-300"
              : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          Öğrenci
        </button>
        <button
          type="button"
          onClick={() => setSelectedRole("TEACHER")}
          className={`flex items-center justify-center gap-2.5 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
            !isStudent
              ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-300"
              : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
          }`}
        >
          <Users className="h-4 w-4" />
          Öğretmen
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Ad + Soyad */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Ad</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                name="first_name"
                type="text"
                placeholder="Ahmet"
                required
                value={formData.first_name}
                onChange={handleChange}
                className={inputBase}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Soyad</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                name="last_name"
                type="text"
                placeholder="Yılmaz"
                required
                value={formData.last_name}
                onChange={handleChange}
                className={inputBase}
              />
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            Okul E-posta Adresi
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              name="email"
              type="email"
              placeholder={isStudent ? "ahmet@ogr.uni.edu.tr" : "hoca@uni.edu.tr"}
              required
              value={formData.email}
              onChange={handleEmailChange}
              className={inputBase}
            />
          </div>
          {isStudentEmail(formData.email) && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              ✓ Öğrenci maili tespit edildi — rol otomatik atandı
            </p>
          )}
        </div>

        {/* Öğrenci numarası */}
        {isStudent && (
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              Öğrenci Numarası
            </label>
            <div className="relative">
              <Hash className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                name="student_no"
                type="text"
                placeholder="123456789"
                required
                maxLength={9}
                value={formData.student_no}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                  setFormData((prev) => ({ ...prev, student_no: val }));
                }}
                className={inputBase}
              />
            </div>
            {(() => {
              const parsed = parseStudentNumber(formData.student_no);
              if (formData.student_no.length === 0) {
                return <p className="text-xs text-gray-400">9 haneli numara — sınıfınız otomatik belirlenir</p>;
              }
              if (!parsed) {
                if (formData.student_no.length < 9) {
                  return (
                    <p className="text-xs text-gray-400">
                      {formData.student_no.length}/9 hane — devam edin
                    </p>
                  );
                }
                return <p className="text-xs text-red-500">Geçersiz öğrenci no formatı.</p>;
              }
              const matchedDept = departments.find((d) => d.code === parsed.departmentCode);
              return (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs space-y-0.5">
                  <p className="font-medium text-emerald-600 dark:text-emerald-400">Tespit edildi:</p>
                  <p className="text-gray-600 dark:text-gray-300">
                    <span className="font-mono">{parsed.yearPrefix}</span> · {parsed.academicYear} girişli
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    <span className="font-mono">{parsed.departmentCode}</span> ·{" "}
                    {matchedDept ? (
                      <span className="font-medium">{matchedDept.name}</span>
                    ) : (
                      <span className="text-amber-500">Bu kodla bölüm bulunamadı</span>
                    )}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    Sıra: <span className="font-mono">{parsed.sequence}</span> ({parsed.sequenceInt})
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Bölüm — öğrenci için otomatik, öğretmen için manuel */}
        {isStudent ? (
          (() => {
            const parsed = parseStudentNumber(formData.student_no);
            const matchedDept = parsed
              ? departments.find((d) => d.code === parsed.departmentCode)
              : null;
            if (!parsed || formData.student_no.length < 9) return null;
            return (
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/8 px-4 py-3 text-sm dark:bg-indigo-500/10">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mb-1">
                  Bölüm otomatik belirlendi
                </p>
                {matchedDept ? (
                  <p className="font-medium text-gray-800 dark:text-gray-100">
                    {matchedDept.name}
                    <span className="ml-2 font-mono text-xs text-indigo-400">({parsed.departmentCode})</span>
                  </p>
                ) : (
                  <p className="text-amber-600 dark:text-amber-400">
                    Kod <span className="font-mono">{parsed.departmentCode}</span> ile eşleşen bölüm bulunamadı.
                  </p>
                )}
              </div>
            );
          })()
        ) : (
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              Bölümler
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDeptDropdownOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 transition hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              >
                <span className="truncate">
                  {selectedDeptNames.length > 0
                    ? selectedDeptNames.join(", ")
                    : "Bölüm seçin..."}
                </span>
                <ChevronDown
                  className={`ml-2 h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                    deptDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {deptDropdownOpen && (
                <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  {departments.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">Bölüm bulunamadı</p>
                  ) : (
                    departments.map((dept) => {
                      const checked = formData.department_ids.includes(dept.id);
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => toggleDepartment(dept.id)}
                          className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 ${
                            checked
                              ? "font-semibold text-indigo-600 dark:text-indigo-400"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {dept.name}
                          {checked && (
                            <div className="h-2 w-2 rounded-full bg-indigo-500" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {selectedDeptNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {formData.department_ids.map((id) => {
                  const name = departments.find((d) => d.id === id)?.name ?? "";
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                    >
                      {name}
                      <button type="button" onClick={() => toggleDepartment(id)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Şifre */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Şifre</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="En az 6 karakter"
              required
              minLength={6}
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              className={`${inputBase} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Hesap oluşturuluyor...
            </>
          ) : (
            <>
              Hesap Oluştur
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Zaten hesabınız var mı?{" "}
        <Link
          href="/login"
          className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Giriş Yap
        </Link>
      </p>
    </div>
  );
}
