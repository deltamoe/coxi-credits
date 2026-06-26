import {
  AddedCourse,
  ModuleStructure,
  NeuroModule,
} from "@/app/types";
import { getNumericGrade, weightedAverage } from "@/lib/gradeSelection";

function weightedGradeFromParts(
  parts: { weight: number; grade: number }[],
): number | null {
  if (parts.length === 0) return null;
  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
  if (totalWeight <= 0) return null;
  const weightedSum = parts.reduce(
    (sum, part) => sum + part.weight * part.grade,
    0,
  );
  return Number((weightedSum / totalWeight).toFixed(2));
}

function computeSubCoursesGrade(
  structure: Extract<ModuleStructure, { type: "subCourses" }>,
  grades: Record<string, number | string>,
): number | null {
  const parts: { weight: number; grade: number }[] = [];

  for (const subCourse of structure.subCourses) {
    if (!subCourse.graded) continue;
    const grade = getNumericGrade(grades, subCourse.id);
    if (grade === null) continue;
    parts.push({ weight: subCourse.weight ?? 100, grade });
  }

  return weightedGradeFromParts(parts);
}

function computeGuidedSlotsGrade(
  structure: Extract<ModuleStructure, { type: "guidedSlots" }>,
  grades: Record<string, number | string>,
  slotSelections: Record<string, string>,
): number | null {
  const parts: { weight: number; grade: number }[] = [];

  for (const slot of structure.slots) {
    if (!slot.graded) continue;
    if (!slotSelections[slot.id]) continue;
    const grade = getNumericGrade(grades, slot.id);
    if (grade === null) continue;
    parts.push({ weight: slot.credits, grade });
  }

  return weightedGradeFromParts(parts);
}

function computeUserAddedGrade(
  structure: Extract<ModuleStructure, { type: "userAdded" }>,
  moduleId: string,
  grades: Record<string, number | string>,
  userCourses: Record<string, AddedCourse[]>,
): number | null {
  if (!structure.graded) return null;

  const courses = userCourses[moduleId] ?? [];
  let weightedSum = 0;
  let totalCredits = 0;

  for (const course of courses) {
    if (!course.graded) continue;
    const grade = getNumericGrade(grades, course.id);
    if (grade === null) continue;
    weightedSum += course.credits * grade;
    totalCredits += course.credits;
  }

  return weightedAverage(weightedSum, totalCredits);
}

export function computeModuleGrade(
  module: NeuroModule,
  grades: Record<string, number | string>,
  slotSelections: Record<string, string>,
  userCourses: Record<string, AddedCourse[]>,
  thesisGrade: number | null,
): number | null {
  if (!module.structure) {
    return getNumericGrade(grades, module.id);
  }

  switch (module.structure.type) {
    case "subCourses":
      return computeSubCoursesGrade(module.structure, grades);
    case "guidedSlots":
      return computeGuidedSlotsGrade(
        module.structure,
        grades,
        slotSelections,
      );
    case "userAdded":
      return computeUserAddedGrade(
        module.structure,
        module.id,
        grades,
        userCourses,
      );
    case "thesis":
      return thesisGrade;
    default: {
      const _exhaustive: never = module.structure;
      return _exhaustive;
    }
  }
}

function isSubCourseComplete(
  subCourseId: string,
  graded: boolean,
  grades: Record<string, number | string>,
  completedModules: string[],
): boolean {
  if (graded) {
    return getNumericGrade(grades, subCourseId) !== null;
  }
  return completedModules.includes(subCourseId);
}

function computeSubCoursesCompletedCredits(
  structure: Extract<ModuleStructure, { type: "subCourses" }>,
  grades: Record<string, number | string>,
  completedModules: string[],
): number {
  return structure.subCourses.reduce((sum, subCourse) => {
    const complete = isSubCourseComplete(
      subCourse.id,
      subCourse.graded,
      grades,
      completedModules,
    );
    return complete ? sum + subCourse.credits : sum;
  }, 0);
}

function computeGuidedSlotsCompletedCredits(
  structure: Extract<ModuleStructure, { type: "guidedSlots" }>,
  grades: Record<string, number | string>,
  completedModules: string[],
  slotSelections: Record<string, string>,
): number {
  return structure.slots.reduce((sum, slot) => {
    if (!slotSelections[slot.id]) return sum;
    const complete = slot.graded
      ? getNumericGrade(grades, slot.id) !== null
      : completedModules.includes(slot.id);
    return complete ? sum + slot.credits : sum;
  }, 0);
}

function computeUserAddedCompletedCredits(
  structure: Extract<ModuleStructure, { type: "userAdded" }>,
  moduleId: string,
  grades: Record<string, number | string>,
  completedModules: string[],
  userCourses: Record<string, AddedCourse[]>,
): number {
  const courses = userCourses[moduleId] ?? [];
  let used = 0;

  for (const course of courses) {
    if (used >= structure.targetCredits) break;
    const complete = course.graded
      ? getNumericGrade(grades, course.id) !== null
      : completedModules.includes(course.id);
    if (!complete) continue;
    const remaining = structure.targetCredits - used;
    used += Math.min(course.credits, remaining);
  }

  return used;
}

export function computeModuleCompletedCredits(
  module: NeuroModule,
  grades: Record<string, number | string>,
  completedModules: string[],
  slotSelections: Record<string, string>,
  userCourses: Record<string, AddedCourse[]>,
  thesisGrade: number | null,
): number {
  if (!module.structure) {
    if (module.kind === "thesis") {
      return thesisGrade !== null ? module.credits : 0;
    }
    if (module.kind === "graded") {
      return getNumericGrade(grades, module.id) !== null ? module.credits : 0;
    }
    return completedModules.includes(module.id) ? module.credits : 0;
  }

  switch (module.structure.type) {
    case "subCourses":
      return computeSubCoursesCompletedCredits(
        module.structure,
        grades,
        completedModules,
      );
    case "guidedSlots":
      return computeGuidedSlotsCompletedCredits(
        module.structure,
        grades,
        completedModules,
        slotSelections,
      );
    case "userAdded":
      return computeUserAddedCompletedCredits(
        module.structure,
        module.id,
        grades,
        completedModules,
        userCourses,
      );
    case "thesis":
      return thesisGrade !== null ? module.credits : 0;
    default: {
      const _exhaustive: never = module.structure;
      return _exhaustive;
    }
  }
}

export function isStructuredModuleComplete(
  module: NeuroModule,
  grades: Record<string, number | string>,
  completedModules: string[],
  slotSelections: Record<string, string>,
  userCourses: Record<string, AddedCourse[]>,
  thesisGrade: number | null,
): boolean {
  return (
    computeModuleCompletedCredits(
      module,
      grades,
      completedModules,
      slotSelections,
      userCourses,
      thesisGrade,
    ) >= module.credits
  );
}
