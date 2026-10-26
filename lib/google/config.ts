import { readFile } from "node:fs/promises";

import { CLIENT_SECRET_PATH } from "../paths";

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface ClientSecretFile {
  installed?: { client_id?: string; client_secret?: string };
  web?: { client_id?: string; client_secret?: string };
}

const DEFAULT_REDIRECT_URI = "http://localhost:3000/api/auth/google/callback";

export function defaultRedirectUri(): string {
  return process.env.GOOGLE_REDIRECT_URI?.trim() || DEFAULT_REDIRECT_URI;
}

export async function loadGoogleCredentials(): Promise<GoogleCredentials | null> {
  const redirectUri = defaultRedirectUri();
  const envId = process.env.GOOGLE_CLIENT_ID?.trim();
  const envSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (envId && envSecret) {
    return { clientId: envId, clientSecret: envSecret, redirectUri };
  }

  try {
    const raw = await readFile(CLIENT_SECRET_PATH, "utf8");
    const parsed = JSON.parse(raw) as ClientSecretFile;
    const block = parsed.installed ?? parsed.web;
    if (!block?.client_id || !block.client_secret) return null;
    return {
      clientId: block.client_id,
      clientSecret: block.client_secret,
      redirectUri,
    };
  } catch {
    return null;
  }
}
