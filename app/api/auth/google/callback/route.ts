import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { loadGoogleCredentials } from "@/lib/google/config";
import { exchangeCode, saveAuthorization } from "@/lib/google/oauth";

export async function GET(request: Request) {
  await connection();

  const url = new URL(request.url);
  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    redirect(`/postulaciones?auth=error&message=${encodeURIComponent(oauthError)}`);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("gmail_oauth_state")?.value;
  cookieStore.delete("gmail_oauth_state");

  if (!code || !state || !expectedState || state !== expectedState) {
    redirect(
      `/postulaciones?auth=error&message=${encodeURIComponent(
        "El estado OAuth no coincide. Intenta conectar Gmail de nuevo.",
      )}`,
    );
  }

  const credentials = await loadGoogleCredentials();
  if (!credentials) {
    redirect("/postulaciones?auth=missing");
  }

  let message: string | null = null;
  try {
    const tokens = await exchangeCode(code, credentials);
    await saveAuthorization(tokens);
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  if (message) {
    redirect(`/postulaciones?auth=error&message=${encodeURIComponent(message)}`);
  }

  redirect("/postulaciones?auth=ok");
}
