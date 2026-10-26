import type { Profile } from "../profile";
import type { JobRecord } from "./types";

export interface JobScore {
  score: number;
  reasons: string[];
  flags: string[];
  excludedReason: string | null;
}

const ROLE_TITLE_RE =
  /\b(developer|desarrollador(?:a)?|programador(?:a)?|engineer|frontend|front[- ]end|full[- ]?stack|react|next\.?js|web developer|software)\b/i;

const FRONTEND_TITLE_RE =
  /\b(frontend|front[- ]end|full[- ]?stack|react|next\.?js|web developer|web engineer|typescript|javascript)\b/i;

const OFF_ROLE_TITLE_RE =
  /\b(data scientist|data engineer|analytics engineer|machine learning|ml engineer|ai research|security|devops|sre|site reliability|platform engineer|python|ruby|java|golang|rust|php|kubernetes|linux|qa|test engineer|sales|marketing|designer|recruiter|manager|management|director|legal|finance|accountant|support|assistant|strategist|writer|copywriter|analyst|scientist)\b/i;

const DEV_BODY_RE =
  /\b(react(?:js)?|next\.?js|typescript|javascript|frontend|front[- ]end|full[- ]?stack|tailwind|node\.?js|html5?|css3?)\b/i;

const SENIOR_TITLE_RE =
  /\b(senior|sr\.?|lead|staff|principal|head of|head|architect|director|manager|vp|chief|supervisor)\b/i;

const ENTRY_RE =
  /\b(junior|jr\.?|trainee|entry[- ]level|graduate|new grad|intern(?:ship)?|practicante|aprendiz)\b/i;

const NO_EXPERIENCE_RE =
  /\b(no experience required|no previous experience|no experience necessary|sin experiencia)\b/i;

const HYBRID_RE = /\b(hybrid|presencial|on[- ]?site|office[- ]based)\b/i;

const ENGLISH_REQUIRED_RE =
  /(fluent|advanced|c1|c2|native)[^.\n]{0,40}\benglish\b|\benglish\b[^.\n]{0,40}(fluent|advanced|c1|c2|native)/i;

const SPANISH_RE = /(español|spanish|castellano)/i;

const LEARNING_RE =
  /(mentor|mentoring|training|capacitaci[oó]n|learning|learn|growth|aprender|desarrollo profesional)/i;

const LOCATION_SCORE: Record<JobRecord["countryScope"], number> = {
  worldwide: 15,
  latam: 15,
  americas: 14,
  colombia: 15,
  mexico: 13,
  spain: 12,
  europe: 8,
  usa: 7,
  africa: 5,
  asia: 5,
  oceania: 5,
  unknown: 9,
};

function daysSince(value: string | null): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

function experienceYears(text: string): number | null {
  const match = text.match(
    /(\d{1,2})\+?\s*(?:years?|años?)\s+(?:of\s+)?(?:professional\s+)?(?:experience|experiencia)/i,
  );
  if (!match) return null;
  const years = Number.parseInt(match[1], 10);
  return Number.isFinite(years) ? years : null;
}

