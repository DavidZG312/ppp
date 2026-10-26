import { connection } from "next/server";

import { listJobs } from "@/lib/db";

export async function GET(request: Request) {
  await connection();

  const url = new URL(request.url);
  const search = url.searchParams.get("q") ?? undefined;
  const source = url.searchParams.get("source") ?? undefined;
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 200;
  const scoreParam = Number(url.searchParams.get("minScore"));
  const minScore = Number.isFinite(scoreParam) && scoreParam >= 0 ? scoreParam : 30;
  const includeExcluded = url.searchParams.get("includeExcluded") === "1";
  const entryOnly = url.searchParams.get("entryOnly") === "1";
  const sort = url.searchParams.get("sort") === "date" ? "date" : "score";

  const jobs = listJobs({
    search,
    source,
    limit,
    minScore,
    includeExcluded,
    entryOnly,
    sort,
  });

  return Response.json({ count: jobs.length, jobs });
}
