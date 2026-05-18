"use client";

/**
 * useRoleMode — Sayfa katmanında rol-bazlı yetki bayraklarını tek noktadan sağlar.
 *
 * Amaç: Sayfaların `role === "ADMIN"` / `role === "TEACHER"` koşullarını her yerde
 * tekrarlamasını engellemek (DRY).
 *
 * Kullanım örneği:
 *   const { canEdit, canHardDelete, canSoftDelete, isReadOnly } = useRoleMode("tasks");
 *
 * Politika (CLAUDE.md kurallarına göre):
 *   - Tasks:    Student/Teacher edit yapar; Admin sadece görüntüler (sistem kontrolü)
 *   - Projects: Teacher/Admin yetkili (öğretmen onaylar, admin hard delete)
 *   - Reports:  Student kendi DRAFT'ını yönetir, Teacher review, Admin hard delete
 *   - Courses:  Teacher kendi dersini düzenler, Admin hard delete
 *   - Students: Teacher kendi öğrencilerini görür, Admin tümünü
 */

import { useAuth } from "@/hooks/useAuth";

export type FeatureArea = "tasks" | "projects" | "reports" | "courses" | "students";

export interface RoleMode {
  role: "STUDENT" | "TEACHER" | "ADMIN" | undefined;
  isStudent: boolean;
  isTeacher: boolean;
  isAdmin: boolean;
  isStaff: boolean;        // teacher | admin
  canCreate: boolean;      // yeni kayıt ekleme
  canEdit: boolean;        // mevcut kaydı düzenleme
  canSoftDelete: boolean;  // soft delete
  canHardDelete: boolean;  // kalıcı silme (sadece admin)
  isReadOnly: boolean;     // sayfa salt görüntü mü
}

export function useRoleMode(area: FeatureArea): RoleMode {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase() as RoleMode["role"];

  const isStudent = role === "STUDENT";
  const isTeacher = role === "TEACHER";
  const isAdmin = role === "ADMIN";
  const isStaff = isTeacher || isAdmin;

  // Varsayılan davranış: hiçbir şey yapamaz
  let canCreate = false;
  let canEdit = false;
  let canSoftDelete = false;

  switch (area) {
    case "tasks":
      // Tasks: Admin sistem kontrolü için var, görev CRUD'u öğretmen/öğrencinin işi
      canCreate = isStudent || isTeacher;
      canEdit = isStudent || isTeacher;
      canSoftDelete = isStudent || isTeacher;
      break;
    case "projects":
      canCreate = isStudent || isStaff;
      canEdit = isStudent || isStaff;
      canSoftDelete = isStaff; // teacher kendi dersi, admin tümü (backend yetkilendirir)
      break;
    case "reports":
      canCreate = isStudent;       // öğrenci rapor verir
      canEdit = isStudent || isStaff; // student kendi DRAFT'ı, teacher feedback yazabilir
      canSoftDelete = isStaff || isStudent;
      break;
    case "courses":
      canCreate = isStaff;
      canEdit = isStaff;
      canSoftDelete = isStaff;
      break;
    case "students":
      canCreate = false;            // öğrenci kendi register eder
      canEdit = isAdmin;
      canSoftDelete = isStaff;
      break;
  }

  const canHardDelete = isAdmin; // her zaman sadece admin
  const isReadOnly = !canCreate && !canEdit && !canSoftDelete && !canHardDelete;

  return {
    role,
    isStudent,
    isTeacher,
    isAdmin,
    isStaff,
    canCreate,
    canEdit,
    canSoftDelete,
    canHardDelete,
    isReadOnly,
  };
}
