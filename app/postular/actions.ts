"use server";

import path from "node:path";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildApplicationDraft } from "@/lib/application-draft";
import {
  getApplication,
  markApplicationError,
  markApplicationSent,
  saveDraft,
} from "@/lib/applications";
import { getJob } from "@/lib/db";
import { sendGmailMessage } from "@/lib/google/gmail";
import { GENERATED_DIR } from "@/lib/paths";
import { loadProfile } from "@/lib/profile";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CV_FILENAME = "CV-David-Zabala-Granados.pdf";

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function back(jobId: string, query: string): never {
  redirect(`/postular?jobId=${encodeURIComponent(jobId)}&${query}`);
}

function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 400);
}

export async function submitApplication(formData: FormData): Promise<void> {
  const jobId = field(formData, "jobId");
  const job = jobId ? getJob(jobId) : null;
  if (!job) {
    redirect(
      `/postulaciones?error=${encodeURIComponent(
        "La oferta ya no existe en la base de datos.",
      )}`,
    );
  }

  const profile = await loadProfile();
  const fallback = buildApplicationDraft(job, profile);
  const recipient = field(formData, "to") || fallback.recipient;
  const subject = field(formData, "subject") || fallback.subject;
  const body = field(formData, "body") || fallback.body;
  const intent = field(formData, "intent") === "send" ? "send" : "save";

  if (intent === "send") {
    if (!recipient) {
      back(jobId, `error=${encodeURIComponent("Falta el correo del destinatario.")}`);
    }
    if (!EMAIL_RE.test(recipient)) {
      back(
        jobId,
        `error=${encodeURIComponent("El correo del destinatario no es válido.")}`,
      );
    }
    if (subject.length < 3 || subject.length > 250) {
      back(
        jobId,
        `error=${encodeURIComponent("El asunto debe tener entre 3 y 250 caracteres.")}`,
      );
    }
    if (body.length < 20 || body.length > 30_000) {
      back(
        jobId,
        `error=${encodeURIComponent("El mensaje debe tener entre 20 y 30.000 caracteres.")}`,
      );
    }
  } else {
    if (subject.length > 250 || body.length > 30_000) {
      back(
        jobId,
        `error=${encodeURIComponent("El asunto o el mensaje superan el tamaño máximo.")}`,
      );
    }
  }

  const existing = getApplication(jobId);
  if (existing?.status === "sent") {
    back(jobId, `error=${encodeURIComponent("Esta postulación ya fue enviada.")}`);
  }

  saveDraft(jobId, { recipient, subject, body });

  if (intent === "save") {
    revalidatePath("/postulaciones");
    back(jobId, "saved=1");
  }

  let failure: string | null = null;
  let messageId = "";
  try {
    messageId = await sendGmailMessage({
      from: profile.email,
      fromName: profile.name,
      to: recipient,
      subject,
      text: body,
      attachmentPath: path.join(GENERATED_DIR, CV_FILENAME),
      attachmentName: CV_FILENAME,
    });
  } catch (error) {
    failure = errorMessage(error);
  }

  if (failure) {
    markApplicationError(jobId, failure);
    revalidatePath("/postulaciones");
    back(jobId, `error=${encodeURIComponent(failure)}`);
  }

  markApplicationSent(jobId, {
    recipient,
    subject,
    body,
    messageId,
  });
  revalidatePath("/");
  revalidatePath("/postulaciones");
  redirect("/postulaciones?sent=1");
}
