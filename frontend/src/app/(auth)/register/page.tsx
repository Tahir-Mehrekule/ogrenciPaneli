"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import toast from "react-hot-toast";
import {
  BookOpen,
  Clock,
  Mail,
  GraduationCap,
  Users,
  ChevronDown,
  X,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import type { DepartmentInfo } from "@/types/auth";

type SelectedRole = "STUDENT" | "TEACHER";

const isStudentEmail = (email: string) =>
  email.toLowerCase().includes("@ogr.");

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
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

  // Bölüm listesini API'den çek
  useEffect(() => {
    apiClient
      .get<DepartmentInfo[]>("/api/v1/admin/departments")
      .then(({ data }) => setDepartments(data))
      .catch(() => {});
  }, []);

  // Email değiştiğinde rolü otomatik kısıtla
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
        // Öğrenci: tek seçim
        return { ...prev, department_ids: already ? [] : [id] };
      }
      // Öğretmen: çoklu seçim
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

    // Email-rol tutarlılık kontrolü (frontend)
    if (isStudentEmail(formData.email) && !isStudent) {
      toast.error("@ogr. mail ile sadece öğrenci olarak kayıt olunabilir.");
      return;
    }
    if (!isStudentEmail(formData.email) && isStudent) {
      toast.error("Öğrenci kaydı için @ogr. uzantılı okul maili gereklidir.");
      return;
    }

    if (isStudent && !/^\d{9}$/.test(formData.student_no)) {
      toast.error("Öğrenci numarası 9 haneli rakamdan oluşmalıdır.");
      return;
    }

    try {
      setIsLoading(true);
      const payload: any = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email,
        password: formData.password,
        role: selectedRole,
        department_ids: formData.department_ids,
      };
      if (isStudent) payload.student_no = formData.student_no;

      const response = await register(payload);

      if (response.approval_status === "pending") {
        setShowPendingModal(true);
      } else {
        toast.success("Kayıt başarılı! Panele yönlendiriliyorsunuz...");
        router.push("/dashboard");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "Kayıt sırasında bir hata oluştu."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDeptNames = departments
    .filter((d) => formData.department_ids.includes(d.id))
    .map((d) => d.name);

  return (
    <>
      <Card className="shadow-xl dark:border-slate-800 dark:bg-slate-900/80 dark:backdrop-blur-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
            <BookOpen className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Yeni Hesap Oluştur
          </CardTitle>

          {/* Rol Toggle */}
          <div className="flex overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setSelectedRole("STUDENT")}
              className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all ${
                isStudent
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-slate-900 dark:text-gray-400 dark:hover:bg-slate-800"
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              Öğrenci
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole("TEACHER")}
              className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all ${
                !isStudent
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-slate-900 dark:text-gray-400 dark:hover:bg-slate-800"
              }`}
            >
              <Users className="h-4 w-4" />
              Öğretmen
            </button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Ad + Soyad */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ad"
                name="first_name"
                type="text"
                placeholder="Ahmet"
                required
                value={formData.first_name}
                onChange={handleChange}
              />
              <Input
                label="Soyad"
                name="last_name"
                type="text"
                placeholder="Yılmaz"
                required
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>

            <Input
              label="Okul E-posta Adresi"
              name="email"
              type="email"
              placeholder={
                isStudent ? "ahmet@ogr.unvan.edu.tr" : "hoca@unvan.edu.tr"
              }
              required
              value={formData.email}
              onChange={handleEmailChange}
            />

            {/* Öğrenci numarası */}
            {isStudent && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <Input
                  label="Öğrenci Numarası"
                  name="student_no"
                  type="text"
                  placeholder="123456789"
                  required
                  maxLength={9}
                  pattern="\d{9}"
                  value={formData.student_no}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                    setFormData((prev) => ({ ...prev, student_no: val }));
                  }}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  9 haneli öğrenci numaranız — sınıfınız otomatik belirlenir
                </p>
              </div>
            )}

            {/* Bölüm Seçici */}
            <div className="relative">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {isStudent ? "Bölüm" : "Bölümler"}{" "}
                {isStudent && <span className="text-xs text-gray-400">(opsiyonel)</span>}
              </label>
              <button
                type="button"
                onClick={() => setDeptDropdownOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-700 hover:border-gray-400 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300"
              >
                <span className="truncate">
                  {selectedDeptNames.length > 0
                    ? selectedDeptNames.join(", ")
                    : "Bölüm seçin..."}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                    deptDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {deptDropdownOpen && (
                <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  {departments.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">
                      Bölüm bulunamadı
                    </p>
                  ) : (
                    departments.map((dept) => {
                      const checked = formData.department_ids.includes(dept.id);
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => {
                            toggleDepartment(dept.id);
                            if (isStudent) setDeptDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 ${
                            checked
                              ? "font-semibold text-emerald-600 dark:text-emerald-400"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {dept.name}
                          {checked && (
                            <span className="ml-2 h-2 w-2 rounded-full bg-emerald-500" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Seçili bölüm chip'leri (öğretmen) */}
              {!isStudent && selectedDeptNames.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedDeptNames.map((name, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() =>
                          toggleDepartment(formData.department_ids[i])
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Input
              label="Şifre"
              name="password"
              type="password"
              placeholder="En az 6 karakter"
              required
              minLength={6}
              value={formData.password}
              onChange={handleChange}
            />

            {isStudent && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/20">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Öğrenci kaydınız öğretmeninizin onayını bekleyecektir.
                  </p>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className={`w-full ${
                isStudent
                  ? "bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500"
                  : "bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500"
              }`}
              isLoading={isLoading}
            >
              {isStudent ? "Kayıt Başvurusu Yap" : "Kayıt Ol ve Sisteme Gir"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Zaten hesabınız var mı?{" "}
            <Link
              href="/login"
              className="font-medium text-emerald-600 hover:text-emerald-500 hover:underline dark:text-emerald-400"
            >
              Giriş Sayfasına Dön
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Onay Bekleniyor Modal */}
      {showPendingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl dark:bg-slate-900">
              <div className="h-2 w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />
              <div className="px-8 py-8 text-center">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40">
                  <GraduationCap className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                  Başvurunuz Alındı!
                </h3>
                <p className="mb-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  Onay bekleniyor
                </p>
                <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  Kaydınız öğretmeniniz veya yetkili tarafından incelenerek
                  onaylandıktan sonra sisteme giriş yapabilirsiniz.
                </p>
                <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-gray-50 px-4 py-3 dark:bg-slate-800">
                  <Mail className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Onay sonrası öğretmeninizle iletişime geçebilirsiniz.
                  </p>
                </div>
                <button
                  onClick={() => router.push("/login")}
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-emerald-700 hover:to-teal-700"
                >
                  Anladım, Giriş Sayfasına Dön
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
