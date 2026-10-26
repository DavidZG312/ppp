import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { buildApplicationDraft } from "@/lib/application-draft";
import { getApplication } from "@/lib/applications";
import { getJob } from "@/lib/db";
import { formatDate, formatDateTime, scopeLabel } from "@/lib/format";
import { getGmailStatus } from "@/lib/google/gmail";
import { loadProfile } from "@/lib/profile";

import { submitApplication } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

async function ApplicationContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();

  const params = await searchParams;
  const jobId = first(params.jobId);
  if (!jobId) notFound();

  const job = getJob(jobId);
  if (!job) notFound();

  const profile = await loadProfile();
  const application = getApplication(jobId);
  const gmail = await getGmailStatus();
  const error = first(params.error);
  const saved = first(params.saved) === "1";
  const sent = application?.status === "sent";
  const draft = application ?? buildApplicationDraft(job, profile);
  const mailto = `mailto:${draft.recipient}?subject=${encodeURIComponent(
    draft.subject,
  )}&body=${encodeURIComponent(draft.body)}`;

  return (
    <>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{job.title}</h2>
            <p className="text-sm font-medium text-slate-700">{job.company}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              <span>{scopeLabel(job.countryScope)}</span>
              <span>·</span>
              <span>{job.location}</span>
              <span>·</span>
              <span>{formatDate(job.publishedAt)}</span>
              <span>·</span>
              <span>Score {job.score}</span>
            </div>
          </div>
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            Ver oferta original
          </a>
        </div>
        {job.scoreReasons.length > 0 ? (
          <ul className="mt-3 space-y-1 text-xs text-slate-600">
            {job.scoreReasons.slice(0, 4).map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {sent ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Postulación enviada</p>
          <p className="mt-1">
            Para: {application.recipient} · {formatDateTime(application.sentAt)}
          </p>
          {application.messageId ? (
            <p className="mt-1 break-all text-xs">ID de Gmail: {application.messageId}</p>
          ) : null}
          <Link href="/postulaciones" className="mt-3 inline-block font-semibold underline">
            Volver a postulaciones
          </Link>
        </div>
      ) : (
        <>
          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          ) : null}
          {saved ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Borrador guardado. Todavía no se ha enviado nada.
            </div>
          ) : null}
          {application?.error && !error ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Último error de envío: {application.error}
            </div>
          ) : null}

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Revisa y aprueba el correo</h2>
              {gmail.connected ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  Gmail conectado
                </span>
              ) : (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  Gmail sin conectar
                </span>
              )}
            </div>

            {!gmail.configured ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Falta configurar Gmail.</p>
                <p className="mt-1">
                  Guarda el archivo <code>client_secret.json</code> de Google Cloud en{" "}
                  <code>credentials/</code> o define <code>GOOGLE_CLIENT_ID</code> y{" "}
                  <code>GOOGLE_CLIENT_SECRET</code> en <code>.env.local</code>.
                </p>
              </div>
            ) : !gmail.connected ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Gmail todavía no está autorizado.</p>
                <a
                  href="/api/auth/google"
                  className="mt-2 inline-block rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-900"
                >
                  Conectar Gmail
                </a>
              </div>
            ) : null}

            <form action={submitApplication} className="mt-4 space-y-4">
              <input type="hidden" name="jobId" value={job.id} />
              <label className="block text-xs font-semibold text-slate-600">
                Para
                <input
                  type="text"
                  name="to"
                  inputMode="email"
                  defaultValue={draft.recipient}
                  placeholder="reclutamiento@empresa.com"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Asunto
                <input
                  type="text"
                  name="subject"
                  defaultValue={draft.subject}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Mensaje
                <textarea
                  name="body"
                  rows={18}
                  defaultValue={draft.body}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm font-normal leading-relaxed text-slate-800"
                />
              </label>

              <p className="text-xs text-slate-500">
                Se adjuntará <code>CV-David-Zabala-Granados.pdf</code>. Si no existe,
                ejecuta <code>pnpm cv</code>.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  name="intent"
                  value="send"
                  disabled={!gmail.connected}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Enviar con Gmail
                </button>
                <button
                  type="submit"
                  name="intent"
                  value="save"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Guardar borrador
                </button>
                <a href={mailto} className="text-xs font-semibold text-blue-700 hover:underline">
                  Abrir en mi cliente de correo (sin adjunto)
                </a>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}

export default function ApplicationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Preparar postulación
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Nada se envía sin tu aprobación. Revisa el destinatario, el asunto y el
            mensaje antes de pulsar «Enviar con Gmail».
          </p>
        </div>
        <Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">
          Volver a ofertas
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="mt-6 h-96 animate-pulse rounded-xl border border-slate-200 bg-white" />
        }
      >
        <ApplicationContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
