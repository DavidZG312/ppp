import type { JobSource, RawJob } from "../types";

const API_URL = "https://himalayas.app/jobs/api";
const OFFSETS = [0, 20, 40, 60];

interface HimalayasJob {
  title: string;
  companyName: string;
  description: string;
  locationRestrictions?: string[];
  categories?: string[];
  seniority?: string[];
  employmentType?: string;
  minSalary?: number | null;
  maxSalary?: number | null;
  currency?: string | null;
  salaryPeriod?: string | null;
  pubDate?: number | string;
  applicationLink?: string;
  guid: string;
}

interface HimalayasResponse {
  jobs?: HimalayasJob[];
}

function toIsoDate(value: number | string | undefined): string | null {
  if (value === undefined || value === null) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  const date = Number.isFinite(numeric)
    ? new Date(numeric * 1000)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toSalary(job: HimalayasJob): string | null {
  const min = Number(job.minSalary ?? 0);
  const max = Number(job.maxSalary ?? 0);
  if (min <= 0 && max <= 0) return null;
  const currency = job.currency ?? "USD";
  const period = job.salaryPeriod === "annual" ? "/año" : job.salaryPeriod ? `/${job.salaryPeriod}` : "";
  const format = (value: number) =>
    value >= 1000 ? `${Math.round(value / 1000)}k` : String(Math.round(value));
  if (min > 0 && max > 0) return `${currency} ${format(min)}–${format(max)}${period}`;
  if (min > 0) return `${currency} ${format(min)}+${period}`;
  return `${currency} hasta ${format(max)}${period}`;
}

async function fetchPage(offset: number): Promise<HimalayasJob[]> {
  const url = new URL(API_URL);
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("limit", "20");

  const response = await fetch(url, {
    headers: { "User-Agent": "CVSEND/0.1 (búsqueda personal de empleo)" },
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Himalayas respondió ${response.status}`);
  const data = (await response.json()) as HimalayasResponse;
  return Array.isArray(data.jobs) ? data.jobs : [];
}

export const himalayasSource: JobSource = {
  id: "himalayas",
  name: "Himalayas",
  attribution: "Ofertas obtenidas de la API pública de Himalayas (himalayas.app).",
  async fetchJobs() {
    const responses = await Promise.allSettled(OFFSETS.map((offset) => fetchPage(offset)));
    const byGuid = new Map<string, RawJob>();
    const errors: string[] = [];

    for (const result of responses) {
      if (result.status === "rejected") {
        errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
        continue;
      }
      for (const job of result.value) {
        if (!job.guid || !job.title) continue;
        const restrictions = job.locationRestrictions ?? [];
        byGuid.set(job.guid, {
          source: "himalayas",
          externalId: job.guid,
          title: job.title,
          company: job.companyName || "Empresa no indicada",
          location: restrictions.length > 0 ? restrictions.join(", ") : "Remote",
          url: job.applicationLink || job.guid,
          description: job.description ?? "",
          tags: [...(job.categories ?? []), ...(job.seniority ?? []), job.employmentType ?? ""].filter(
            Boolean,
          ),
          jobType: job.employmentType ?? null,
          salary: toSalary(job),
          publishedAt: toIsoDate(job.pubDate),
          remote: true,
        });
      }
    }

    if (byGuid.size === 0 && errors.length > 0) {
      throw new Error(`No se pudo consultar Himalayas: ${errors[0]}`);
    }

    return [...byGuid.values()];
  },
};
