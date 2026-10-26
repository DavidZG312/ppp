import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

import { GENERATED_DIR } from "../paths";
import { loadProfile, type Profile } from "../profile";
import { renderCvHtml } from "./template";

export const BASE_CV_NAME = "CV-David-Zabala-Granados";

export interface GeneratedCv {
  htmlPath: string;
  pdfPath: string;
  profile: Profile;
}

export async function renderCvPdf(
  profile: Profile,
  outputName = BASE_CV_NAME,
): Promise<GeneratedCv> {
  await mkdir(GENERATED_DIR, { recursive: true });

  const html = renderCvHtml(profile);
  const htmlPath = path.join(GENERATED_DIR, `${outputName}.html`);
  const pdfPath = path.join(GENERATED_DIR, `${outputName}.pdf`);

  await writeFile(htmlPath, html, "utf8");

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "14mm", right: "14mm" },
    });
  } finally {
    await browser.close();
  }

  return { htmlPath, pdfPath, profile };
}

export async function generateBaseCv(): Promise<GeneratedCv> {
  const profile = await loadProfile();
  return renderCvPdf(profile);
}
