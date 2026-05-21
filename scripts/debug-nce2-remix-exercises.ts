// 输出所有 NCE2 相关 remix 练习的 title、publishedAt、lessonId，辅助排查
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const exercises = await prisma.remixExercise.findMany({
    where: {
      lesson: { bookKey: "NCE2" },
    },
    include: { lesson: true },
  });
  if (exercises.length === 0) {
    console.log("无 NCE2 相关 remix 练习数据");
  } else {
    for (const ex of exercises) {
      console.log(`${ex.title} | publishedAt: ${ex.publishedAt} | lessonId: ${ex.lessonId}`);
    }
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
