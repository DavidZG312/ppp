export type CountryScope =
  | "worldwide"
  | "latam"
  | "americas"
  | "colombia"
  | "mexico"
  | "spain"
  | "usa"
  | "europe"
  | "africa"
  | "asia"
  | "oceania"
  | "unknown";

export interface RawJob {
  source: string;
  externalId: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  tags: string[];
  jobType: string | null;
  salary: string | null;
  publishedAt: string | null;
  remote?: boolean;
}

export interface JobRecord extends RawJob {
  id: string;
  remote: boolean;
  countryScope: CountryScope;
  contactEmail: string | null;
  fetchedAt: string;
  score: number;
  scoreReasons: string[];
  flags: string[];
  excludedReason: string | null;
  scoredAt: string | null;
}

export interface JobSource {
  id: string;
  name: string;
  attribution?: string;
  fetchJobs: () => Promise<RawJob[]>;
}

export interface SyncResult {
  source: string;
  fetched: number;
  inserted: number;
  updated: number;
  error: string | null;
}

export interface SyncSummary {
  results: SyncResult[];
  scored: number;
  excluded: number;
}

export interface SyncRun {
  id: number;
  source: string;
  startedAt: string;
  finishedAt: string | null;
  fetched: number;
  inserted: number;
  updated: number;
  error: string | null;
}
