import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DocumentRow } from "@/lib/types";

type GeneratePackInput = {
  packType: string;
  profile: Record<string, string>;
  documents: Pick<DocumentRow, "filename" | "type">[];
};

function drawSectionTitle(
  page: import("pdf-lib").PDFPage,
  text: string,
  y: number,
  font: import("pdf-lib").PDFFont
) {
  page.drawText(text, {
    x: 50,
    y,
    size: 14,
    font,
    color: rgb(0.03, 0.39, 0.47)
  });
}

function drawLabelValue(
  page: import("pdf-lib").PDFPage,
  label: string,
  value: string,
  y: number,
  boldFont: import("pdf-lib").PDFFont,
  regularFont: import("pdf-lib").PDFFont
) {
  page.drawText(`${label}:`, {
    x: 60,
    y,
    size: 11,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1)
  });

  page.drawText(value || "-", {
    x: 170,
    y,
    size: 11,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2)
  });
}

export async function generateApplicationPackPdf({
  packType,
  profile,
  documents
}: GeneratePackInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 790;

  page.drawText("Application Pack", {
    x: 50,
    y,
    size: 24,
    font: boldFont,
    color: rgb(0.03, 0.39, 0.47)
  });

  y -= 24;
  page.drawText(`Template: ${packType}`, {
    x: 50,
    y,
    size: 11,
    font: regularFont,
    color: rgb(0.35, 0.35, 0.35)
  });

  y -= 40;
  drawSectionTitle(page, "Personal info", y, boldFont);

  y -= 24;
  drawLabelValue(page, "Name", profile.name ?? "", y, boldFont, regularFont);
  y -= 18;
  drawLabelValue(page, "Email", profile.email ?? "", y, boldFont, regularFont);
  y -= 18;
  drawLabelValue(page, "Address", profile.address ?? "", y, boldFont, regularFont);

  y -= 36;
  drawSectionTitle(page, "Academic info", y, boldFont);

  y -= 24;
  drawLabelValue(page, "School", profile.school ?? "", y, boldFont, regularFont);
  y -= 18;
  drawLabelValue(page, "GPA", profile.gpa ?? "", y, boldFont, regularFont);
  y -= 18;
  drawLabelValue(page, "TOEFL", profile.toefl_total ?? "", y, boldFont, regularFont);

  y -= 36;
  drawSectionTitle(page, "Attachments", y, boldFont);

  y -= 24;
  if (documents.length === 0) {
    page.drawText("No documents uploaded yet.", {
      x: 60,
      y,
      size: 11,
      font: regularFont,
      color: rgb(0.35, 0.35, 0.35)
    });
  } else {
    for (const document of documents) {
      if (y < 70) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = 790;
      }

      page.drawText(`- ${document.filename} (${document.type})`, {
        x: 60,
        y,
        size: 11,
        font: regularFont,
        color: rgb(0.15, 0.15, 0.15)
      });
      y -= 16;
    }
  }

  return pdfDoc.save();
}
