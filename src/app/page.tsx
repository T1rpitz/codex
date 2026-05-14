"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  Layers3,
  Loader2,
  Pencil,
  Search,
  Sparkles,
  UploadCloud
} from "lucide-react";
import { extractPdfText, renderPdfPageImagesFromUrl } from "@/lib/pdf";
import { generateStageContent } from "@/lib/mockAi";
import {
  buildAnkiCsv,
  buildMarkdown,
  downloadTextFile
} from "@/lib/export";
import type { Courseware, LearningStage, StageOutput } from "@/types";

const stages: LearningStage[] = [
  {
    id: "translation",
    title: "第一阶段",
    subtitle: "直译与讲解",
    icon: BookOpen,
    accent: "bg-pine text-white",
    items: ["逐页翻译", "中文解释", "术语表", "每页总结", "整节课总结"]
  },
  {
    id: "deepening",
    title: "第二阶段",
    subtitle: "深入与巩固",
    icon: Brain,
    accent: "bg-berry text-white",
    items: ["核心概念", "概念关系图", "现实案例", "易错点", "主动回忆"]
  },
  {
    id: "exam",
    title: "第三阶段",
    subtitle: "考试与复习",
    icon: GraduationCap,
    accent: "bg-amber text-white",
    items: ["考试重点", "题库", "标准答案", "Flashcards", "Anki CSV"]
  },
  {
    id: "exploration",
    title: "第四阶段",
    subtitle: "深入探索",
    icon: Search,
    accent: "bg-ink text-white",
    items: ["研究方向", "论文题目", "项目想法", "现实连接", "学习路线"]
  }
];

