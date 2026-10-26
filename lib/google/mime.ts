import { randomUUID } from "node:crypto";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface EmailMessage {
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  text: string;
  attachment?: EmailAttachment;
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeHeader(value: string): string {
  const clean = sanitizeHeader(value);
  if (/^[\x20-\x7E]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=`;
}

function base64Lines(content: Buffer | string): string {
  const encoded = Buffer.isBuffer(content)
    ? content.toString("base64")
    : Buffer.from(content.replace(/\r?\n/g, "\r\n"), "utf8").toString("base64");
  return encoded.replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

export function buildRawEmail(message: EmailMessage): string {
  const boundary = `cvsend-${randomUUID()}`;
  const from = message.fromName
    ? `${encodeHeader(message.fromName)} <${sanitizeHeader(message.from)}>`
    : sanitizeHeader(message.from);
  const headers = [
    `From: ${from}`,
    `To: ${sanitizeHeader(message.to)}`,
    `Subject: ${encodeHeader(message.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ];

  const parts = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(message.text),
  ];

  if (message.attachment) {
    const filename = sanitizeHeader(message.attachment.filename).replace(/"/g, "");
    parts.push(
      `--${boundary}`,
      `Content-Type: ${message.attachment.contentType ?? "application/octet-stream"}; name="${filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${filename}"`,
      "",
      base64Lines(message.attachment.content),
    );
  }

  parts.push(`--${boundary}--`, "");
  const raw = `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}`;
  return Buffer.from(raw, "utf8").toString("base64url");
}
