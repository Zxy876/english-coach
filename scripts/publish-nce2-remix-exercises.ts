// 批量补齐 NCE2 相关 remixExercise 的 publishedAt 字段，确保页面可见
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const now = new Date();
  const updated = await prisma.remixExercise.updateMany({
    where: {
      lesson: { bookKey: "NCE2" },
      publishedAt: null,
    },
    data: { publishedAt: now },
  });
  console.log(`已补齐 NCE2 remix 练习 publishedAt 字段，受影响条数: ${updated.count}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
