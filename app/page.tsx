import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";

import { countJobs, listJobs, listSyncRuns } from "@/lib/db";
import { formatDate, formatDateTime, scopeLabel, truncate } from "@/lib/format";
import { SOURCES } from "@/lib/jobs/sync";
import type { JobRecord } from "@/lib/jobs/types";

import { SyncButton } from "./components/sync-button";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FLAG_LABELS: Record<string, string> = {
  "entry-friendly": "Junior friendly",
  frontend: "Frontend",
  global: "Global/LatAm",
  "needs-work-auth": "Requiere permiso EE. UU.",
  "spanish-friendly": "Español",
  "english-required": "Inglés avanzado",
  "salary-listed": "Salario publicado",
};

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function sourceName(id: string): string {
  return SOURCES.find((source) => source.id === id)?.name ?? id;
}

function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "blue" | "green" | "amber" | "red";
}) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-600",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function scoreTone(job: JobRecord): "slate" | "blue" | "green" | "amber" | "red" {
  if (job.excludedReason) return "red";
  if (job.score >= 70) return "green";
  if (job.score >= 50) return "blue";
  if (job.score >= 30) return "amber";
  return "slate";
}

function JobCard({ job }: { job: JobRecord }) {
  const tags = [...new Set(job.tags)].slice(0, 6);
  const flags = [...new Set(job.flags)];
  const preview = truncate(job.description.replace(/\s+/g, " "), 260);
  const mailto = job.contactEmail
    ? `mailto:${job.contactEmail}?subject=${encodeURIComponent(
        `Postulación — ${job.title}`,
      )}`
    : null;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="text-base font-semibold text-blue-800 hover:underline"
          >
            {job.title}
          </a>
          <p className="text-sm font-medium text-slate-700">{job.company}</p>
        </div>
        <div className="shrink-0 text-right text-xs text-slate-500">
          <Badge tone={scoreTone(job)}>
            {job.excludedReason ? "Descartada" : `Score ${job.score}`}
          </Badge>
          <p className="mt-1">{formatDate(job.publishedAt)}</p>
          {job.salary ? (
            <p className="mt-0.5 font-semibold text-slate-700">{job.salary}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone="green">Remoto</Badge>
        <Badge tone="blue">{scopeLabel(job.countryScope)}</Badge>
        <Badge>{job.location}</Badge>
        {job.jobType ? <Badge tone="amber">{job.jobType}</Badge> : null}
        <Badge>{sourceName(job.source)}</Badge>
        {job.contactEmail ? <Badge tone="blue">Email directo</Badge> : null}
        {flags.map((flag) => (
          <Badge
            key={flag}
            tone={
              flag === "entry-friendly"
                ? "green"
                : flag === "english-required" || flag === "needs-work-auth"
                  ? "amber"
                  : "slate"
            }
          >
            {FLAG_LABELS[flag] ?? flag}
          </Badge>
        ))}
      </div>

      {job.excludedReason ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          Descartada automáticamente: {job.excludedReason}
        </p>
      ) : null}

      {job.scoreReasons.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-slate-600">
          {job.scoreReasons.slice(0, 5).map((reason) => (
            <li key={reason} className="flex gap-2">
              <span aria-hidden className="text-slate-400">
                •
              </span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {preview ? (
        <p className="mt-3 text-sm text-slate-600">{preview}</p>
      ) : null}

      {tags.length > 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          {tags.map((tag) => `#${tag}`).join("  ")}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold">
        <Link
          href={`/postular?jobId=${job.id}`}
          className="text-blue-700 hover:text-blue-900"
        >
          Preparar postulación
        </Link>
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="text-blue-700 hover:text-blue-900"
        >
          Ver oferta original
        </a>
        {mailto ? (
          <a href={mailto} className="text-blue-700 hover:text-blue-900">
            Enviar correo
          </a>
        ) : null}
      </div>

      <details className="mt-3 border-t border-slate-100 pt-3">
        <summary className="cursor-pointer text-xs font-medium text-slate-500">
          Ver descripción completa
        </summary>
        <div className="mt-2 max-h-80 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-slate-600">
          {job.description || "Sin descripción."}
        </div>
      </details>
    </article>
  );
}

function JobsSkeleton() {
  return (
    <div className="mt-6 space-y-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-36 animate-pulse rounded-xl border border-slate-200 bg-white"
        />
      ))}
    </div>
  );
}

async function JobsContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();

  const params = await searchParams;
  const q = first(params.q).trim();
  const source = first(params.source);
  const entryOnly = first(params.entryOnly) === "1";
  const includeExcluded = first(params.includeExcluded) === "1";
  const sort = first(params.sort) === "date" ? "date" : "score";
  const rawMinScore = params.minScore;
  const minScore =
    rawMinScore === undefined
      ? 30
      : Math.min(100, Math.max(0, Number.parseInt(first(rawMinScore), 10) || 0));

  const jobs = listJobs({
    limit: 200,
    search: q,
    source: source || undefined,
    minScore,
    includeExcluded,
    entryOnly,
    sort,
  });
  const counts = countJobs();
  const lastRun = listSyncRuns(1)[0] ?? null;
  const filtersActive =
    q.length > 0 ||
    source.length > 0 ||
    entryOnly ||
    includeExcluded ||
    minScore !== 30 ||
    sort !== "score";

  return (
    <>
      <form
        action="/"
        method="get"
        className="mt-6 rounded-xl border border-slate-200 bg-white p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-slate-600">
            Buscar
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="React, Next.js, empresa…"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Fuente
            <select
              name="source"
              defaultValue={source}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
            >
              <option value="">Todas</option>
              {SOURCES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Score mínimo
            <select
              name="minScore"
              defaultValue={String(minScore)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
            >
              <option value="0">0 (todas)</option>
              <option value="30">30 (recomendado)</option>
              <option value="50">50</option>
              <option value="70">70</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Orden
            <select
              name="sort"
              defaultValue={sort}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800"
            >
              <option value="score">Mejor score</option>
              <option value="date">Más recientes</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="entryOnly"
              value="1"
              defaultChecked={entryOnly}
              className="size-4"
            />
            Solo junior/entry
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="includeExcluded"
              value="1"
              defaultChecked={includeExcluded}
              className="size-4"
            />
            Incluir descartadas
          </label>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
          >
            Aplicar filtros
          </button>
          {filtersActive ? (
            <Link href="/" className="text-xs font-semibold text-blue-700 hover:underline">
              Limpiar filtros
            </Link>
          ) : null}
        </div>
      </form>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ofertas guardadas
          </p>
          <p className="mt-1 text-2xl font-bold">{counts.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Encajan (score ≥ 30)
          </p>
          <p className="mt-1 text-2xl font-bold">{counts.eligible}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Descartadas por filtros
          </p>
          <p className="mt-1 text-2xl font-bold">{counts.excluded}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Última sincronización
          </p>
          <p className="mt-1 text-sm font-semibold">
            {lastRun ? formatDateTime(lastRun.finishedAt ?? lastRun.startedAt) : "Aún no"}
          </p>
          {lastRun?.error ? (
            <p className="mt-1 text-xs text-red-700">{lastRun.error}</p>
          ) : null}
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Mostrando {jobs.length} de {counts.total} ofertas
        {includeExcluded ? " (incluye descartadas)" : ` con score ≥ ${minScore}`}.
      </p>

      {jobs.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-base font-semibold">
            {filtersActive
              ? "No hay ofertas con esos filtros."
              : "Todavía no hay ofertas guardadas."}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {filtersActive
              ? "Prueba con un score mínimo más bajo o limpia los filtros."
              : "Sincroniza para consultar las fuentes públicas de empleo remoto."}
          </p>
          <div className="mt-4 flex justify-center">
            <SyncButton label="Buscar ofertas ahora" />
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </>
  );
}

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ofertas remotas
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Ofertas 100% remotas para perfiles React, Next.js y frontend, ordenadas
            por afinidad con tu perfil. Revisa cada publicación y decide cuáles
            postular.
          </p>
        </div>
        <SyncButton />
      </div>

      <Suspense fallback={<JobsSkeleton />}>
        <JobsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
