import path from "node:path";

import { generateBaseCv } from "../lib/cv/render";

async function main(): Promise<void> {
  const result = await generateBaseCv();

  console.log("CV generado:");
  console.log(`  PDF:  ${path.relative(process.cwd(), result.pdfPath)}`);
  console.log(`  HTML: ${path.relative(process.cwd(), result.htmlPath)}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
