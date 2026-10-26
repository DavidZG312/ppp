import type { JobSource, RawJob } from "../types";

const API_URL = "https://jobicy.com/api/v2/remote-jobs";

interface JobicyJob {
  id: number | string;
  url: string;
  jobTitle: string;
  companyName: string;
  jobGeo?: string;
  jobIndustry?: string[];
  jobType?: string[];
  jobLevel?: string;
  jobDescription?: string;
  pubDate?: string;
}

interface JobicyResponse {
  jobs?: JobicyJob[];
}

export const jobicySource: JobSource = {
  id: "jobicy",
  name: "Jobicy",
  attribution: "Ofertas obtenidas de la API pública de Jobicy (jobicy.com).",
  async fetchJobs() {
    const url = new URL(API_URL);
    url.searchParams.set("count", "50");
    url.searchParams.set("geo", "anywhere");

    const response = await fetch(url, {
      headers: { "User-Agent": "CVSEND/0.1 (búsqueda personal de empleo)" },
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`Jobicy respondió ${response.status}`);

    const data = (await response.json()) as JobicyResponse;
    if (!Array.isArray(data.jobs)) return [];

    const jobs: RawJob[] = [];
    for (const job of data.jobs) {
      if (!job.id || !job.jobTitle || !job.url) continue;
      jobs.push({
        source: "jobicy",
        externalId: String(job.id),
        title: job.jobTitle,
        company: job.companyName || "Empresa no indicada",
        location: job.jobGeo || "Remote",
        url: job.url,
        description: job.jobDescription ?? "",
        tags: [...(job.jobIndustry ?? []), ...(job.jobType ?? []), job.jobLevel ?? ""].filter(Boolean),
        jobType: job.jobType?.join(", ") ?? null,
        salary: null,
        publishedAt: job.pubDate ? new Date(job.pubDate).toISOString() : null,
        remote: true,
      });
    }

    return jobs;
  },
};
