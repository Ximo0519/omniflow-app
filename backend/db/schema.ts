import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

/**
 * 用户表
 * - quotaRemaining: 每日生成配额（用完次日自动重置）
 * - quotaResetDate: 记录上次配额重置日期（YYYY-MM-DD）
 */
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    username: varchar('username', { length: 50 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    quotaRemaining: integer('quota_remaining').notNull().default(10),
    quotaResetDate: varchar('quota_reset_date', { length: 10 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('users_username_unique').on(table.username)],
);

/**
 * 音乐表
 * - status: generating（生成中）| completed（完成）| failed（失败）
 * - audioUrl: 转存到 R2 后的永久访问地址
 * - r2Key: R2 对象键，用于下载/删除
 */
export const music = pgTable(
  'music',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull().default(''),
    prompt: text('prompt').notNull(),
    optimizedPrompt: text('optimized_prompt'),
    tags: varchar('tags', { length: 300 }).notNull().default(''),
    mood: varchar('mood', { length: 50 }).notNull().default(''),
    instrumental: integer('instrumental').notNull().default(1),
    duration: integer('duration'),
    status: varchar('status', { length: 20 }).notNull().default('generating'),
    failReason: text('fail_reason'),
    sunoTaskId: varchar('suno_task_id', { length: 100 }),
    audioUrl: text('audio_url'),
    r2Key: text('r2_key'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [index('music_user_idx').on(table.userId)],
);

/**
 * 广场分享表
 * - 音乐分享：musicId 非空，冗余 title/audioUrl/promptText 便于渲染（删除音乐不影响已分享帖子）
 * - 提示词分享：musicId 为空，必填 promptText
 */
export const shares = pgTable(
  'shares',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    musicId: integer('music_id').references(() => music.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull().default(''),
    promptText: text('prompt_text').notNull().default(''),
    audioUrl: text('audio_url'),
    authorName: varchar('author_name', { length: 50 }).notNull(),
    likesCount: integer('likes_count').notNull().default(0),
    playsCount: integer('plays_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull().defaultNow(),
  },
  (table) => [index('shares_created_idx').on(table.createdAt)],
);

/**
 * 点赞表（同一用户对同一帖子只能赞一次）
 */
export const likes = pgTable(
  'likes',
  {
    id: serial('id').primaryKey(),
    shareId: integer('share_id')
      .notNull()
      .references(() => shares.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('likes_share_user_unique').on(table.shareId, table.userId)],
);

export type User = typeof users.$inferSelect;
export type Music = typeof music.$inferSelect;
export type Share = typeof shares.$inferSelect;
