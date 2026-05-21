// 教师点评/批改能力 API
import { prisma } from "@/lib/db";

// remixReview 相关功能暂未上线，主线构建保留空实现
export async function createRemixReview(_args?: unknown) {
  throw new Error("remixReview 未实现");
}

export async function listRemixReviews(_remixSessionId?: string) {
  return [];
}
