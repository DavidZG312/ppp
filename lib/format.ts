import type { CountryScope } from "./jobs/types";

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(value: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return dateFormatter.format(date);
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const SCOPE_LABELS: Record<CountryScope, string> = {
  worldwide: "Global",
  latam: "LatAm",
  americas: "Américas",
  colombia: "Colombia",
  mexico: "México",
  spain: "España",
  usa: "EE. UU. / Canadá",
  europe: "Europa",
  africa: "África",
  asia: "Asia / APAC",
  oceania: "Oceanía",
  unknown: "Ubicación por revisar",
};

export function scopeLabel(scope: CountryScope): string {
  return SCOPE_LABELS[scope];
}

export function truncate(value: string, length: number): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length).trimEnd()}…`;
}
