import { XMLParser } from "fast-xml-parser";

import type { JobSource, RawJob } from "../types";

const RSS_URL = "https://weworkremotely.com/categories/remote-programming-jobs.rss";

interface RssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  region?: string;
  category?: string | string[];
}

interface RssDocument {
  rss?: {
    channel?: {
      item?: RssItem | RssItem[];
    };
  };
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function splitTitle(title: string): { company: string; role: string } {
  const separator = title.indexOf(":");
  if (separator > 0 && separator < 45) {
    return {
      company: title.slice(0, separator).trim(),
      role: title.slice(separator + 1).trim(),
    };
  }
  return { company: "We Work Remotely", role: title.trim() };
}

export const weWorkRemotelySource: JobSource = {
  id: "weworkremotely",
  name: "We Work Remotely",
  attribution: "Ofertas obtenidas del RSS público de We Work Remotely (weworkremotely.com).",
  async fetchJobs() {
    const response = await fetch(RSS_URL, {
      headers: { "User-Agent": "CVSEND/0.1 (búsqueda personal de empleo)" },
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`We Work Remotely respondió ${response.status}`);

    const xml = await response.text();
    const parser = new XMLParser({ ignoreAttributes: true, processEntities: true });
    const document = parser.parse(xml) as RssDocument;
    const items = asArray(document.rss?.channel?.item);

    const jobs: RawJob[] = [];
    for (const item of items) {
      if (!item.link || !item.title) continue;
      const { company, role } = splitTitle(item.title);
      const published = item.pubDate ? new Date(item.pubDate) : null;

      jobs.push({
        source: "weworkremotely",
        externalId: item.link,
        title: role,
        company,
        location: item.region || "Remote",
        url: item.link,
        description: item.description ?? "",
        tags: asArray(item.category),
        jobType: null,
        salary: null,
        publishedAt:
          published && !Number.isNaN(published.getTime()) ? published.toISOString() : null,
        remote: true,
      });
    }

    return jobs;
  },
};
