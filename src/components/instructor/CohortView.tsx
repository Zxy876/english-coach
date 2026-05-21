"use client";

import { useState } from "react";
import type { RemixCohortNarrative } from "@/lib/opus/prompts/remix-cohort-narrative";

export interface CohortViewProps {
  exerciseTitle: string;
  attempts: number;
  completed: number;
  averagePhaseReached: number;
  averageAlignCoverage: number | null;
  averageDriftCount: number | null;
  topMissingNodes: Array<{ nodeId: string; label: string; count: number }>;
  driftCategoryHistogram: Array<{ category: string; count: number }>;
  sampleDrifts: Array<any>;
  sampleHighPerformers: Array<any>;
  narrative: RemixCohortNarrative | null;
  narrativeError: string | null;
}

export function CohortView(props: CohortViewProps) {
  const {
    exerciseTitle,
    attempts,
    completed,
    averagePhaseReached,
    averageAlignCoverage,
    averageDriftCount,
    topMissingNodes,
    driftCategoryHistogram,
    sampleDrifts,
    sampleHighPerformers,
    narrative,
    narrativeError,
  } = props;

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">{exerciseTitle}</h1>
      <div className="mb-4 text-xs text-[#858585]">
        尝试数：{attempts}，完成数：{completed}，平均阶段：{averagePhaseReached.toFixed(2)}
        {averageAlignCoverage !== null && <>，平均覆盖率：{(averageAlignCoverage * 100).toFixed(1)}%</>}
        {averageDriftCount !== null && <>，平均 drift 数：{averageDriftCount.toFixed(2)}</>}
      </div>
      <section className="mb-6">
        <h2 className="font-semibold mb-2">缺失节点 Top</h2>
        <ul className="list-disc ml-6">
          {topMissingNodes.map((n) => (
            <li key={n.nodeId}>{n.label}（{n.count}）</li>
          ))}
        </ul>
      </section>
      <section className="mb-6">
        <h2 className="font-semibold mb-2">Drift 分类统计</h2>
        <ul className="list-disc ml-6">
          {driftCategoryHistogram.map((d) => (
            <li key={d.category}>{d.category}：{d.count}</li>
          ))}
        </ul>
      </section>
      <section className="mb-6">
        <h2 className="font-semibold mb-2">优秀样本</h2>
        <ul className="list-disc ml-6">
          {sampleHighPerformers.map((s, i) => (
            <li key={i}>学生 {s.studentId}，覆盖率：{(s.coverage * 100).toFixed(1)}%，drift 数：{s.driftCount}</li>
          ))}
        </ul>
      </section>
      <section className="mb-6">
        <h2 className="font-semibold mb-2">典型 Drift</h2>
        <ul className="list-disc ml-6">
          {sampleDrifts.map((d, i) => (
            <li key={i}>学生 {d.studentId}，{d.category}，{d.observation}</li>
          ))}
        </ul>
      </section>
      <section className="mb-6">
        <h2 className="font-semibold mb-2">Narrative</h2>
        {narrativeError ? (
          <div className="text-red-500">{narrativeError}</div>
        ) : narrative ? (
          <div>
            <div className="font-bold mb-2">{narrative.headline}</div>
            <div className="mb-2">{narrative.classSummary}</div>
            <div className="mb-2">
              <b>Drift Patterns:</b>
              <ul className="list-disc ml-6">
                {narrative.driftPatterns.map((p, i) => (
                  <li key={i}>{p.pattern}（{p.category}，{p.affectedStudents}人）<br />证据：{p.evidence}<br />建议：{p.suggestion}</li>
                ))}
              </ul>
            </div>
            {narrative.recommendedMicroLesson && (
              <div className="mb-2">
                <b>推荐微课：</b>{narrative.recommendedMicroLesson.title}<br />理由：{narrative.recommendedMicroLesson.rationale}
              </div>
            )}
            <div className="mb-2">
              <b>亮点：</b>
              <ul className="list-disc ml-6">
                {narrative.brightSpots.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div>加载中…</div>
        )}
      </section>
    </main>
  );
}
