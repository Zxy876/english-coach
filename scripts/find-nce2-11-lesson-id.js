// 临时脚本：查找 NCE2 第11课的 lessonId
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const lesson = await prisma.nceLesson.findFirst({
    where: { bookKey: 'NCE2', ordinal: 11 }
  });
  console.log(lesson);
  await prisma.$disconnect();
}
main();
