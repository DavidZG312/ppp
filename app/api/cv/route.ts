import { readFile } from "node:fs/promises";
import { connection } from "next/server";

import { generateBaseCv } from "@/lib/cv/render";

export async function GET() {
  await connection();

  const { pdfPath } = await generateBaseCv();
  const file = await readFile(pdfPath);

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="CV-David-Zabala-Granados.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
