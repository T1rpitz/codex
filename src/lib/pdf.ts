import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PdfPageText } from "@/types";

type PdfTextItem = {
  str?: string;
  transform?: number[];
  hasEOL?: boolean;
};

export async function extractPdfText(
  file: File,
  onProgress?: (currentPage: number, totalPages: number) => void
): Promise<PdfPageText[]> {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false
  });
  const document = await withTimeout(
    loadingTask.promise,
    25000,
    "PDF 打开时间过长。这个文件可能很大、被加密，或是扫描版图片 PDF。"
  );
  const pages: PdfPageText[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    onProgress?.(pageNumber, document.numPages);
    const page = await document.getPage(pageNumber);
    const content = await withTimeout(
      page.getTextContent(),
      15000,
      `第 ${pageNumber} 页文本提取时间过长。这个页面可能是图片扫描页。`
    );
    const text = content.items
      .map((item) => item as PdfTextItem)
      .filter((item) => item.str?.trim())
      .sort((a, b) => {
        const ay = a.transform?.[5] ?? 0;
        const by = b.transform?.[5] ?? 0;
        const ax = a.transform?.[4] ?? 0;
        const bx = b.transform?.[4] ?? 0;

        if (Math.abs(by - ay) > 4) return by - ay;
        return ax - bx;
      })
      .reduce(
        (result, item) => {
          const y = item.transform?.[5] ?? result.lastY;
          const shouldBreakLine =
            result.parts.length > 0 && Math.abs(y - result.lastY) > 4;

          if (shouldBreakLine) {
            result.parts.push("\n");
          } else if (result.parts.length > 0 && result.parts.at(-1) !== "\n") {
            result.parts.push(" ");
          }

          result.parts.push(item.str?.trim() ?? "");
          if (item.hasEOL) result.parts.push("\n");
          result.lastY = y;

          return result;
        },
        { parts: [] as string[], lastY: Number.POSITIVE_INFINITY }
      )
      .parts.join("")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    pages.push({
      pageNumber,
      text
    });
  }

  return pages;
}

export async function renderPdfPageImages(
  file: File,
  maxPages = 30
): Promise<string[]> {
  const data = await file.arrayBuffer();
  return renderPdfPageImagesFromArrayBuffer(data, maxPages);
}

export async function renderPdfPageImagesFromUrl(
  fileUrl: string,
  maxPages = 30
): Promise<string[]> {
  const response = await fetch(fileUrl);
  const data = await response.arrayBuffer();
  return renderPdfPageImagesFromArrayBuffer(data, maxPages);
}

async function renderPdfPageImagesFromArrayBuffer(
  data: ArrayBuffer,
  maxPages: number
): Promise<string[]> {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const document = await withTimeout(
    pdfjs.getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false
    }).promise,
    25000,
    "PDF 预览生成时间过长。"
  );
  const pageImages: string[] = [];
  const totalPages = Math.min(document.numPages, maxPages);

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.35 });
    const canvas = window.document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) continue;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await withTimeout(
      page.render({
        canvasContext: context,
        viewport
      }).promise,
      15000,
      `第 ${pageNumber} 页预览生成时间过长。`
    );

    pageImages.push(canvas.toDataURL("image/png"));
  }

  return pageImages;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), ms);
      })
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
