import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || '';

if (!connectionString) {
  console.warn(
    '[db] DATABASE_URL 未配置，数据库功能不可用。请在 .env 或 Render 环境变量中设置 Neon 连接串。'
  );
}

// postgres.js 是惰性连接：无请求不会真正拨号。
// 未配置 DATABASE_URL 时用占位 DSN，保证模块导入不崩溃（所有路由在查询前都会检查 isDbConfigured）。
const queryClient = postgres(
  connectionString || 'postgres://placeholder:placeholder@127.0.0.1:5432/placeholder',
  { prepare: false, max: 5, connect_timeout: 10 }
);

export const db = drizzle(queryClient, { schema });

/** 判断数据库是否已配置（供健康检查与接口兜底使用） */
export function isDbConfigured(): boolean {
  return !!connectionString;
}

export { schema };
