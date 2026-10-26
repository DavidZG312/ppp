import { readFile } from "node:fs/promises";

import { loadGoogleCredentials } from "./config";
import { GmailAuthError, getAccessToken } from "./oauth";
import { buildRawEmail } from "./mime";
import { readTokens } from "./tokens";

const SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

export interface GmailStatus {
  configured: boolean;
  connected: boolean;
  error: string | null;
}

export interface SendGmailInput {
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  text: string;
  attachmentPath?: string;
  attachmentName?: string;
}

export async function getGmailStatus(): Promise<GmailStatus> {
  const credentials = await loadGoogleCredentials();
  if (!credentials) {
    return { configured: false, connected: false, error: null };
  }

  const tokens = await readTokens();
  return {
    configured: true,
    connected: Boolean(tokens?.refresh_token || tokens?.access_token),
    error: null,
  };
}

function apiError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string; status?: string };
    };
    const message = parsed.error?.message ?? parsed.error?.status;
    if (message) return `Gmail respondió ${status}: ${message}`;
  } catch {
    // La respuesta no era JSON; se usa el texto truncado.
  }
  return `Gmail respondió ${status}: ${body.slice(0, 300)}`;
}

async function postMessage(
  accessToken: string,
  raw: string,
): Promise<{ ok: true; id: string } | { ok: false; status: number; error: string }> {
  const response = await fetch(SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
    cache: "no-store",
  });

  const body = await response.text();
  if (!response.ok) {
    return { ok: false, status: response.status, error: apiError(response.status, body) };
  }

  let id = "";
  try {
    id = (JSON.parse(body) as { id?: string }).id ?? "";
  } catch {
    id = "";
  }
  return { ok: true, id };
}

export async function sendGmailMessage(input: SendGmailInput): Promise<string> {
  const credentials = await loadGoogleCredentials();
  if (!credentials) {
    throw new GmailAuthError(
      "Falta configurar Gmail. Descarga el client_secret.json de Google Cloud y guárdalo en credentials/.",
    );
  }

  let attachment;
  if (input.attachmentPath) {
    try {
      attachment = {
        filename: input.attachmentName ?? "CV.pdf",
        content: await readFile(input.attachmentPath),
        contentType: "application/pdf",
      };
    } catch {
      throw new Error(
        "No se encontró el PDF del CV. Ejecuta `npm run cv` antes de enviar.",
      );
    }
  }

  const raw = buildRawEmail({
    from: input.from,
    fromName: input.fromName,
    to: input.to,
    subject: input.subject,
    text: input.text,
    attachment,
  });

  let token = await getAccessToken(credentials);
  let result = await postMessage(token, raw);

  if (!result.ok && result.status === 401) {
    token = await getAccessToken(credentials, true);
    result = await postMessage(token, raw);
  }

  if (!result.ok) throw new Error(result.error);
  return result.id;
}
