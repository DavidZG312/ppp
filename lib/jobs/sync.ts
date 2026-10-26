import { finishSyncRun, startSyncRun, upsertJobs } from "../db";

import { dedupeRecords } from "./dedupe";
import { toJobRecord } from "./normalize";
import { scoreAllJobs } from "./score-service";
import { himalayasSource } from "./sources/himalayas";
import { jobicySource } from "./sources/jobicy";
import { remoteOkSource } from "./sources/remoteok";
import { remotiveSource } from "./sources/remotive";
import { weWorkRemotelySource } from "./sources/weworkremotely";
import type { JobSource, RawJob, SyncResult, SyncSummary } from "./types";

export const SOURCES: JobSource[] = [
  remotiveSource,
  remoteOkSource,
  himalayasSource,
  jobicySource,
  weWorkRemotelySource,
];

export function getSource(id: string): JobSource | undefined {
  return SOURCES.find((source) => source.id === id);
}

interface PendingRun {
  source: JobSource;
  runId: number;
  fetched: number;
  rawJobs: RawJob[];
}

export async function runSync(sourceIds?: string[]): Promise<SyncSummary> {
  const selected = sourceIds?.length
    ? SOURCES.filter((source) => sourceIds.includes(source.id))
    : SOURCES;

  const pending: PendingRun[] = [];
  const resultBySource = new Map<string, SyncResult>();

  for (const source of selected) {
    const runId = startSyncRun(source.id);
    try {
      const rawJobs = await source.fetchJobs();
      pending.push({ source, runId, fetched: rawJobs.length, rawJobs });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      finishSyncRun(runId, { fetched: 0, inserted: 0, updated: 0, error: message });
      resultBySource.set(source.id, {
        source: source.id,
        fetched: 0,
        inserted: 0,
        updated: 0,
        error: message,
      });
    }
  }

  const records = pending.flatMap((run) => run.rawJobs.map(toJobRecord));
  const deduped = dedupeRecords(records);
  const upsert = upsertJobs(deduped);

  for (const run of pending) {
    const stats = upsert.bySource[run.source.id] ?? { inserted: 0, updated: 0 };
    finishSyncRun(run.runId, {
      fetched: run.fetched,
      inserted: stats.inserted,
      updated: stats.updated,
    });
    resultBySource.set(run.source.id, {
      source: run.source.id,
      fetched: run.fetched,
      inserted: stats.inserted,
      updated: stats.updated,
      error: null,
    });
  }

  const scoring = await scoreAllJobs();
  const results = selected
    .map((source) => resultBySource.get(source.id))
    .filter((result): result is SyncResult => result !== undefined);

  return {
    results,
    scored: scoring.scored,
    excluded: scoring.excluded,
  };
}
