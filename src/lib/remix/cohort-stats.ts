// Cohort 统计能力：全局/分班/分作业/风格/剧情聚合
import { prisma } from "@/lib/db";


export async function getGlobalCohortStats() {
  // 全局统计：总学生数、作业数、提交数、完成数、平均阶段、drift 分类分布
  const [studentIds, exerciseCount, sessionCount, completedCount, avgPhase] = await Promise.all([
    prisma.remixSession.findMany({ select: { studentId: true }, distinct: ["studentId"] }).then((arr: Array<{ studentId: string }>) => arr.length),
    prisma.remixExercise.count(),
    prisma.remixSession.count(),
    prisma.remixSession.count({ where: { completedAt: { not: null } } }),
    prisma.remixSession.aggregate({ _avg: { currentPhase: true } }),
  ]);
  const driftCats = await prisma.remixSession.findMany({ select: { driftData: true } });
  const driftHist = new Map<string, number>();
  for (const s of driftCats) {
    const drift = s.driftData as { drifts: Array<{ category: string }> } | null;
    if (!drift) continue;
    for (const d of drift.drifts) {
      driftHist.set(d.category, (driftHist.get(d.category) ?? 0) + 1);
    }
  }
  return {
    studentCount: studentIds,
    exerciseCount,
    sessionCount,
    completedCount,
    avgPhase: avgPhase._avg.currentPhase ?? 0,
    driftCategoryHistogram: [...driftHist.entries()].map(([category, count]) => ({ category, count })),
  };
}

// 可扩展：分班/分作业/分风格/剧情统计
