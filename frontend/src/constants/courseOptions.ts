export const BRANCH_OPTIONS = ["A", "B", "C", "D"] as const;
export type BranchLabel = (typeof BRANCH_OPTIONS)[number];

const SEMESTER_TYPES = ["Güz", "Bahar", "Yaz"] as const;

function generateSemesters(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const academicStartYear = now.getMonth() < 6 ? year - 1 : year;

  const years = [academicStartYear - 1, academicStartYear, academicStartYear + 1];
  return years.flatMap((y) =>
    SEMESTER_TYPES.map((t) => `${y}-${y + 1} ${t}`)
  );
}

export const SEMESTER_OPTIONS = generateSemesters();
