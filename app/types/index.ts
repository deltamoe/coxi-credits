export type ProgramId = "nb" | "cn" | "cm";

export type ModuleGroup =
  | "foundations"
  | "advanced"
  | "core"
  | "electives"
  | "research"
  | "thesis";

export type ModuleKind = "graded" | "completion" | "thesis";

export interface NeuroSubCourse {
  id: string;
  name: string;
  credits: number;
  graded: boolean;
  weight?: number;
}

export interface GuidedSlotOption {
  id: string;
  name: string;
}

export interface GuidedSlot {
  id: string;
  label: string;
  credits: number;
  graded: boolean;
  options: GuidedSlotOption[];
}

export interface AddedCourse {
  id: string;
  name: string;
  credits: number;
  graded: boolean;
}

export type ModuleStructure =
  | { type: "subCourses"; subCourses: NeuroSubCourse[] }
  | { type: "guidedSlots"; slots: GuidedSlot[] }
  | { type: "userAdded"; targetCredits: number; graded: boolean }
  | { type: "thesis" };

export interface NeuroModule {
  id: string;
  code: string;
  name: string;
  credits: number;
  kind: ModuleKind;
  countsTowardFinal: boolean;
  group: ModuleGroup;
  hint?: string;
  structure?: ModuleStructure;
}

export interface ProgramExportPayload {
  grades: Record<string, number | string>;
  completedModules: string[];
  thesisGrade: number | null;
  userCourses: Record<string, AddedCourse[]>;
  slotSelections: Record<string, string>;
}

export interface CombinedExportPayload {
  version: 4;
  activeProgram?: ProgramId;
  programs: Record<ProgramId, ProgramExportPayload>;
}

/** @deprecated Use CombinedExportPayload v4 */
export interface CombinedExportPayloadV3 {
  version: 3;
  activeProgram?: ProgramId;
  programs: Record<
    ProgramId,
    Omit<ProgramExportPayload, "userCourses" | "slotSelections">
  >;
}
