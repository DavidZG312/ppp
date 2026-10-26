import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";

import {
  countApplications,
  listApplications,
  type ApplicationStatus,
} from "@/lib/applications";
import { listJobs } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { getGmailStatus } from "@/lib/google/gmail";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  error: "Error",
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  sent: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-red-200 bg-red-50 text-red-700",
};

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

async function ApplicationsContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();

  const params = await searchParams;
  const auth = first(params.auth);
  const error = first(params.error);
  const authMessage = first(params.message);
  const sent = first(params.sent) === "1";
  const gmail = await getGmailStatus();
  const counts = countApplications();
  const applications = listApplications(50);
  const sentJobIds = new Set(
    applications.filter((item) => item.status === "sent").map((item) => item.jobId),
  );
  const suggested = listJobs({ minScore: 30, limit: 20 })
    .filter((job) => !sentJobIds.has(job.id))
    .slice(0, 8);

  return (
    <>
      {sent ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Postulación enviada con Gmail. Quedó registrada en el historial.
        </div>
      ) : null}
      {auth === "ok" ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Gmail conectado correctamente. Ya puedes enviar postulaciones con el CV
          adjunto.
        </div>
      ) : null}
      {auth === "missing" ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No se encontraron credenciales de Google. Revisa la configuración de abajo.
        </div>
      ) : null}
      {auth === "error" ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          No se pudo conectar Gmail{authMessage ? `: ${authMessage}` : "."}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Borradores
          </p>
          <p className="mt-1 text-2xl font-bold">{counts.draft}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Enviadas
          </p>
          <p className="mt-1 text-2xl font-bold">{counts.sent}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Con error de envío
          </p>
          <p className="mt-1 text-2xl font-bold">{counts.error}</p>
        </div>
      </div>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Cuenta de Gmail</h2>
            <p className="mt-1 text-sm text-slate-600">
              El envío usa la API de Gmail con el permiso mínimo{" "}
              <code>gmail.send</code>. El token se guarda solo en tu equipo.
            </p>
          </div>
          {gmail.connected ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              Conectada
            </span>
          ) : (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Sin conectar
            </span>
          )}
        </div>

        {gmail.connected ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <p>Lista para enviar con el CV en PDF adjunto.</p>
            <a
              href="/api/auth/google"
              className="text-xs font-semibold text-blue-700 hover:underline"
            >
              Reconectar cuenta
            </a>
          </div>
        ) : gmail.configured ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-600">
              Credenciales encontradas. Falta autorizar la cuenta.
            </p>
            <a
              href="/api/auth/google"
              className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
            >
              Conectar Gmail
            </a>
          </div>
        ) : (
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Configuración pendiente</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Crea un proyecto en Google Cloud y habilita la Gmail API.</li>
              <li>
                Crea un cliente OAuth de tipo «Aplicación de escritorio» y descarga el
                JSON.
              </li>
              <li>
                Guárdalo como <code>credentials/client_secret.json</code> en la raíz
                del proyecto.
              </li>
              <li>
                Si usas otro puerto, define{" "}
                <code>GOOGLE_REDIRECT_URI=http://localhost:PUERTO/api/auth/google/callback</code>{" "}
                en <code>.env.local</code> y reinicia el servidor.
              </li>
              <li>Vuelve a esta página y pulsa «Conectar Gmail».</li>
            </ol>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Historial de postulaciones</h2>
          <Link href="/" className="text-xs font-semibold text-blue-700 hover:underline">
            Buscar más ofertas
          </Link>
        </div>

        {applications.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            Todavía no hay borradores ni envíos. Abre una oferta y pulsa «Preparar
            postulación».
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Oferta</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                  <th className="px-3 py-2 font-semibold">Destinatario</th>
                  <th className="px-3 py-2 font-semibold">Actualizado</th>
                  <th className="px-3 py-2 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <p className="font-medium">{application.jobTitle}</p>
                      <p className="text-xs text-slate-500">{application.jobCompany}</p>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[application.status]
                        }`}
                      >
                        {STATUS_LABELS[application.status]}
                      </span>
                      {application.error ? (
                        <p className="mt-1 max-w-xs text-xs text-red-700">
                          {application.error}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {application.recipient || "Sin destinatario"}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {formatDateTime(application.updatedAt)}
                    </td>
                    <td className="px-3 py-2 text-xs font-semibold">
                      <Link
                        href={`/postular?jobId=${application.jobId}`}
                        className="text-blue-700 hover:underline"
                      >
                        {application.status === "sent" ? "Ver envío" : "Revisar"}
                      </Link>
                      <a
                        href={application.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-3 text-slate-600 hover:underline"
                      >
                        Oferta
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Ofertas recomendadas para preparar</h2>
        {suggested.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            No hay ofertas pendientes con score suficiente. Sincroniza o baja el score
            mínimo en la página de ofertas.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {suggested.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{job.title}</p>
                  <p className="text-xs text-slate-500">
                    {job.company} · Score {job.score}
                  </p>
                </div>
                <Link
                  href={`/postular?jobId=${job.id}`}
                  className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Preparar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function ApplicationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Postulaciones</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Prepara el correo, revisa cada campo y aprueba el envío. El sistema adjunta
          el CV en PDF y registra el resultado.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="mt-6 h-96 animate-pulse rounded-xl border border-slate-200 bg-white" />
        }
      >
        <ApplicationsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
