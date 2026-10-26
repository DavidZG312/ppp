import type { Profile } from "../profile";
import { formatRange } from "../profile";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STYLES = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5pt;
    line-height: 1.42;
    color: #1a1a1a;
  }
  header { margin-bottom: 14px; }
  h1 {
    margin: 0 0 2px;
    font-size: 21pt;
    line-height: 1.1;
    letter-spacing: 0.2px;
  }
  .headline {
    margin: 0 0 7px;
    font-size: 11pt;
    font-weight: 700;
    color: #2b4a6f;
  }
  .contact, .availability {
    margin: 0 0 3px;
    font-size: 9.5pt;
    color: #333;
  }
  .contact a { color: #1a1a1a; text-decoration: none; }
  section { margin-top: 14px; }
  h2 {
    margin: 0 0 7px;
    padding-bottom: 3px;
    border-bottom: 1px solid #b9c4d0;
    font-size: 10.5pt;
    letter-spacing: 1.1px;
    text-transform: uppercase;
    color: #2b4a6f;
  }
  p { margin: 0; }
  .summary { text-align: justify; }
  .job, .study { margin-bottom: 12px; break-inside: avoid; }
  .job:last-child, .study:last-child { margin-bottom: 0; }
  .job-title {
    margin: 0;
    font-size: 10.8pt;
    font-weight: 700;
  }
  .job-meta, .study-meta {
    margin: 1px 0 4px;
    font-size: 9.5pt;
    color: #444;
  }
  .job-note {
    margin: 0 0 4px;
    font-size: 9pt;
    font-style: italic;
    color: #555;
  }
  ul { margin: 0; padding-left: 17px; }
  li { margin: 0 0 2.5px; }
  .stack { margin-top: 4px; font-size: 9.5pt; color: #333; }
  .stack strong { color: #1a1a1a; }
  .skills p { margin: 0 0 3px; }
  .skills strong { color: #1a1a1a; }
  .languages { margin: 0; padding-left: 0; list-style: none; }
  @page { size: A4; }
`;

function contactLine(profile: Profile): string {
  const parts = [
    escapeHtml(profile.email),
    escapeHtml(profile.phone),
    escapeHtml(profile.location),
  ];
  if (profile.linkedin) {
    parts.push(
      `<a href="${escapeHtml(profile.linkedin)}">${escapeHtml(
        profile.linkedin.replace(/^https?:\/\/(www\.)?/, ""),
      )}</a>`,
    );
  }
  return parts.join(" &nbsp;·&nbsp; ");
}

export function renderCvHtml(profile: Profile): string {
  const experience = profile.experience
    .map((job) => {
      const dates = formatRange(job.start, job.end, job.current);
      const bullets = job.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("");
      const stack =
        job.stack.length > 0
          ? `<p class="stack"><strong>Stack:</strong> ${job.stack.map(escapeHtml).join(" · ")}</p>`
          : "";
      const note = job.note ? `<p class="job-note">${escapeHtml(job.note)}</p>` : "";

      return `
        <article class="job">
          <p class="job-title">${escapeHtml(job.role)} — ${escapeHtml(job.company)}</p>
          <p class="job-meta">${escapeHtml(dates)} &nbsp;·&nbsp; ${escapeHtml(job.location)}</p>
          ${note}
          <ul>${bullets}</ul>
          ${stack}
        </article>`;
    })
    .join("");

  const education = profile.education
    .map((study) => {
      const dates = formatRange(study.start, study.end, false);
      const note = study.note ? ` — ${escapeHtml(study.note)}` : "";
      return `
        <article class="study">
          <p class="job-title">${escapeHtml(study.program)}</p>
          <p class="study-meta">${escapeHtml(study.institution)} &nbsp;·&nbsp; ${escapeHtml(
            study.location,
          )} &nbsp;·&nbsp; ${escapeHtml(dates)}</p>
          <p class="job-meta">${escapeHtml(study.kind)}${note}</p>
        </article>`;
    })
    .join("");

  const skills = profile.skills
    .map(
      (group) =>
        `<p><strong>${escapeHtml(group.label)}:</strong> ${group.items
          .map(escapeHtml)
          .join(" · ")}</p>`,
    )
    .join("");

  const languages = profile.languages
    .map((language) => {
      const note = language.note ? ` (${escapeHtml(language.note)})` : "";
      return `<li><strong>${escapeHtml(language.language)}:</strong> ${escapeHtml(
        language.level,
      )}${note}</li>`;
    })
    .join("");

  const availability = profile.availability
    ? `<p class="availability">${escapeHtml(profile.workMode)} &nbsp;·&nbsp; ${escapeHtml(
        profile.availability,
      )}</p>`
    : `<p class="availability">${escapeHtml(profile.workMode)}</p>`;

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(profile.name)} — ${escapeHtml(profile.headline)}</title>
  <style>${STYLES}</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(profile.name)}</h1>
    <p class="headline">${escapeHtml(profile.headline)}</p>
    <p class="contact">${contactLine(profile)}</p>
    ${availability}
  </header>

  <section>
    <h2>Perfil profesional</h2>
    <p class="summary">${escapeHtml(profile.summary)}</p>
  </section>

  <section>
    <h2>Experiencia profesional</h2>
    ${experience}
  </section>

  <section class="skills">
    <h2>Habilidades técnicas</h2>
    ${skills}
  </section>

  <section>
    <h2>Educación</h2>
    ${education || "<p>—</p>"}
  </section>

  <section>
    <h2>Idiomas</h2>
    <ul class="languages">${languages}</ul>
  </section>
</body>
</html>`;
}
