/**
 * Öğrenci numarası parser — backend `parse_student_number` ile birebir aynı mantık.
 *
 * Format: YYY-BBB-CCC (9 hane)
 *   YYY: Giriş yılının son 3 hanesi (245 → 2024 başlangıçlı akademik yıl)
 *   BBB: 3 haneli bölüm kodu (departments.code ile eşleşir)
 *   CCC: 3 haneli sıra numarası
 *
 * Bölüm adı lookup'ı bu modülde değil — caller, departments listesinden eşleştirir.
 */

export interface ParsedStudentNumber {
  yearPrefix: string;       // "245"
  entryYear: number;        // 2024
  academicYear: string;     // "2024-2025"
  departmentCode: string;   // "235"
  sequence: string;         // "024"
  sequenceInt: number;      // 24
}

const STUDENT_NO_RE = /^\d{9}$/;

export function parseStudentNumber(studentNo: string | null | undefined): ParsedStudentNumber | null {
  if (!studentNo) return null;
  const s = studentNo.trim();
  if (!STUDENT_NO_RE.test(s)) return null;

  const yearPrefix = s.slice(0, 3);
  const departmentCode = s.slice(3, 6);
  const sequence = s.slice(6, 9);

  const yearTwoDigit = parseInt(yearPrefix.slice(0, 2), 10);
  if (Number.isNaN(yearTwoDigit)) return null;
  const entryYear = 2000 + yearTwoDigit;
  const academicYear = `${entryYear}-${entryYear + 1}`;

  return {
    yearPrefix,
    entryYear,
    academicYear,
    departmentCode,
    sequence,
    sequenceInt: parseInt(sequence, 10),
  };
}
