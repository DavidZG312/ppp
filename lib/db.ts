import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { DB_PATH } from "./paths";
import type { JobRecord, SyncRun } from "./jobs/types";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  remote INTEGER NOT NULL DEFAULT 1,
  country_scope TEXT NOT NULL DEFAULT 'unknown',
  job_type TEXT,
  salary TEXT,
  url TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  contact_email TEXT,
  published_at TEXT,
  fetched_at TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  score_reasons TEXT NOT NULL DEFAULT '[]',
  flags TEXT NOT NULL DEFAULT '[]',
  excluded_reason TEXT,
  scored_at TEXT,
  UNIQUE(source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_jobs_published ON jobs(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);

CREATE TABLE IF NOT EXISTS sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  fetched INTEGER NOT NULL DEFAULT 0,
  inserted INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  error TEXT
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  recipient TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  message_id TEXT,
  sent_at TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_updated ON applications(updated_at DESC);
`;

const globalForDb = globalThis as unknown as { __cvsendDb?: DatabaseSync };

function ensureColumn(
  db: DatabaseSync,
  table: string,
  column: string,
  definition: string,
): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as {
    name: string;
  }[];
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function getDb(): DatabaseSync {
  if (globalForDb.__cvsendDb) return globalForDb.__cvsendDb;

  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);

  ensureColumn(db, "jobs", "score", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "jobs", "score_reasons", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, "jobs", "flags", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, "jobs", "excluded_reason", "TEXT");
  ensureColumn(db, "jobs", "scored_at", "TEXT");
  db.exec("CREATE INDEX IF NOT EXISTS idx_jobs_score ON jobs(score DESC);");

  globalForDb.__cvsendDb = db;
  return db;
}

interface JobRow {
  id: string;
  source: string;
  external_id: string;
  title: string;
  company: string;
  location: string;
  remote: number;
  country_scope: string;
  job_type: string | null;
  salary: string | null;
  url: string;
  description: string;
  tags: string;
  contact_email: string | null;
  published_at: string | null;
  fetched_at: string;
  score: number | bigint;
  score_reasons: string;
  flags: string;
  excluded_reason: string | null;
  scored_at: string | null;
}

function parseStringArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    return [];
  }
  return [];
}

function rowToJob(row: JobRow): JobRecord {
  return {
    id: row.id,
    source: row.source,
    externalId: row.external_id,
    title: row.title,
    company: row.company,
    location: row.location,
    remote: row.remote === 1,
    countryScope: row.country_scope as JobRecord["countryScope"],
    jobType: row.job_type,
    salary: row.salary,
    url: row.url,
    description: row.description,
    tags: parseStringArray(row.tags),
    contactEmail: row.contact_email,
    publishedAt: row.published_at,
    fetchedAt: row.fetched_at,
    score: Number(row.score ?? 0),
    scoreReasons: parseStringArray(row.score_reasons),
    flags: parseStringArray(row.flags),
    excludedReason: row.excluded_reason,
    scoredAt: row.scored_at,
  };
}

export interface UpsertResult {
  inserted: number;
  updated: number;
  bySource: Record<string, { inserted: number; updated: number }>;
}

export function upsertJobs(jobs: JobRecord[]): UpsertResult {
  const bySource: Record<string, { inserted: number; updated: number }> = {};
  if (jobs.length === 0) return { inserted: 0, updated: 0, bySource };

  const db = getDb();
  const exists = db.prepare(
    "SELECT 1 AS found FROM jobs WHERE source = ? AND external_id = ? LIMIT 1",
  );
  const upsert = db.prepare(`
    INSERT INTO jobs (
      id, source, external_id, title, company, location, remote,
      country_scope, job_type, salary, url, description, tags,
      contact_email, published_at, fetched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source, external_id) DO UPDATE SET
      title = excluded.title,
      company = excluded.company,
      location = excluded.location,
      remote = excluded.remote,
      country_scope = excluded.country_scope,
      job_type = excluded.job_type,
      salary = excluded.salary,
      url = excluded.url,
      description = excluded.description,
      tags = excluded.tags,
      contact_email = excluded.contact_email,
      published_at = excluded.published_at,
      fetched_at = excluded.fetched_at
  `);

  let inserted = 0;
  let updated = 0;

  db.exec("BEGIN");
  try {
    for (const job of jobs) {
      const alreadyExists = exists.get(job.source, job.externalId);
      upsert.run(
        job.id,
        job.source,
        job.externalId,
        job.title,
        job.company,
        job.location,
        job.remote ? 1 : 0,
        job.countryScope,
        job.jobType,
        job.salary,
        job.url,
        job.description,
        JSON.stringify(job.tags),
        job.contactEmail,
        job.publishedAt,
        job.fetchedAt,
      );

      const sourceStats = (bySource[job.source] ??= { inserted: 0, updated: 0 });
      if (alreadyExists) {
        updated += 1;
        sourceStats.updated += 1;
      } else {
        inserted += 1;
        sourceStats.inserted += 1;
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return { inserted, updated, bySource };
}

export interface ScoreUpdate {
  id: string;
  score: number;
  reasons: string[];
  flags: string[];
  excludedReason: string | null;
}

export function updateJobScores(updates: ScoreUpdate[]): void {
  if (updates.length === 0) return;
  const db = getDb();
  const scoredAt = new Date().toISOString();
  const statement = db.prepare(
    `UPDATE jobs
     SET score = ?, score_reasons = ?, flags = ?, excluded_reason = ?, scored_at = ?
     WHERE id = ?`,
  );

  db.exec("BEGIN");
  try {
    for (const update of updates) {
      statement.run(
        update.score,
        JSON.stringify(update.reasons),
        JSON.stringify(update.flags),
        update.excludedReason,
        scoredAt,
        update.id,
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export interface JobListOptions {
  limit?: number;
  search?: string;
  source?: string;
  onlyRemote?: boolean;
  minScore?: number;
  includeExcluded?: boolean;
  entryOnly?: boolean;
  sort?: "score" | "date";
}

export function listJobs(options: JobListOptions = {}): JobRecord[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (options.onlyRemote ?? true) clauses.push("remote = 1");
  if (!options.includeExcluded) clauses.push("excluded_reason IS NULL");
  if (options.minScore !== undefined) {
    if (options.includeExcluded) {
      clauses.push("(score >= ? OR excluded_reason IS NOT NULL)");
    } else {
      clauses.push("score >= ?");
    }
    params.push(options.minScore);
  }
  if (options.entryOnly) {
    clauses.push("flags LIKE '%\"entry-friendly\"%'");
  }
  if (options.source) {
    clauses.push("source = ?");
    params.push(options.source);
  }
  if (options.search?.trim()) {
    clauses.push("(lower(title) LIKE ? OR lower(company) LIKE ? OR lower(description) LIKE ?)");
    const like = `%${options.search.trim().toLowerCase()}%`;
    params.push(like, like, like);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const order =
    options.sort === "date"
      ? "COALESCE(published_at, fetched_at) DESC"
      : "score DESC, COALESCE(published_at, fetched_at) DESC";

  const rows = db
    .prepare(`SELECT * FROM jobs ${where} ORDER BY ${order} LIMIT ?`)
    .all(...params, limit) as unknown as JobRow[];

  return rows.map(rowToJob);
}

export function listAllJobsForScoring(): JobRecord[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM jobs ORDER BY COALESCE(published_at, fetched_at) DESC")
    .all() as unknown as JobRow[];
  return rows.map(rowToJob);
}

export function getJob(id: string): JobRecord | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM jobs WHERE id = ? LIMIT 1").get(id) as
    | JobRow
    | undefined;
  return row ? rowToJob(row) : null;
}

export function countJobs(): {
  total: number;
  remote: number;
  eligible: number;
  excluded: number;
} {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(remote) AS remote,
         SUM(CASE WHEN excluded_reason IS NULL AND score >= 30 THEN 1 ELSE 0 END) AS eligible,
         SUM(CASE WHEN excluded_reason IS NOT NULL THEN 1 ELSE 0 END) AS excluded
       FROM jobs`,
    )
    .get() as {
    total: number | bigint;
    remote: number | bigint | null;
    eligible: number | bigint | null;
    excluded: number | bigint | null;
  };
  return {
    total: Number(row.total),
    remote: Number(row.remote ?? 0),
    eligible: Number(row.eligible ?? 0),
    excluded: Number(row.excluded ?? 0),
  };
}

