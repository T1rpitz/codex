import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PdfPageText } from "@/types";

type PdfTextItem = {
  str?: string;
  transform?: number[];
  hasEOL?: boolean;
};

export async function extractPdfText(file: File): Promise<PdfPageText[]> {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = await file.arrayBuffer();
  const document = await pdfjs.getDocument({ data }).promise;
  const pages: PdfPageText[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
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
