import { Suspense } from "react";
import { connection } from "next/server";

import { countJobs, listSyncRuns } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { SOURCES } from "@/lib/jobs/sync";

import { SyncButton } from "../components/sync-button";

async function SourcesContent() {
  await connection();
  const runs = listSyncRuns(30);
  const counts = countJobs();

  return (
    <>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Fuentes configuradas
          </p>
          <p className="mt-1 text-2xl font-bold">{SOURCES.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ofertas en base
          </p>
          <p className="mt-1 text-2xl font-bold">{counts.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sincronizaciones registradas
          </p>
          <p className="mt-1 text-2xl font-bold">{runs.length}</p>
        </div>
      </div>

      <section className="mt-6 grid gap-3 md:grid-cols-2">
        {SOURCES.map((source) => (
          <div
            key={source.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{source.name}</h2>
                <p className="text-xs text-slate-500">{source.id}</p>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                Activa
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {source.attribution ?? "API pública sin autenticación."}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Historial de sincronizaciones</h2>
        </div>
        {runs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-600">
            Aún no hay sincronizaciones. Usa el botón de la derecha para comenzar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Fuente</th>
                  <th className="px-4 py-2 font-semibold">Inicio</th>
                  <th className="px-4 py-2 font-semibold">Fin</th>
                  <th className="px-4 py-2 text-right font-semibold">Obtenidas</th>
                  <th className="px-4 py-2 text-right font-semibold">Nuevas</th>
                  <th className="px-4 py-2 text-right font-semibold">Actualizadas</th>
                  <th className="px-4 py-2 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium">{run.source}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {formatDateTime(run.startedAt)}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {formatDateTime(run.finishedAt)}
                    </td>
                    <td className="px-4 py-2 text-right">{run.fetched}</td>
                    <td className="px-4 py-2 text-right">{run.inserted}</td>
                    <td className="px-4 py-2 text-right">{run.updated}</td>
                    <td className="px-4 py-2">
                      {run.error ? (
                        <span className="text-xs font-medium text-red-700">
                          Error: {run.error}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-emerald-700">
                          Correcta
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export default function SourcesPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Fuentes</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            APIs y RSS públicos configurados. Sin scraping de portales que
            prohíben la automatización.
          </p>
        </div>
        <SyncButton />
      </div>

      <Suspense
        fallback={<div className="mt-6 h-96 animate-pulse rounded-xl border border-slate-200 bg-white" />}
      >
        <SourcesContent />
      </Suspense>
    </main>
  );
}
