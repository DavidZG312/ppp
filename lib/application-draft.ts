import type { Profile } from "./profile";
import type { JobRecord } from "./jobs/types";

export interface ApplicationDraft {
  recipient: string;
  subject: string;
  body: string;
}

function looksSpanish(job: JobRecord): boolean {
  if (["spain", "latam", "colombia", "mexico"].includes(job.countryScope)) {
    return true;
  }

  const text = `${job.title}\n${job.description}`.toLowerCase();
  const spanish = (
    text.match(
      /\b(experiencia|buscamos|requisitos|conocimientos|empresa|equipo|desarrollador|remoto|salario|postulación)\b/g,
    ) ?? []
  ).length;
  const english = (
    text.match(
      /\b(experience|requirements|we are|team|developer|remote|salary|you will|responsibilities)\b/g,
    ) ?? []
  ).length;

  return spanish > english;
}

function stackLine(job: JobRecord, lang: "es" | "en"): string {
  const text = `${job.title}\n${job.tags.join(" ")}\n${job.description}`.toLowerCase();
  const matches: string[] = [];
  if (/\breact(?:\.js|js)?\b/.test(text)) matches.push("React.js");
  if (/\bnext\.?js\b/.test(text)) matches.push("Next.js");
  if (/\btypescript\b/.test(text)) matches.push("TypeScript");
  if (/\bnode\.?js\b/.test(text)) matches.push("Node.js");

  const stack = matches.length > 0 ? matches.slice(0, 3).join(", ") : "React.js, Next.js y TypeScript";

  if (lang === "es") {
    return `Trabajo con ${stack}, integrando APIs REST y construyendo interfaces accesibles, responsivas y mantenibles, con foco en código limpio y componentes reutilizables.`;
  }
  return `I work with ${stack}, integrating REST APIs and building accessible, responsive, and maintainable interfaces, with a focus on clean code and reusable components.`;
}

function contactBlock(profile: Profile): string {
  return [
    profile.name,
    profile.phone,
    profile.email,
    profile.linkedin ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildApplicationDraft(job: JobRecord, profile: Profile): ApplicationDraft {
  const lang = looksSpanish(job) ? "es" : "en";
  const recipient = job.contactEmail ?? "";
  const remoteNote =
    lang === "es"
      ? "La modalidad 100% remota y el trabajo con equipos distribuidos encajan con mi experiencia."
      : "The fully remote setup and distributed teamwork match my experience.";
  const highlight = `${stackLine(job, lang)}\n\n${remoteNote}`;

  if (lang === "es") {
    return {
      recipient,
      subject: `Postulación — ${job.title} (${profile.name})`,
      body: `Hola,

Me interesa la vacante de ${job.title} en ${job.company}. Soy ${profile.headline}, con experiencia en el desarrollo de interfaces y aplicaciones web modernas.

${highlight}

Adjunto mi hoja de vida en PDF para que puedan revisar mi perfil con más detalle. Estoy disponible para conversar cuando lo consideren conveniente.

Saludos cordiales,
${contactBlock(profile)}`,
    };
  }

  return {
    recipient,
    subject: `Application — ${job.title} (${profile.name})`,
    body: `Hello,

I am interested in the ${job.title} role at ${job.company}. I am a Frontend Developer focused on React.js, Next.js, and TypeScript, with experience building modern web interfaces and applications.

${highlight}

I have attached my CV in PDF for more detail. I am available for a conversation whenever it suits your team.

Best regards,
${contactBlock(profile)}`,
  };
}
