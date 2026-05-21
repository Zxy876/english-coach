// NCE 四册内容全量导入脚本
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";

async function main() {
  const dataPath = path.resolve("../../ NCE /NCE/data.json");
  const raw = fs.readFileSync(dataPath, "utf-8");
  const data = JSON.parse(raw);
  for (const book of data.books) {
    await prisma.nceBook.upsert({
      where: { key: book.key },
      update: { title: book.title, bookPath: book.bookPath },
      create: { key: book.key, title: book.title, bookPath: book.bookPath },
    });
  }
  console.log("NCE books imported.");
}

main().then(() => process.exit(0));
