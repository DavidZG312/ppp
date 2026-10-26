import { revalidatePath } from "next/cache";

import { runSync } from "@/lib/jobs/sync";

export async function POST() {
  const summary = await runSync();
  revalidatePath("/");
  revalidatePath("/fuentes");

  return Response.json(summary);
}
