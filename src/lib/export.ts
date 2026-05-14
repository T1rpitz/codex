import type { Courseware, LearningStage, StageOutput } from "@/types";

export function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function buildMarkdown(
  courseware: Courseware,
  stages: LearningStage[],
  outputs: StageOutput[]
) {
  const byStage = new Map(outputs.map((output) => [output.stageId, output]));
  const sections = stages
    .map((stage) => {
      const output = byStage.get(stage.id);
      return `## ${stage.title}：${stage.subtitle}

${output?.content ?? "_尚未生成_"}
`;
    })
    .join("\n");

  return `# ${courseware.name} 学习笔记

- 文件：${courseware.fileName}
- 页数：${courseware.pageCount}
- 导出时间：${new Date().toLocaleString()}

${sections}`;
}

export function buildAnkiCsv(courseware: Courseware) {
  const sourceTerms = courseware.fullText
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4);
  const terms = Array.from(new Set(sourceTerms)).slice(0, 30);
  const cards = terms.length > 0 ? terms : [courseware.name, "课程总结", "核心概念"];
  const rows = cards.map((term) => [
    `什么是 ${term}？`,
    `${term} 是「${courseware.name}」中的学习要点。请结合定义、适用条件和例子复述。`,
    courseware.name
  ]);

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function escapeCsvCell(value: string) {
  const normalized = value.replace(/\r?\n/g, "<br>");
  return `"${normalized.replace(/"/g, '""')}"`;
}
