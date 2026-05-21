
import { notFound } from "next/navigation";
import { buildCohortDigest } from "@/lib/remix/cohort";
import { callOpusAndParse } from "@/lib/opus/client";
import {
  REMIX_COHORT_NARRATIVE_SYSTEM,
  RemixCohortNarrativeSchema,
  buildRemixCohortNarrativeUserMessage,
} from "@/lib/opus/prompts/remix-cohort-narrative";
import { CohortView } from "@/components/instructor/CohortView";

export const dynamic = "force-dynamic";

export default async function Page(ctx: { params: Promise<{ exerciseId: string }> }) {
  const { exerciseId } = await ctx.params;
  const digest = await buildCohortDigest(exerciseId);
  if (!digest) notFound();

  let narrative = null;
  let narrativeError = null;
  if (digest.attempts === 0) {
    narrativeError = "No sessions yet for this exercise.";
  } else {
    try {
      narrative = await callOpusAndParse({
        promptName: "remix-cohort-narrative",
        system: REMIX_COHORT_NARRATIVE_SYSTEM,
        messages: [{ role: "user", content: buildRemixCohortNarrativeUserMessage(digest) }],
        schema: RemixCohortNarrativeSchema,
        maxTokens: 1800,
      });
    } catch (err) {
      narrativeError = err instanceof Error ? err.message : "narrative unavailable";
    }
  }

  return (
    <CohortView
      exerciseTitle={digest.exerciseTitle}
      attempts={digest.attempts}
      completed={digest.completed}
      averagePhaseReached={digest.averagePhaseReached}
      averageAlignCoverage={digest.averageAlignCoverage}
      averageDriftCount={digest.averageDriftCount}
      topMissingNodes={digest.topMissingNodes}
      driftCategoryHistogram={digest.driftCategoryHistogram}
      sampleDrifts={digest.sampleDrifts}
      sampleHighPerformers={digest.sampleHighPerformers}
      narrative={narrative}
      narrativeError={narrativeError}
    />
  );
}
