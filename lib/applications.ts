import { randomUUID } from "node:crypto";

import { getDb } from "./db";

export type ApplicationStatus = "draft" | "sent" | "error";

export interface ApplicationRecord {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  recipient: string;
  subject: string;
  body: string;
  messageId: string | null;
  sentAt: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationWithJob extends ApplicationRecord {
  jobTitle: string;
  jobCompany: string;
  jobUrl: string;
  jobSource: string;
}

interface ApplicationRow {
  id: string;
  job_id: string;
  status: string;
  recipient: string;
  subject: string;
  body: string;
  message_id: string | null;
  sent_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

interface ApplicationWithJobRow extends ApplicationRow {
  job_title: string;
  job_company: string;
  job_url: string;
  job_source: string;
}

function rowToApplication(row: ApplicationRow): ApplicationRecord {
  return {
    id: row.id,
    jobId: row.job_id,
    status: row.status as ApplicationStatus,
    recipient: row.recipient,
    subject: row.subject,
    body: row.body,
    messageId: row.message_id,
    sentAt: row.sent_at,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getApplication(jobId: string): ApplicationRecord | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM applications WHERE job_id = ? LIMIT 1")
    .get(jobId) as ApplicationRow | undefined;
  return row ? rowToApplication(row) : null;
}

export interface DraftInput {
  recipient: string;
  subject: string;
  body: string;
}

export function saveDraft(jobId: string, draft: DraftInput): ApplicationRecord {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO applications (
       id, job_id, status, recipient, subject, body, created_at, updated_at
     ) VALUES (?, ?, 'draft', ?, ?, ?, ?, ?)
     ON CONFLICT(job_id) DO UPDATE SET
       recipient = excluded.recipient,
       subject = excluded.subject,
       body = excluded.body,
       status = 'draft',
       error = NULL,
       updated_at = excluded.updated_at
     WHERE applications.status != 'sent'`,
  ).run(randomUUID(), jobId, draft.recipient, draft.subject, draft.body, now, now);

  const saved = getApplication(jobId);
  if (!saved) throw new Error("No se pudo guardar el borrador de la postulación.");
  return saved;
}

export function markApplicationSent(
  jobId: string,
  data: DraftInput & { messageId: string },
): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE applications
     SET status = 'sent', recipient = ?, subject = ?, body = ?, message_id = ?,
         sent_at = ?, error = NULL, updated_at = ?
     WHERE job_id = ?`,
  ).run(data.recipient, data.subject, data.body, data.messageId, now, now, jobId);
}

export function markApplicationError(jobId: string, message: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE applications
     SET status = 'error', error = ?, updated_at = ?
     WHERE job_id = ? AND status != 'sent'`,
  ).run(message, now, jobId);
}

export function listApplications(limit = 50): ApplicationWithJob[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT a.*, j.title AS job_title, j.company AS job_company,
              j.url AS job_url, j.source AS job_source
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       ORDER BY a.updated_at DESC
       LIMIT ?`,
    )
    .all(Math.min(Math.max(limit, 1), 200)) as unknown as ApplicationWithJobRow[];

  return rows.map((row) => ({
    ...rowToApplication(row),
    jobTitle: row.job_title,
    jobCompany: row.job_company,
    jobUrl: row.job_url,
    jobSource: row.job_source,
  }));
}

export function countApplications(): {
  draft: number;
  sent: number;
  error: number;
} {
  const db = getDb();
  const rows = db
    .prepare("SELECT status, COUNT(*) AS total FROM applications GROUP BY status")
    .all() as unknown as { status: string; total: number | bigint }[];

  const counts = { draft: 0, sent: 0, error: 0 };
  for (const row of rows) {
    if (row.status === "draft" || row.status === "sent" || row.status === "error") {
      counts[row.status] = Number(row.total);
    }
  }
  return counts;
}
