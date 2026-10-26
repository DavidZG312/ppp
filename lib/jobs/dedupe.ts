import type { JobRecord } from "./types";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(remote|remoto|remota)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function quality(job: JobRecord): number {
  let value = Math.min(job.description.length, 20_000) / 100;
  if (job.salary) value += 20;
  if (job.contactEmail) value += 15;
  if (job.tags.length > 0) value += 5;
  if (job.publishedAt) value += 5;
  return value;
}

export function dedupeRecords(records: JobRecord[]): JobRecord[] {
  const byKey = new Map<string, JobRecord>();

  for (const record of records) {
    const key = `${normalize(record.company)}|${normalize(record.title)}`;
    if (!key.trim() || key === "|") {
      byKey.set(record.id, record);
      continue;
    }

    const existing = byKey.get(key);
    if (!existing || quality(record) > quality(existing)) {
      byKey.set(key, record);
    }
  }

  return [...byKey.values()];
}
