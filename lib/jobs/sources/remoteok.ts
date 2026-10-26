import type { JobSource, RawJob } from "../types";

const API_URL = "https://remoteok.com/api";

interface RemoteOkJob {
  id?: number | string;
  slug?: string;
  position?: string;
  company?: string;
  description?: string;
  location?: string;
  tags?: string[];
  date?: string;
  url?: string;
  salary_min?: number;
  salary_max?: number;
  legal?: string;
}

function formatSalary(min: number, max: number): string | null {
  if (min <= 0 && max <= 0) return null;
  const format = (value: number) =>
    value >= 1000 ? `${Math.round(value / 1000)}k` : String(Math.round(value));
  if (min > 0 && max > 0) return `USD ${format(min)}–${format(max)}`;
  if (min > 0) return `USD ${format(min)}+`;
  return `USD hasta ${format(max)}`;
}

export const remoteOkSource: JobSource = {
  id: "remoteok",
  name: "RemoteOK",
  attribution: "Ofertas obtenidas de la API pública de RemoteOK (remoteok.com).",
  async fetchJobs() {
    const response = await fetch(API_URL, {
      headers: { "User-Agent": "CVSEND/0.1 (búsqueda personal de empleo)" },
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`RemoteOK respondió ${response.status}`);

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) return [];

    const jobs: RawJob[] = [];
    for (const item of data as RemoteOkJob[]) {
      if (!item || item.legal || item.position === undefined) continue;
      const externalId = String(item.id ?? item.slug ?? item.url ?? "");
      if (!externalId || !item.url || !item.position) continue;

      const min = Number(item.salary_min ?? 0);
      const max = Number(item.salary_max ?? 0);

      jobs.push({
        source: "remoteok",
        externalId,
        title: item.position,
        company: item.company ?? "Empresa no indicada",
        location: item.location || "Remote",
        url: item.url,
        description: item.description ?? "",
        tags: item.tags ?? [],
        jobType: null,
        salary: formatSalary(min, max),
        publishedAt: item.date ? new Date(item.date).toISOString() : null,
        remote: true,
      });
    }

    return jobs;
  },
};
