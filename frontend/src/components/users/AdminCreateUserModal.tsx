"use client";

/**
 * AdminCreateUserModal — Admin'in yeni öğretmen veya öğrenci eklediği form.
 * Admin Plan B5 + ADMIN_PLAN_2 / Paket F (politika ince ayarı).
 *
 * Davranış:
 *  - Rol seçici (Öğrenci / Öğretmen)
 *  - Ortak: email, geçici şifre, ad, soyad
 *  - STUDENT: bölüm TEK SEÇİM (radio), student_no canlı parse, class_section opsiyonel.
 *             course_ids YOK — öğrenci bölümünün tüm derslerini otomatik görür.
 *  - TEACHER: bölüm MULTI seçim + course_ids MULTI seçim
 *             (seçilen derslerin teacher_id'si bu kullanıcıya devredilir).
 *  - Submit → POST /api/v1/users (admin-only endpoint).
 */

import { useEffect, useState } from "react";
import { X, GraduationCap, UserCog, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import { FocusTrapContainer } from "@/components/ui/FocusTrapContainer";
import { parseStudentNumber } from "@/lib/studentNumberParser";

interface Department {
  id: string;
  name: string;
  code?: string;
}

interface ClassSection {
  id: string;
  grade_label: string;
  branch_code: string;
  department_id: string;
}

interface CourseLite {
  id: string;
  name: string;
  code: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void; // başarıda parent listesini yenilesin
}

type Role = "STUDENT" | "TEACHER";

const INPUT =
  "w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500 placeholder-gray-500";

export default function AdminCreateUserModal({ open, onClose, onCreated }: Props) {
  const [role, setRole] = useState<Role>("STUDENT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [studentNo, setStudentNo] = useState("");
  const [classSectionId, setClassSectionId] = useState("");
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [courses, setCourses] = useState<CourseLite[]>([]);

  useEffect(() => {
    if (!open) return;
    // Department listesini çek
    apiClient.get<Department[]>("/api/v1/departments")
      .then(({ data }) => setDepartments(data))
      .catch(() => toast.error("Bölümler yüklenemedi"));
  }, [open]);

  // STUDENT için class_sections, TEACHER için courses çek.
  useEffect(() => {
    if (!open) return;
    if (role === "STUDENT") {
      apiClient.get<{ items: ClassSection[] }>("/api/v1/class-sections?size=200")
        .then(({ data }) => setSections(data?.items ?? []))
        .catch(() => setSections([]));
    }
    if (role === "TEACHER") {
      apiClient.get<{ items: CourseLite[] }>("/api/v1/courses?size=200")
        .then(({ data }) => setCourses(data?.items ?? []))
        .catch(() => setCourses([]));
    }
  }, [open, role]);

  // Rol değişiminde role-specific seçimleri sıfırla (yanlış payload göndermemek için).
  useEffect(() => {
    setCourseIds([]);
    setStudentNo("");
    setClassSectionId("");
    // STUDENT'a geçişte birden fazla dept seçili kalmışsa ilkine indir.
    if (role === "STUDENT") {
      setDepartmentIds((prev) => (prev.length > 1 ? [prev[0]] : prev));
    }
  }, [role]);

  // Modal kapanırken state reset
  useEffect(() => {
    if (open) return;
    setEmail("");
    setPassword("");
    setShowPw(false);
    setFirstName("");
    setLastName("");
    setDepartmentIds([]);
    setStudentNo("");
    setClassSectionId("");
    setCourseIds([]);
  }, [open]);

  const toggleDept = (id: string) => {
    if (role === "STUDENT") {
      // STUDENT tek bölüme atanır — radio davranışı.
      setDepartmentIds([id]);
      return;
    }
    setDepartmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleCourse = (id: string) => {
    setCourseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const parsed = role === "STUDENT" ? parseStudentNumber(studentNo) : null;
  const matchedDept = parsed
    ? departments.find((d) => d.code === parsed.departmentCode)
    : null;
  // Şubeler bölüm bazında filtrele (STUDENT'sa)
  const departmentSections = sections.filter((s) =>
    departmentIds.includes(s.department_id)
  );

  const validate = (): string | null => {
    if (!email.trim() || !email.includes("@")) return "Geçerli bir email girin.";
    if (password.length < 8) return "Şifre en az 8 karakter olmalı.";
    if (firstName.trim().length < 2) return "Ad en az 2 karakter olmalı.";
    if (lastName.trim().length < 2) return "Soyad en az 2 karakter olmalı.";
    if (role === "STUDENT") {
      if (departmentIds.length !== 1)
        return "Öğrenci tam olarak bir bölüme atanmalıdır.";
      if (!/^\d{9}$/.test(studentNo)) return "Öğrenci no 9 haneli olmalı.";
    } else {
      if (departmentIds.length < 1) return "Öğretmen için en az bir bölüm seçin.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const payload: {
        role: Role;
        email: string;
        password: string;
        first_name: string;
        last_name: string;
        department_ids: string[];
        student_no?: string;
        class_section_id?: string;
        course_ids?: string[];
      } = {
        role,
        email: email.trim().toLowerCase(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        department_ids: departmentIds,
      };
      if (role === "STUDENT") {
        payload.student_no = studentNo.trim();
        if (classSectionId) payload.class_section_id = classSectionId;
        // course_ids gönderilmiyor — öğrenci bölüm bazlı otomatik erişimle çalışır.
      } else if (role === "TEACHER" && courseIds.length > 0) {
        // Seçilen derslerin teacher_id'si backend'de bu yeni kullanıcıya set edilir.
        payload.course_ids = courseIds;
      }
      await apiClient.post("/api/v1/users", payload);
      toast.success(`${role === "STUDENT" ? "Öğrenci" : "Öğretmen"} başarıyla eklendi.`);
      onCreated();
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail;
      const msg = typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d?.msg || JSON.stringify(d)).join(", ")
          : "Kullanıcı eklenemedi.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <FocusTrapContainer
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Yeni Kullanıcı Ekle</h2>
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Rol seçici */}
          <div className="grid grid-cols-2 gap-3">
            {(["STUDENT", "TEACHER"] as Role[]).map((r) => {
              const active = role === r;
              const Icon = r === "STUDENT" ? GraduationCap : UserCog;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors ${
                    active
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                      : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {r === "STUDENT" ? "Öğrenci" : "Öğretmen"}
                </button>
              );
            })}
          </div>

          {/* Ortak alanlar */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Ad</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={INPUT} maxLength={100} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Soyad</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={INPUT} maxLength={100} required />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">E-posta</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} required />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Geçici Şifre (min 8)</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${INPUT} pr-10`}
                minLength={8}
                maxLength={72}
                required
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Kullanıcı ilk girişten sonra şifresini değiştirebilir.</p>
          </div>

          {/* Bölüm (zorunlu) — STUDENT: tek seçim (radio), TEACHER: multi (checkbox) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              Bölüm <span className="text-red-500">*</span>
              <span className="text-gray-500">
                {role === "STUDENT"
                  ? " (tek bölüm seçilmelidir)"
                  : " (en az 1, birden fazla seçilebilir)"}
              </span>
            </label>
            <div className="max-h-32 overflow-y-auto rounded-xl border border-gray-700 bg-gray-800 p-2 space-y-1">
              {departments.length === 0 ? (
                <p className="text-xs text-gray-500">Bölüm yok</p>
              ) : (
                departments.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 px-2 py-1 cursor-pointer rounded hover:bg-gray-700">
                    <input
                      type={role === "STUDENT" ? "radio" : "checkbox"}
                      name={role === "STUDENT" ? "dept-radio" : undefined}
                      checked={departmentIds.includes(d.id)}
                      onChange={() => toggleDept(d.id)}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm text-gray-200">
                      {d.code && <span className="font-mono text-xs text-indigo-400 mr-2">{d.code}</span>}
                      {d.name}
                    </span>
                  </label>
                ))
              )}
            </div>
            {role === "STUDENT" && (
              <p className="mt-1 text-xs text-gray-500">
                Öğrenci, seçilen bölümün tüm derslerini otomatik görür.
              </p>
            )}
          </div>

          {/* STUDENT'a özel alanlar */}
          {role === "STUDENT" && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">
                  Öğrenci No <span className="text-red-500">*</span>
                </label>
                <input
                  value={studentNo}
                  onChange={(e) => setStudentNo(e.target.value.replace(/\D/g, "").slice(0, 9))}
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="245235024"
                  className={`${INPUT} font-mono tracking-wider`}
                />
                {studentNo.length > 0 && studentNo.length < 9 && (
                  <p className="mt-1 text-xs text-gray-400">{studentNo.length}/9 hane</p>
                )}
                {parsed && (
                  <div className="mt-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs space-y-0.5">
                    <p>
                      <span className="font-mono">{parsed.yearPrefix}</span> · {parsed.academicYear} girişli
                    </p>
                    <p>
                      <span className="font-mono">{parsed.departmentCode}</span> ·{" "}
                      {matchedDept ? (
                        <span className="font-medium text-emerald-300">{matchedDept.name}</span>
                      ) : (
                        <span className="text-amber-400">Bu kodla bölüm bulunamadı</span>
                      )}
                    </p>
                    <p className="text-gray-400">
                      Sıra: <span className="font-mono">{parsed.sequence}</span>
                    </p>
                  </div>
                )}
              </div>

              {departmentSections.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">
                    Şube <span className="text-gray-500">(opsiyonel)</span>
                  </label>
                  <select
                    value={classSectionId}
                    onChange={(e) => setClassSectionId(e.target.value)}
                    className={INPUT}
                  >
                    <option value="">— Şube seçin —</option>
                    {departmentSections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.grade_label} · {s.branch_code} Şubesi
                      </option>
                    ))}
                  </select>
                </div>
              )}

            </>
          )}

          {/* TEACHER'a özel: ders atama (opsiyonel multi). */}
          {role === "TEACHER" && courses.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">
                Atanacak Dersler <span className="text-gray-500">(opsiyonel)</span>
              </label>
              <div className="max-h-32 overflow-y-auto rounded-xl border border-gray-700 bg-gray-800 p-2 space-y-1">
                {courses.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1 cursor-pointer rounded hover:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={courseIds.includes(c.id)}
                      onChange={() => toggleCourse(c.id)}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm text-gray-200">
                      <span className="font-mono text-xs text-indigo-400 mr-2">{c.code}</span>
                      {c.name}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-amber-400/80">
                Seçilen derslerin öğretmenliği bu yeni kullanıcıya devredilir
                (mevcut öğretmen değiştirilir).
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-gray-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Ekleniyor..." : "Ekle"}
            </button>
          </div>
        </form>
      </FocusTrapContainer>
    </div>
  );
}