export function startSyncRun(source: string): number {
  const db = getDb();
  const result = db
    .prepare("INSERT INTO sync_runs (source, started_at) VALUES (?, ?)")
    .run(source, new Date().toISOString());
  return Number(result.lastInsertRowid);
}

export function finishSyncRun(
  id: number,
  data: {
    fetched: number;
    inserted: number;
    updated: number;
    error?: string | null;
  },
): void {
  const db = getDb();
  db.prepare(
    `UPDATE sync_runs
     SET finished_at = ?, fetched = ?, inserted = ?, updated = ?, error = ?
     WHERE id = ?`,
  ).run(
    new Date().toISOString(),
    data.fetched,
    data.inserted,
    data.updated,
    data.error ?? null,
    id,
  );
}

interface SyncRunRow {
  id: number | bigint;
  source: string;
  started_at: string;
  finished_at: string | null;
  fetched: number;
  inserted: number;
  updated: number;
  error: string | null;
}

export function listSyncRuns(limit = 20): SyncRun[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM sync_runs ORDER BY id DESC LIMIT ?")
    .all(Math.min(Math.max(limit, 1), 100)) as unknown as SyncRunRow[];

  return rows.map((row) => ({
    id: Number(row.id),
    source: row.source,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    fetched: Number(row.fetched),
    inserted: Number(row.inserted),
    updated: Number(row.updated),
    error: row.error,
  }));
}
