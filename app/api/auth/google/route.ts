import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { loadGoogleCredentials } from "@/lib/google/config";
import { buildAuthUrl } from "@/lib/google/oauth";

export async function GET() {
  await connection();

  const credentials = await loadGoogleCredentials();
  if (!credentials) {
    redirect("/postulaciones?auth=missing");
  }

  const state = randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("gmail_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 600,
  });

  redirect(buildAuthUrl(credentials, state));
}