export function scoreJob(job: JobRecord, profile: Profile): JobScore {
  const reasons: string[] = [];
  const flags: string[] = [];
  const text = `${job.title}\n${job.location}\n${job.tags.join(" ")}\n${job.description}`;
  const lower = text.toLowerCase();
  const age = daysSince(job.publishedAt);
  const entryFriendly = ENTRY_RE.test(job.title) || NO_EXPERIENCE_RE.test(text);
  const seniorTitle = SENIOR_TITLE_RE.test(job.title);
  const years = experienceYears(text);

  if (!job.remote) {
    return {
      score: 0,
      reasons: [],
      flags,
      excludedReason: "La oferta no es 100% remota.",
    };
  }

  if (HYBRID_RE.test(`${job.title} ${job.location}`)) {
    return {
      score: 0,
      reasons: [],
      flags,
      excludedReason: "La modalidad parece híbrida o presencial.",
    };
  }

  if (!ROLE_TITLE_RE.test(job.title)) {
    return {
      score: 0,
      reasons: [],
      flags,
      excludedReason: "El título no corresponde a un rol de desarrollo.",
    };
  }

  if (OFF_ROLE_TITLE_RE.test(job.title) && !FRONTEND_TITLE_RE.test(job.title)) {
    return {
      score: 0,
      reasons: [],
      flags,
      excludedReason: "El título apunta a un rol no frontend (datos, infraestructura, gestión u otro).",
    };
  }

  if (!FRONTEND_TITLE_RE.test(job.title) && !DEV_BODY_RE.test(text)) {
    return {
      score: 0,
      reasons: [],
      flags,
      excludedReason: "No hay señales claras de frontend en el título ni en la descripción.",
    };
  }

  if (seniorTitle) {
    return {
      score: 0,
      reasons: [],
      flags,
      excludedReason: "El título pide seniority senior/lead/management; no encaja con el perfil.",
    };
  }

  if (age !== null && age > 60) {
    return {
      score: 0,
      reasons: [],
      flags,
      excludedReason: `Oferta publicada hace ${age} días (más de 60).`,
    };
  }

  if (/(unpaid|sin remuneraci[oó]n|trabajo gratuito|comisi[oó]n)/i.test(lower)) {
    return {
      score: 0,
      reasons: [],
      flags,
      excludedReason: "La oferta menciona trabajo sin remuneración o solo comisión.",
    };
  }

  const excludeHit = profile.preferences.excludeKeywords.find((keyword) => {
    const value = keyword.trim().toLowerCase();
    const header = `${job.title}\n${job.location}`.toLowerCase();
    return value.length > 0 && header.includes(value);
  });
  if (excludeHit) {
    return {
      score: 0,
      reasons: [],
      flags,
      excludedReason: `Contiene un término descartado en tus preferencias: "${excludeHit}".`,
    };
  }

  if (entryFriendly) flags.push("entry-friendly");
  if (/\b(frontend|front[- ]end|react|next\.?js)\b/i.test(job.title)) {
    flags.push("frontend");
  }
  if (job.countryScope === "worldwide" || job.countryScope === "latam" || job.countryScope === "americas") {
    flags.push("global");
  }
  if (job.countryScope === "usa") flags.push("needs-work-auth");
  if (SPANISH_RE.test(text) || ["spain", "latam", "colombia", "mexico"].includes(job.countryScope)) {
    flags.push("spanish-friendly");
  }

  const stack: string[] = [];
  let stackPoints = 0;
  if (/\breact(?:\.js|js)?\b/.test(lower)) {
    stack.push("React");
    stackPoints += 12;
  }
  if (/\bnext\.?js\b/.test(lower)) {
    stack.push("Next.js");
    stackPoints += 10;
  }
  if (/\btypescript\b/.test(lower)) {
    stack.push("TypeScript");
    stackPoints += 8;
  }
  if (/\bjavascript\b/.test(lower)) {
    stack.push("JavaScript");
    stackPoints += 4;
  }
  if (/\bfront[- ]?end\b/.test(lower)) {
    stack.push("Frontend");
    stackPoints += 6;
  }
  if (/\bfull[- ]?stack\b/.test(lower)) {
    stack.push("Full stack");
    stackPoints += 3;
  }
  if (/\bnode\.?js\b/.test(lower)) {
    stack.push("Node.js");
    stackPoints += 3;
  }
  if (/\btailwind\b/.test(lower)) {
    stack.push("Tailwind");
    stackPoints += 2;
  }
  const stackScore = Math.min(stackPoints, 35);

  let seniorityScore = 14;
  if (entryFriendly) {
    seniorityScore = 20;
    reasons.push("Nivel junior/entry: puedes aplicar aunque pidan poca experiencia.");
  } else if (years !== null) {
    if (years <= 2) {
      seniorityScore = 20;
      reasons.push(`Pide ${years} años de experiencia: dentro de tu rango.`);
    } else if (years <= 4) {
      seniorityScore = 16;
      reasons.push(`Pide ${years} años de experiencia: tu perfil está cerca.`);
    } else if (years <= 6) {
      seniorityScore = 8;
      reasons.push(`Pide ${years} años: puede ser exigente, pero vale intentarlo.`);
    } else {
      seniorityScore = 2;
      reasons.push(`Pide ${years} años: seniority alto para el perfil.`);
    }
  } else {
    reasons.push("No se indica un mínimo claro de años de experiencia.");
  }

  if (stack.length > 0) {
    reasons.unshift(`Coincidencia de stack: ${[...new Set(stack)].join(", ")}.`);
  } else {
    reasons.push("El stack no coincide claramente con React/Next.js.");
  }

  const locationScore = LOCATION_SCORE[job.countryScope] ?? 9;
  if (job.countryScope === "usa") {
    reasons.push("Restringida a EE. UU./Canadá: puede exigir autorización de trabajo.");
  } else if (["worldwide", "latam", "americas", "colombia", "mexico"].includes(job.countryScope)) {
    reasons.push(`Ubicación compatible: ${job.location || "remoto global"}.`);
  } else if (job.countryScope === "spain") {
    reasons.push("Remoto desde España: revisa si exige residencia fiscal allí.");
  }

  const salaryScore = job.salary && !/^0(?:[.,]0+)?$/.test(job.salary.trim()) ? 10 : 4;
  if (salaryScore === 10) reasons.push(`Salario publicado: ${job.salary}.`);

  let recencyScore = 4;
  if (age !== null) {
    if (age <= 7) recencyScore = 10;
    else if (age <= 14) recencyScore = 7;
    else if (age <= 30) recencyScore = 5;
    else if (age <= 60) recencyScore = 2;
    if (age <= 14) {
      reasons.push(age === 0 ? "Publicada hoy." : `Publicada hace ${age} días.`);
    }
  }

  let learningScore = entryFriendly ? 6 : 2;
  if (LEARNING_RE.test(lower)) {
    learningScore += 4;
    reasons.push("Menciona aprendizaje, mentoría o crecimiento.");
  }
  learningScore = Math.min(learningScore, 10);

  let englishPenalty = 0;
  if (ENGLISH_REQUIRED_RE.test(text)) {
    englishPenalty = 5;
    flags.push("english-required");
    reasons.push("Pide inglés fluido/avanzado; tu nivel actual es B1 y estás preparándote.");
  }

  if (job.salary) flags.push("salary-listed");

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        stackScore +
          seniorityScore +
          locationScore +
          salaryScore +
          recencyScore +
          learningScore -
          englishPenalty,
      ),
    ),
  );

  return {
    score,
    reasons: [...new Set(reasons)].slice(0, 7),
    flags: [...new Set(flags)],
    excludedReason: null,
  };
}
