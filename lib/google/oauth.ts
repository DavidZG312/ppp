import type { GoogleCredentials } from "./config";
import { readTokens, writeTokens, type StoredTokens } from "./tokens";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/gmail.send";

export class GmailAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GmailAuthError";
  }
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

function toStoredTokens(
  response: TokenResponse,
  previousRefreshToken?: string,
): StoredTokens {
  if (!response.access_token || !response.expires_in) {
    throw new GmailAuthError(
      response.error_description ??
        response.error ??
        "Google no devolvió un token de acceso válido.",
    );
  }

  return {
    access_token: response.access_token,
    refresh_token: response.refresh_token ?? previousRefreshToken,
    scope: response.scope,
    token_type: response.token_type,
    expires_at: Date.now() + response.expires_in * 1000,
  };
}

export function buildAuthUrl(credentials: GoogleCredentials, state: string): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", credentials.clientId);
  url.searchParams.set("redirect_uri", credentials.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCode(
  code: string,
  credentials: GoogleCredentials,
): Promise<StoredTokens> {
  const body = new URLSearchParams({
    code,
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    redirect_uri: credentials.redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const data = (await response.json()) as TokenResponse;
  if (!response.ok) {
    throw new GmailAuthError(
      data.error_description ?? data.error ?? `Google respondió ${response.status}.`,
    );
  }

  return toStoredTokens(data);
}

async function refreshTokens(
  refreshToken: string,
  credentials: GoogleCredentials,
): Promise<StoredTokens> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    grant_type: "refresh_token",
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const data = (await response.json()) as TokenResponse;
  if (!response.ok) {
    throw new GmailAuthError(
      data.error_description ?? data.error ?? `Google respondió ${response.status}.`,
    );
  }

  return toStoredTokens(data, refreshToken);
}

export async function saveAuthorization(
  accessToken: StoredTokens,
): Promise<void> {
  await writeTokens(accessToken);
}

export async function getAccessToken(
  credentials: GoogleCredentials,
  forceRefresh = false,
): Promise<string> {
  const tokens = await readTokens();
  if (!tokens) {
    throw new GmailAuthError(
      "Gmail no está conectado. Abre /postulaciones y pulsa «Conectar Gmail».",
    );
  }

  if (!forceRefresh && tokens.expires_at > Date.now() + 60_000) {
    return tokens.access_token;
  }

  if (!tokens.refresh_token) {
    throw new GmailAuthError(
      "El token de Gmail no tiene refresh_token. Vuelve a conectar la cuenta.",
    );
  }

  const refreshed = await refreshTokens(tokens.refresh_token, credentials);
  await writeTokens(refreshed);
  return refreshed.access_token;
}
