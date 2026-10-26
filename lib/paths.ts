import path from "node:path";

export const ROOT_DIR = process.cwd();
export const DATA_DIR = path.join(ROOT_DIR, "data");
export const GENERATED_DIR = path.join(DATA_DIR, "generated");
export const PROFILE_PATH = path.join(DATA_DIR, "profile.yaml");
export const DB_PATH = path.join(DATA_DIR, "cvsend.db");
export const CONFIG_PATH = path.join(ROOT_DIR, "config.yaml");
export const CREDENTIALS_DIR = path.join(ROOT_DIR, "credentials");
export const CLIENT_SECRET_PATH = path.join(CREDENTIALS_DIR, "client_secret.json");
export const TOKENS_DIR = path.join(ROOT_DIR, "tokens");
export const GMAIL_TOKEN_PATH = path.join(TOKENS_DIR, "gmail.json");
