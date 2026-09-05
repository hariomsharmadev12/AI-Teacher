/**
 * Extracts plain text from an uploaded lesson-source file so it can be
 * passed into the lesson planner as grounding content.
 *
 * Supported today: PDF, DOCX.
 * Not yet supported: legacy .doc, PPT/PPTX (no solid turnkey Node parser —
 * treat as a fast-follow rather than blocking on it).
 */

// pdf-parse v2+ rewrote the package around a class-based API (PDFParse),
// replacing the old v1 `const pdf = require('pdf-parse'); pdf(buffer)`
// default-export function. This targets the current API.
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export class UnsupportedFileTypeError extends Error {}

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === PDF_MIME || name.endsWith(".pdf")) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      // Frees the underlying pdf.js document; must be called even on error.
      await parser.destroy();
    }
  }

  if (file.type === DOCX_MIME || name.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  if (name.endsWith(".doc")) {
    throw new UnsupportedFileTypeError(
      "Legacy .doc files aren't supported yet — please re-save as .docx or .pdf."
    );
  }

  if (name.endsWith(".ppt") || name.endsWith(".pptx")) {
    throw new UnsupportedFileTypeError(
      "PowerPoint files aren't supported yet — export as PDF, or type the topic instead for now."
    );
  }

  throw new UnsupportedFileTypeError(
    `Unsupported file type for "${file.name}". Upload a PDF or DOCX.`
  );
}