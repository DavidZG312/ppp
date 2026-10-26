import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { z } from "zod";

import { PROFILE_PATH } from "./paths";

const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Usa el formato YYYY-MM");

const experienceSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().min(1),
  start: monthSchema,
  end: monthSchema.nullable(),
  current: z.boolean().default(false),
  parallel: z.boolean().default(false),
  note: z.string().optional(),
  stack: z.array(z.string()).default([]),
  bullets: z.array(z.string().min(1)).min(1),
});

const educationSchema = z.object({
  institution: z.string().min(1),
  program: z.string().min(1),
  kind: z.string().min(1),
  location: z.string().min(1),
  start: monthSchema,
  end: monthSchema.nullable(),
  note: z.string().optional(),
});

const skillGroupSchema = z.object({
  label: z.string().min(1),
  items: z.array(z.string().min(1)).min(1),
});

const languageSchema = z.object({
  language: z.string().min(1),
  level: z.string().min(1),
  note: z.string().optional(),
});

const preferencesSchema = z.object({
  remoteOnly: z.boolean(),
  targetRoles: z.array(z.string()).default([]),
  markets: z.array(z.string()).default([]),
  salary: z.string().optional(),
  seniority: z.array(z.string()).default([]),
  includeKeywords: z.array(z.string()).default([]),
  excludeKeywords: z.array(z.string()).default([]),
  minScore: z.number().min(0).max(100).default(45),
});

export const profileSchema = z.object({
  name: z.string().min(1),
  headline: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  location: z.string().min(1),
  linkedin: z.string().url().optional(),
  workMode: z.string().default("100% remoto"),
  availability: z.string().optional(),
  summary: z.string().min(1),
  experience: z.array(experienceSchema).min(1),
  education: z.array(educationSchema).default([]),
  skills: z.array(skillGroupSchema).default([]),
  languages: z.array(languageSchema).default([]),
  preferences: preferencesSchema,
});

export type Profile = z.infer<typeof profileSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type SkillGroup = z.infer<typeof skillGroupSchema>;

export async function loadProfile(): Promise<Profile> {
  const raw = await readFile(PROFILE_PATH, "utf8");
  const parsed = parse(raw);
  return profileSchema.parse(parsed);
}

const MONTHS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

export function formatMonth(value: string | null): string {
  if (!value) return "Actualidad";
  const [year, month] = value.split("-");
  const index = Number(month) - 1;
  return `${MONTHS_ES[index] ?? month} ${year}`;
}

export function formatRange(
  start: string,
  end: string | null,
  current = false,
): string {
  return `${formatMonth(start)} — ${current ? "Actualidad" : formatMonth(end)}`;
}
