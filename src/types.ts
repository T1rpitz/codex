import type { LucideIcon } from "lucide-react";

export type StageId = "translation" | "deepening" | "exam" | "exploration";

export type PdfPageText = {
  pageNumber: number;
  text: string;
};

export type Courseware = {
  id: string;
  name: string;
  fileName: string;
  uploadedAt: string;
  pageCount: number;
  pages: PdfPageText[];
  fullText: string;
};

export type LearningStage = {
  id: StageId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent: string;
  items: string[];
};

export type StageOutput = {
  coursewareId: string;
  stageId: StageId;
  content: string;
  updatedAt: string;
};
