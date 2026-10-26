import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";

import { formatRange, loadProfile } from "@/lib/profile";

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
      {children}
    </h2>
  );
}

async function ProfileContent() {
  await connection();
  const profile = await loadProfile();

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle>Perfil profesional</SectionTitle>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{profile.summary}</p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle>Experiencia</SectionTitle>
          <div className="mt-3 space-y-4">
            {profile.experience.map((job) => (
              <article key={`${job.company}-${job.start}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">
                    {job.role} — {job.company}
                  </h3>
                  <span className="text-xs font-medium text-slate-500">
                    {formatRange(job.start, job.end, job.current)}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{job.location}</p>
                {job.note ? (
                  <p className="text-xs italic text-slate-500">{job.note}</p>
                ) : null}
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {job.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                {job.stack.length > 0 ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Stack: {job.stack.join(" · ")}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle>Habilidades</SectionTitle>
          <div className="mt-3 space-y-2">
            {profile.skills.map((group) => (
              <p key={group.label} className="text-sm text-slate-700">
                <span className="font-semibold">{group.label}:</span>{" "}
                {group.items.join(" · ")}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle>Educación e idiomas</SectionTitle>
          {profile.education.map((study) => (
            <div key={`${study.institution}-${study.start}`} className="mt-3">
              <p className="font-semibold">{study.program}</p>
              <p className="text-sm text-slate-600">
                {study.institution} · {study.location} ·{" "}
                {formatRange(study.start, study.end, false)}
              </p>
              <p className="text-xs text-slate-500">
                {study.kind}
                {study.note ? ` — ${study.note}` : ""}
              </p>
            </div>
          ))}
          <ul className="mt-4 space-y-1 text-sm text-slate-700">
            {profile.languages.map((language) => (
              <li key={language.language}>
                <span className="font-semibold">{language.language}:</span>{" "}
                {language.level}
                {language.note ? ` (${language.note})` : ""}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle>Datos de contacto</SectionTitle>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nombre
              </dt>
              <dd className="font-semibold">{profile.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Correo
              </dt>
              <dd className="break-all text-slate-700">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Teléfono
              </dt>
              <dd className="text-slate-700">{profile.phone}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ubicación
              </dt>
              <dd className="text-slate-700">{profile.location}</dd>
            </div>
            {profile.linkedin ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  LinkedIn
                </dt>
                <dd>
                  <a
                    href={profile.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-blue-700 hover:underline"
                  >
                    {profile.linkedin.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p>
              <span className="font-semibold">{profile.workMode}</span>
              {profile.availability ? ` · ${profile.availability}` : ""}
            </p>
          </div>

          <a
            href="/api/cv"
            className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            Descargar CV base (PDF)
          </a>
          <p className="mt-2 text-xs text-slate-500">
            Formato ATS de una columna, generado desde <code>data/profile.yaml</code>.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <SectionTitle>Preferencias de búsqueda</SectionTitle>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Roles objetivo
              </dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {profile.preferences.targetRoles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                  >
                    {role}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Mercados
              </dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {profile.preferences.markets.map((market) => (
                  <span
                    key={market}
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                  >
                    {market}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Salario
              </dt>
              <dd className="text-slate-700">{profile.preferences.salary}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Palabras clave
              </dt>
              <dd className="text-slate-700">
                {profile.preferences.includeKeywords.join(" · ")}
              </dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Perfil y CV</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Esta es la fuente de verdad del CV. Las fechas de HEWTEC y Gaffel están
          marcadas como contratos en paralelo.
        </p>
      </div>

      <Suspense
        fallback={<div className="mt-6 h-96 animate-pulse rounded-xl border border-slate-200 bg-white" />}
      >
        <ProfileContent />
      </Suspense>
    </main>
  );
}
