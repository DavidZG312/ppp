"use server";

import { revalidatePath } from "next/cache";

import { runSync } from "@/lib/jobs/sync";

export async function syncNow() {
  const summary = await runSync();
  revalidatePath("/");
  revalidatePath("/fuentes");
  return summary;
}