export default function Home() {
  const [coursewares, setCoursewares] = useState<Courseware[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [activeStageId, setActiveStageId] = useState(stages[0].id);
  const [view, setView] = useState<"dashboard" | "stage">("dashboard");
  const [outputs, setOutputs] = useState<Record<string, StageOutput>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [generatingStage, setGeneratingStage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [previewImages, setPreviewImages] = useState<Record<string, string[]>>({});
  const [previewStatus, setPreviewStatus] = useState<Record<string, string>>({});

  const selectedCourseware = useMemo(
    () => coursewares.find((item) => item.id === selectedId) ?? null,
    [coursewares, selectedId]
  );

  const activeStage = stages.find((stage) => stage.id === activeStageId) ?? stages[0];
  const outputKey = selectedCourseware
    ? `${selectedCourseware.id}:${activeStage.id}`
    : "";
  const activeOutput = outputs[outputKey];

  async function handleUpload(file: File) {
    if (!file || file.type !== "application/pdf") {
      setError("请上传 PDF 文件。");
      return;
    }

    setError("");
    setIsUploading(true);
    setUploadProgress("正在打开 PDF...");
    try {
      const pages = await extractPdfText(file, (currentPage, totalPages) => {
        setUploadProgress(`正在提取第 ${currentPage} / ${totalPages} 页`);
      });
      const fileUrl = URL.createObjectURL(file);
      const nextCourseware: Courseware = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.pdf$/i, ""),
        fileName: file.name,
        fileUrl,
        uploadedAt: new Date().toISOString(),
        pageCount: pages.length,
        pages,
        fullText: pages.map((page) => page.text).join("\n\n")
      };
      setCoursewares((current) => [nextCourseware, ...current]);
      setSelectedId(nextCourseware.id);
      setActiveStageId("translation");
      setView("dashboard");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "PDF 解析失败。");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  }

  async function handleGenerate() {
    if (!selectedCourseware) return;

    setGeneratingStage(activeStage.id);
    setError("");
    try {
      const content = await generateStageContent(selectedCourseware, activeStage.id);
      setOutputs((current) => ({
        ...current,
        [outputKey]: {
          coursewareId: selectedCourseware.id,
          stageId: activeStage.id,
          content,
          updatedAt: new Date().toISOString()
        }
      }));
    } catch (stageError) {
      setError(stageError instanceof Error ? stageError.message : "内容生成失败。");
    } finally {
      setGeneratingStage(null);
    }
  }

  function updateActiveContent(content: string) {
    if (!selectedCourseware || !outputKey) return;
    setOutputs((current) => ({
      ...current,
      [outputKey]: {
        coursewareId: selectedCourseware.id,
        stageId: activeStage.id,
        content,
        updatedAt: new Date().toISOString()
      }
    }));
  }

  function exportMarkdown() {
    if (!selectedCourseware) return;
    const markdown = buildMarkdown(
      selectedCourseware,
      stages,
      Object.values(outputs).filter((output) => output.coursewareId === selectedCourseware.id)
    );
    downloadTextFile(`${selectedCourseware.name}-学习笔记.md`, markdown, "text/markdown");
  }

  function exportAnkiCsv() {
    if (!selectedCourseware) return;
    const csv = buildAnkiCsv(selectedCourseware);
    downloadTextFile(`${selectedCourseware.name}-anki.csv`, csv, "text/csv;charset=utf-8");
  }

  function openStage(stageId: LearningStage["id"]) {
    setActiveStageId(stageId);
    if (selectedCourseware) {
      setView("stage");
      if (stageId === "translation") void ensurePdfPreview(selectedCourseware);
    }
  }

  async function ensurePdfPreview(courseware: Courseware) {
    if (previewImages[courseware.id] || previewStatus[courseware.id]) return;

    setPreviewStatus((current) => ({
      ...current,
      [courseware.id]: "正在生成 PDF 原文预览..."
    }));

    try {
      const images = await renderPdfPageImagesFromUrl(courseware.fileUrl);
      setPreviewImages((current) => ({
        ...current,
        [courseware.id]: images
      }));
      setPreviewStatus((current) => ({
        ...current,
        [courseware.id]: images.length > 0 ? "" : "未生成预览，可用新标签打开 PDF。"
      }));
    } catch (previewError) {
      setPreviewStatus((current) => ({
        ...current,
        [courseware.id]:
          previewError instanceof Error ? previewError.message : "PDF 原文预览生成失败。"
      }));
    }
  }

  const stageEditor = selectedCourseware ? (
    <textarea
      className="h-full min-h-0 w-full rounded-lg border border-line bg-[#fffdf9] p-4 font-mono text-sm leading-7 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/15"
      placeholder="点击“生成内容”后，学习材料会出现在这里。你可以直接编辑，导出时会保留修改。"
      value={activeOutput?.content ?? ""}
      onChange={(event) => updateActiveContent(event.target.value)}
    />
  ) : null;

  if (view === "stage" && selectedCourseware) {
    return (
      <main className="flex h-screen flex-col overflow-hidden bg-[#fbfaf7] text-ink">
        <header className="shrink-0 border-b border-line bg-white/80 px-5 py-4 backdrop-blur lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-white shadow-sm transition hover:border-pine"
                onClick={() => setView("dashboard")}
                aria-label="返回总览"
              >
                <ArrowLeft size={19} />
              </button>
              <div className="min-w-0">
                <p className="text-sm text-ink/52">
                  {selectedCourseware.name} · {activeStage.title}
                </p>
                <h1 className="truncate text-2xl font-semibold">{activeStage.subtitle}</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {stages.map((stage) => (
                <button
                  key={stage.id}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    activeStageId === stage.id
                      ? "border-pine bg-pine text-white"
                      : "border-line bg-white hover:border-pine"
                  }`}
                  onClick={() => {
                    setActiveStageId(stage.id);
                    if (stage.id === "translation") void ensurePdfPreview(selectedCourseware);
                  }}
                >
                  {stage.subtitle}
                </button>
              ))}
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={generatingStage === activeStage.id}
                onClick={handleGenerate}
              >
                {generatingStage === activeStage.id ? (
                  <Loader2 className="animate-spin" size={17} />
                ) : (
                  <Sparkles size={17} />
                )}
                {activeOutput ? "重新生成" : "生成内容"}
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium shadow-sm transition hover:border-pine"
                onClick={exportMarkdown}
              >
                <Download size={17} />
                Markdown
              </button>
            </div>
          </div>
          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </header>

        {activeStage.id === "translation" ? (
          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,1fr)_minmax(26rem,42vw)] lg:p-6">
            <section className="flex min-h-0 flex-col rounded-lg border border-line bg-white p-4 shadow-soft">
              <div className="mb-3 shrink-0">
                <h2 className="font-semibold">直译与讲解</h2>
                <p className="mt-1 text-sm text-ink/52">左侧内容可以编辑，右侧对照 PDF 原文阅读。</p>
              </div>
              <div className="min-h-0 flex-1">{stageEditor}</div>
            </section>
            <section className="flex min-h-0 flex-col rounded-lg border border-line bg-white p-4 shadow-soft">
              <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">PDF 原文</h2>
                  <p className="mt-1 text-sm text-ink/52">{selectedCourseware.fileName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-paper px-2 py-1 text-xs text-ink/58">
                    {selectedCourseware.pageCount} 页
                  </span>
                  <a
                    className="rounded-md border border-line bg-white px-2 py-1 text-xs font-medium text-ink/68 transition hover:border-pine hover:text-pine"
                    href={selectedCourseware.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    新标签打开
                  </a>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-line bg-paper p-3">
                {previewImages[selectedCourseware.id]?.length > 0 ? (
                  <div className="space-y-4">
                    {previewImages[selectedCourseware.id].map((image, index) => (
                      <figure
                        key={image}
                        className="overflow-hidden rounded-lg border border-line bg-white shadow-sm"
                      >
                        <figcaption className="border-b border-line px-3 py-2 text-xs font-medium text-ink/58">
                          第 {index + 1} 页
                        </figcaption>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="h-auto w-full"
                          src={image}
                          alt={`${selectedCourseware.fileName} 第 ${index + 1} 页`}
                        />
                      </figure>
                    ))}
                    {selectedCourseware.pageCount > previewImages[selectedCourseware.id].length ? (
                      <p className="rounded-lg bg-white px-3 py-2 text-sm text-ink/58">
                        已显示前 {previewImages[selectedCourseware.id].length} 页。完整文件可点“新标签打开”查看。
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid h-full place-items-center p-6 text-center">
                    <div>
                      <p className="font-medium">
                        {previewStatus[selectedCourseware.id] || "点击下方按钮生成 PDF 原文预览。"}
                      </p>
                      <button
                        className="mt-3 inline-flex rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-pine hover:text-pine"
                        onClick={() => void ensurePdfPreview(selectedCourseware)}
                      >
                        生成右侧预览
                      </button>
                      <a
                        className="ml-2 mt-3 inline-flex rounded-lg bg-pine px-3 py-2 text-sm font-semibold text-white"
                        href={selectedCourseware.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        打开 PDF
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-hidden p-4 lg:p-6">
            <section className="mx-auto flex h-full max-w-6xl flex-col rounded-lg border border-line bg-white p-4 shadow-soft">
              <div className="mb-3 shrink-0">
                <h2 className="font-semibold">{activeStage.subtitle}</h2>
                <p className="mt-1 text-sm text-ink/52">这是该阶段的专门页面，内容可以随时编辑。</p>
              </div>
              <div className="min-h-0 flex-1">{stageEditor}</div>
            </section>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="flex min-h-screen text-ink">
      <aside className="hidden w-80 shrink-0 border-r border-line bg-white/78 p-5 backdrop-blur lg:flex lg:flex-col">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-pine text-white">
            <Layers3 size={22} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">课件学习系统</h1>
            <p className="text-sm text-ink/58">PDF 到复习材料工作台</p>
          </div>
        </div>

        <label className="mb-5 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-pine/45 bg-pine/5 p-4 text-center transition hover:bg-pine/10">
          {isUploading ? (
            <Loader2 className="mb-3 animate-spin text-pine" size={28} />
          ) : (
            <UploadCloud className="mb-3 text-pine" size={30} />
          )}
          <span className="font-medium">{isUploading ? "正在提取文本" : "上传 PDF 课件"}</span>
          <span className="mt-1 text-xs text-ink/56">
            {isUploading ? uploadProgress : "文本会在本地浏览器中解析"}
          </span>
          <input
            className="hidden"
            type="file"
            accept="application/pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleUpload(file);
              event.currentTarget.value = "";
            }}
          />
        </label>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink/70">课件列表</h2>
          <span className="text-xs text-ink/45">{coursewares.length} 个</span>
        </div>

        <div className="space-y-2 overflow-auto pr-1">
          {coursewares.length === 0 ? (
            <div className="rounded-lg border border-line bg-white p-4 text-sm text-ink/58">
              上传一份课件后，这里会显示学习记录。
            </div>
          ) : (
            coursewares.map((courseware) => (
              <button
                key={courseware.id}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  selectedId === courseware.id
                    ? "border-pine bg-pine/8 shadow-soft"
                    : "border-line bg-white hover:border-pine/45"
                }`}
                onClick={() => setSelectedId(courseware.id)}
              >
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 shrink-0 text-pine" size={18} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{courseware.name}</p>
                    <p className="mt-1 text-xs text-ink/48">
                      {courseware.pageCount} 页 · {new Date(courseware.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-line bg-white/70 px-5 py-4 backdrop-blur lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-pine">MVP 学习工作台</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                {selectedCourseware?.name ?? "上传 PDF 后开始学习"}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium shadow-sm transition hover:border-pine">
                <UploadCloud size={17} />
                上传
                <input
                  className="hidden"
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleUpload(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium shadow-sm transition hover:border-pine disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!selectedCourseware}
                onClick={exportMarkdown}
              >
                <Download size={17} />
                Markdown
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium shadow-sm transition hover:border-pine disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!selectedCourseware}
                onClick={exportAnkiCsv}
              >
                <Download size={17} />
                Anki CSV
              </button>
            </div>
          </div>
          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </header>

        <div className="grid flex-1 gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:p-8">
          <div className="min-w-0 space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {stages.map((stage) => {
                const Icon = stage.icon;
                const hasContent = selectedCourseware
                  ? Boolean(outputs[`${selectedCourseware.id}:${stage.id}`])
                  : false;

                return (
                  <button
                    key={stage.id}
                    className={`rounded-lg border bg-white p-4 text-left shadow-sm transition ${
                      activeStageId === stage.id
                        ? "border-pine ring-2 ring-pine/18"
                        : "border-line hover:border-pine/45"
                    }`}
                    onClick={() => openStage(stage.id)}
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className={`grid h-10 w-10 place-items-center rounded-lg ${stage.accent}`}>
                        <Icon size={20} />
                      </div>
                      {hasContent ? <CheckCircle2 className="text-pine" size={18} /> : null}
                    </div>
                    <p className="text-sm text-ink/52">{stage.title}</p>
                  <h3 className="mt-1 font-semibold">{stage.subtitle}</h3>
                  <p className="mt-2 text-xs text-ink/45">
                    {selectedCourseware ? "打开专门学习页" : "上传后可打开"}
                  </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {stage.items.slice(0, 3).map((item) => (
                        <span
                          key={item}
                          className="rounded-md bg-paper px-2 py-1 text-xs text-ink/58"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-lg border border-line bg-white shadow-soft">
              <div className="flex flex-col gap-3 border-b border-line px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-ink/52">{activeStage.title}</p>
                  <h3 className="text-xl font-semibold">{activeStage.subtitle}</h3>
                </div>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-pine px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!selectedCourseware || generatingStage === activeStage.id}
                  onClick={handleGenerate}
                >
                  {generatingStage === activeStage.id ? (
                    <Loader2 className="animate-spin" size={17} />
                  ) : (
                    <Sparkles size={17} />
                  )}
                  {activeOutput ? "重新生成" : "生成内容"}
                </button>
              </div>

              <div className="p-4">
                {selectedCourseware ? (
                  <textarea
                    className="min-h-[34rem] w-full rounded-lg border border-line bg-[#fffdf9] p-4 font-mono text-sm leading-7 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/15"
                    placeholder="点击“生成内容”后，学习材料会出现在这里。你可以直接编辑，导出时会保留修改。"
                    value={activeOutput?.content ?? ""}
                    onChange={(event) => updateActiveContent(event.target.value)}
                  />
                ) : (
                  <div className="grid min-h-[34rem] place-items-center rounded-lg border border-dashed border-line bg-paper/55 p-8 text-center">
                    <div>
                      <UploadCloud className="mx-auto mb-4 text-pine" size={38} />
                      <h3 className="text-lg font-semibold">先上传一份 PDF 课件</h3>
                      <p className="mt-2 max-w-md text-sm leading-6 text-ink/58">
                        系统会提取课件文本，然后按四个学习阶段生成可编辑笔记、题库、卡片和探索路线。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Pencil className="text-pine" size={18} />
                <h3 className="font-semibold">课件概览</h3>
              </div>
              {selectedCourseware ? (
                <div className="space-y-3 text-sm text-ink/68">
                  <p>
                    <span className="font-medium text-ink">文件：</span>
                    {selectedCourseware.fileName}
                  </p>
                  <p>
                    <span className="font-medium text-ink">页数：</span>
                    {selectedCourseware.pageCount}
                  </p>
                  <p>
                    <span className="font-medium text-ink">文本量：</span>
                    {selectedCourseware.fullText.length.toLocaleString()} 字符
                  </p>
                  <div className="rounded-lg bg-paper p-3">
                    <p className="line-clamp-[8] whitespace-pre-wrap text-xs leading-5">
                      {selectedCourseware.fullText.slice(0, 700) || "未从 PDF 中提取到可读文本。"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-6 text-ink/58">上传后会显示页数、文本量和文本预览。</p>
              )}
            </div>

            <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="text-amber" size={18} />
                <h3 className="font-semibold">阶段产出</h3>
              </div>
              <div className="space-y-2">
                {stages.map((stage) => {
                  const done = selectedCourseware
                    ? Boolean(outputs[`${selectedCourseware.id}:${stage.id}`])
                    : false;
                  return (
                    <div
                      key={stage.id}
                      className="flex items-center justify-between rounded-lg bg-paper/70 px-3 py-2 text-sm"
                    >
                      <span>{stage.subtitle}</span>
                      <span className={done ? "text-pine" : "text-ink/38"}>
                        {done ? "已生成" : "待生成"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
