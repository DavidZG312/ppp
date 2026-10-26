import { connection } from "next/server";

import { getGmailStatus } from "@/lib/google/gmail";

export async function GET() {
  await connection();
  const status = await getGmailStatus();
  return Response.json(status);
}
