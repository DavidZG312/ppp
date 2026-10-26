import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { GMAIL_TOKEN_PATH, TOKENS_DIR } from "../paths";

export interface StoredTokens {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expires_at: number;
}

export async function readTokens(): Promise<StoredTokens | null> {
  try {
    const raw = await readFile(GMAIL_TOKEN_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoredTokens;
    if (!parsed.access_token || !parsed.expires_at) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeTokens(tokens: StoredTokens): Promise<void> {
  await mkdir(TOKENS_DIR, { recursive: true });
  await writeFile(GMAIL_TOKEN_PATH, `${JSON.stringify(tokens, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

export function tokenFilePath(): string {
  return path.relative(process.cwd(), GMAIL_TOKEN_PATH);
}
