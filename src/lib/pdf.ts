import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PdfPageText } from "@/types";

type PdfTextItem = {
  str?: string;
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
      .map((item) => (item as PdfTextItem).str ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    pages.push({
      pageNumber,
      text
    });
  }

  return pages;
}
