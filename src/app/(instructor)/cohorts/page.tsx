
import { listCohortCards } from "@/lib/remix/cohort";
import { CohortsOverview } from "@/components/instructor/CohortsOverview";

export const dynamic = "force-dynamic";

export default async function Page() {
  const cards = await listCohortCards();
  return <CohortsOverview summaries={cards} />;
}
