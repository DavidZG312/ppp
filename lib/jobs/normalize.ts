import { createHash } from "node:crypto";

import type { CountryScope, JobRecord, RawJob } from "./types";

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(Number.parseInt(dec, 10)),
    )
    .replace(/&([a-z]+);/gi, (match, name) => HTML_ENTITIES[name] ?? match);
}

export function htmlToText(html: string): string {
  const withoutBlocks = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ");

  return decodeEntities(withoutBlocks)
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

export function extractContactEmail(text: string): string | null {
  const matches = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [];
  const blocked = /(example\.(com|org)|sentry|no-?reply|remotive\.com|schema\.org)/i;
  return matches.map((email) => email.toLowerCase()).find((email) => !blocked.test(email)) ?? null;
}

export function inferCountryScope(location: string): CountryScope {
  const value = location.toLowerCase();
  if (!value.trim()) return "unknown";
  if (/(worldwide|anywhere|global|remote)/.test(value)) return "worldwide";
  if (/(latin america|latam|south america|centroam|caribbean)/.test(value)) return "latam";
  if (/(americas)/.test(value)) return "americas";
  if (/(colombia)/.test(value)) return "colombia";
  if (/(mexico|méxico)/.test(value)) return "mexico";
  if (/(spain|españa)/.test(value)) return "spain";
  if (/(usa|united states|u\.s\.|canada)/.test(value)) return "usa";
  if (/(europe|european|emea|uk|united kingdom|germany|france|netherlands|portugal|ireland)/.test(value)) return "europe";
  if (/(africa)/.test(value)) return "africa";
  if (/(asia|apac|india|japan|singapore|philippines)/.test(value)) return "asia";
  if (/(australia|new zealand|oceania)/.test(value)) return "oceania";
  return "unknown";
}

export function inferRemote(location: string, description: string, fallback = true): boolean {
  const haystack = `${location}\n${description}`.toLowerCase();
  if (/(on-?site|presencial|hybrid|híbrido|hibrido)/.test(haystack)) {
    if (!/(100% remote|fully remote|remote-first|remoto)/.test(haystack)) return false;
  }
  if (/(remote|remoto|worldwide|anywhere)/.test(haystack)) return true;
  return fallback;
}

export function normalizeExternalId(source: string, externalId: string): string {
  return `${source}:${externalId}`;
}

export function jobId(source: string, externalId: string): string {
  return createHash("sha1")
    .update(normalizeExternalId(source, externalId))
    .digest("hex")
    .slice(0, 16);
}

export function toJobRecord(raw: RawJob): JobRecord {
  const description = htmlToText(raw.description);
  return {
    ...raw,
    id: jobId(raw.source, raw.externalId),
    description,
    contactEmail: extractContactEmail(description),
    countryScope: inferCountryScope(raw.location),
    remote: raw.remote ?? inferRemote(raw.location, description),
    fetchedAt: new Date().toISOString(),
    score: 0,
    scoreReasons: [],
    flags: [],
    excludedReason: null,
    scoredAt: null,
  };
}
