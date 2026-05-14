/**
 * Sınıf etiketi sabitleri — FE-16
 *
 * Tüm bileşenlerde "1. Sınıf", "2. Sınıf" vb. etiketler buradan kullanılmalı.
 * Yeni etiket eklenecekse sadece bu dosyayı güncelle.
 */

export const GRADE_OPTIONS = [
  "1. Sınıf",
  "2. Sınıf",
  "3. Sınıf",
  "4. Sınıf",
] as const;

export type GradeLabel = (typeof GRADE_OPTIONS)[number];
