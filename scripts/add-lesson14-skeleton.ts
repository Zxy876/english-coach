// 为 NCE2(85) 第14课手动添加骨架
// 在远程服务器上运行: npx tsx scripts/add-lesson14-skeleton.ts

import { PrismaClient } from "@prisma/client";

(async () => {
  const prisma = new PrismaClient();

  const skeleton = {
    scene: "A driver picks up a young man hitchhiking in southern France, and they discover they are both English after a silent journey.",
    registerLevel: "neutral" as const,
    vocabBand: "A2" as const,
    characters: [
      { name: "Narrator", role: "driver", description: "The person driving and giving a lift." },
      { name: "Young Man", role: "hitchhiker", description: "A young man asking for a ride." }
    ],
    timeline: [
      { ordinal: 1, summary: "The narrator recalls an amusing experience from last year.", sentenceOrdinals: [3] },
      { ordinal: 2, summary: "The narrator leaves a village in southern France and drives to the next town.", sentenceOrdinals: [4, 5] },
      { ordinal: 3, summary: "A young man waves and asks for a lift.", sentenceOrdinals: [6, 7, 8, 9] },
      { ordinal: 4, summary: "The narrator greets in French and the young man replies in French.", sentenceOrdinals: [10, 11, 12] },
      { ordinal: 5, summary: "The narrator admits they barely know any French.", sentenceOrdinals: [13, 14] },
      { ordinal: 6, summary: "Neither of them speaks during the journey.", sentenceOrdinals: [15] },
      { ordinal: 7, summary: "Near the town, the young man suddenly asks in English if the narrator speaks English.", sentenceOrdinals: [16, 17, 18] },
      { ordinal: 8, summary: "The narrator learns the young man is also English.", sentenceOrdinals: [19, 20] }
    ],
    plotNodes: [
      { id: "driver_on_road", label: "Driver on road", required: true, description: "The narrator is driving between towns." },
      { id: "hitchhiker_signals", label: "Hitchhiker signals", required: true, description: "A young man waves to ask for a lift." },
      { id: "driver_gives_lift", label: "Driver gives lift", required: true, description: "The driver stops and lets the young man into the car." },
      { id: "french_greeting", label: "French greeting", required: true, description: "Both greet each other in French." },
      { id: "silent_journey", label: "Silent journey", required: true, description: "Neither speaks during the ride." },
      { id: "english_revelation", label: "English revelation", required: true, description: "The young man reveals they are both English." }
    ],
    sentencePatterns: [
      { template: "Do you speak {language}?", example: "Do you speak English?" },
      { template: "I had {an/a} {adjective} {noun} {last year/last week/yesterday}?", example: "I had an amusing experience last year." },
      { template: "After I had {past participle} {noun}, I {past verb}.", example: "After I had left a small village in the south of France, I drove on to the next town." },
      { template: "As soon as {subject} had {past participle}, {subject} {past verb}.", example: "As soon as he had got into the car, I said good morning to him in French." },
      { template: "Apart from {noun}, I do not {verb} at all.", example: "Apart from a few words, I do not know any French at all." },
      { template: "Neither of us {verb} {during the journey/during the trip}.", example: "Neither of us spoke during the journey." },
      { template: "When {subject} {past verb} {adverb}, {subject} {past verb}.", example: "when the young man suddenly said very slowly, Do you speak English?" }
    ],
    styleTags: ["past-perfect", "narrative", "ironic", "past-tense", "dialogue-light"],
    model: "manual",
    extractedAt: new Date()
  };

  const result = await prisma.lessonSkeleton.upsert({
    where: { lessonId: "cmpb155rs06eht6pe8fa78npl" },
    create: { lessonId: "cmpb155rs06eht6pe8fa78npl", ...skeleton },
    update: { ...skeleton }
  });

  console.log(`✓ Skeleton ${result.lessonId === "cmpb155rs06eht6pe8fa78npl" ? "created/updated" : "error"} for NCE2(85) #14`);
  await prisma.$disconnect();
})();