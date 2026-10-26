import type { JobSource, RawJob } from "../types";

const API_URL = "https://remotive.com/api/remote-jobs";

const SEARCHES = [
  "react",
  "next.js",
  "frontend",
  "typescript",
  "javascript",
  "full stack",
  "node.js",
];

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
}

interface RemotiveResponse {
  jobs?: RemotiveJob[];
}

function toRawJob(job: RemotiveJob): RawJob {
  return {
    source: "remotive",
    externalId: String(job.id),
    title: job.title,
    company: job.company_name,
    location: job.candidate_required_location || "Remoto",
    url: job.url,
    description: job.description ?? "",
    tags: [...(job.tags ?? []), job.category].filter(Boolean),
    jobType: job.job_type || null,
    salary: job.salary || null,
    publishedAt: job.publication_date ? new Date(job.publication_date).toISOString() : null,
    remote: true,
  };
}

async function fetchSearch(term: string): Promise<RemotiveJob[]> {
  const url = new URL(API_URL);
  if (term) url.searchParams.set("search", term);
  url.searchParams.set("limit", "50");

  const response = await fetch(url, {
    headers: { "User-Agent": "CVSEND/0.1 (búsqueda personal de empleo)" },
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Remotive respondió ${response.status}`);
  }

  const data = (await response.json()) as RemotiveResponse;
  return Array.isArray(data.jobs) ? data.jobs : [];
}

export const remotiveSource: JobSource = {
  id: "remotive",
  name: "Remotive",
  attribution: "Ofertas obtenidas de la API pública de Remotive (remotive.com).",
  async fetchJobs() {
    const responses = await Promise.allSettled([
      ...SEARCHES.map((term) => fetchSearch(term)),
      fetchSearch(""),
    ]);

    const byId = new Map<string, RawJob>();
    const errors: string[] = [];

    for (const result of responses) {
      if (result.status === "rejected") {
        errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
        continue;
      }
      for (const job of result.value) {
        byId.set(String(job.id), toRawJob(job));
      }
    }

    if (byId.size === 0 && errors.length > 0) {
      throw new Error(`No se pudo consultar Remotive: ${errors[0]}`);
    }

    return [...byId.values()];
  },
};
