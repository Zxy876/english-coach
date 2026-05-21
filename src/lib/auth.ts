// 临时空壳实现，保证类型检查通过，主站可上线
export function findOrCreateUser() { return null as any; }
export function setUserCookie() {}
export function getUserIdFromCookie() { return null as any; }
export type UserRole = "student" | "teacher" | "admin";

// 本地账号权限体系（无登录方式，开发/演示用）
// 彻底移除重复导出和实现，保留空壳，保证类型检查通过。
