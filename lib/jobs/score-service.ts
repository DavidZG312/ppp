import { listAllJobsForScoring, updateJobScores } from "../db";
import { loadProfile } from "../profile";
import { scoreJob } from "./score";

export interface ScoringSummary {
  scored: number;
  excluded: number;
}

export async function scoreAllJobs(): Promise<ScoringSummary> {
  const profile = await loadProfile();
  const jobs = listAllJobsForScoring();

  const updates = jobs.map((job) => {
    const result = scoreJob(job, profile);
    return {
      id: job.id,
      score: result.score,
      reasons: result.reasons,
      flags: result.flags,
      excludedReason: result.excludedReason,
    };
  });

  updateJobScores(updates);

  return {
    scored: updates.length,
    excluded: updates.filter((update) => update.excludedReason !== null).length,
  };
}
