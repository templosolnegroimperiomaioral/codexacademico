import { bigint, boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, unique, varchar } from "drizzle-orm/mysql-core";

/** Usuários autenticados pelo provedor da plataforma. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Preferências acadêmicas não sensíveis de cada estudante. */
export const academicProfiles = mysqlTable("academicProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  displayName: varchar("displayName", { length: 180 }),
  institution: varchar("institution", { length: 180 }),
  course: varchar("course", { length: 180 }),
  timezone: varchar("timezone", { length: 64 }).default("America/Sao_Paulo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Semestres ou períodos organizados por usuário. */
export const semesters = mysqlTable("semesters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 80 }).notNull(),
  startsAt: bigint("startsAt", { mode: "number" }),
  endsAt: bigint("endsAt", { mode: "number" }),
  isCurrent: boolean("isCurrent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("semester_user_idx").on(table.userId)]);

/** Disciplinas e metadados de estudo pertencentes exclusivamente a um estudante. */
export const subjects = mysqlTable("subjects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  semesterId: int("semesterId").references(() => semesters.id, { onDelete: "set null" }),
  name: varchar("name", { length: 180 }).notNull(),
  professor: varchar("professor", { length: 180 }),
  color: varchar("color", { length: 20 }).default("#C9A66B").notNull(),
  room: varchar("room", { length: 100 }),
  scheduleNote: text("scheduleNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("subject_user_idx").on(table.userId), index("subject_semester_idx").on(table.semesterId)]);

/** Aulas, provas, entregas e outros compromissos, persistidos em UTC (milissegundos). */
export const academicEvents = mysqlTable("academicEvents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectId: int("subjectId").references(() => subjects.id, { onDelete: "set null" }),
  type: mysqlEnum("type", ["class", "exam", "assignment", "presentation", "seminar", "reading", "hearing", "appointment", "other"]).default("other").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  details: text("details"),
  location: varchar("location", { length: 180 }),
  startsAt: bigint("startsAt", { mode: "number" }).notNull(),
  endsAt: bigint("endsAt", { mode: "number" }),
  source: mysqlEnum("source", ["manual", "gmail", "classroom", "calendar"]).default("manual").notNull(),
  externalId: varchar("externalId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("event_user_time_idx").on(table.userId, table.startsAt), index("event_subject_idx").on(table.subjectId)]);

/** Tarefas pessoais ou vinculadas a disciplinas, com conclusão por conta. */
export const studyTasks = mysqlTable("studyTasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectId: int("subjectId").references(() => subjects.id, { onDelete: "set null" }),
  title: varchar("title", { length: 220 }).notNull(),
  notes: text("notes"),
  dueAt: bigint("dueAt", { mode: "number" }),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  source: mysqlEnum("source", ["manual", "gmail", "classroom"]).default("manual").notNull(),
  externalId: varchar("externalId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("task_user_due_idx").on(table.userId, table.dueAt), index("task_subject_idx").on(table.subjectId)]);

/** Materiais de estudo associados a uma disciplina: links e arquivos armazenados fora do banco. */
export const studyMaterials = mysqlTable("studyMaterials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectId: int("subjectId").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 220 }).notNull(),
  type: mysqlEnum("type", ["link", "file"]).notNull(),
  externalUrl: varchar("externalUrl", { length: 2_000 }),
  storageKey: varchar("storageKey", { length: 600 }),
  storageUrl: varchar("storageUrl", { length: 800 }),
  mimeType: varchar("mimeType", { length: 160 }),
  sizeBytes: int("sizeBytes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("material_user_subject_idx").on(table.userId, table.subjectId)]);

/** Conteúdos previstos por encontro, criados manualmente ou extraídos de e-mails acadêmicos. */
export const lessonTopics = mysqlTable("lessonTopics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectId: int("subjectId").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  classEventId: int("classEventId").references(() => academicEvents.id, { onDelete: "set null" }),
  title: varchar("title", { length: 220 }).notNull(),
  details: text("details"),
  plannedFor: bigint("plannedFor", { mode: "number" }),
  source: mysqlEnum("source", ["manual", "gmail"]).default("manual").notNull(),
  sourceMessageId: varchar("sourceMessageId", { length: 255 }),
  reviewStatus: mysqlEnum("reviewStatus", ["pending", "approved", "dismissed"]).default("approved").notNull(),
  reviewedAt: bigint("reviewedAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("lesson_topic_user_date_idx").on(table.userId, table.plannedFor),
  index("lesson_topic_subject_idx").on(table.subjectId),
  unique("lesson_topic_user_message_unique").on(table.userId, table.sourceMessageId),
]);

/** Estado da conta conectada; tokens OAuth serão armazenados de forma cifrada na camada de integração. */
export const integrationConnections = mysqlTable("integrationConnections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: mysqlEnum("provider", ["gmail", "google_classroom", "google_calendar"]).notNull(),
  accountEmail: varchar("accountEmail", { length: 320 }),
  status: mysqlEnum("status", ["disconnected", "pending", "connected", "error"]).default("disconnected").notNull(),
  scopes: text("scopes"),
  tokenCipher: text("tokenCipher"),
  refreshTokenCipher: text("refreshTokenCipher"),
  tokenExpiresAt: bigint("tokenExpiresAt", { mode: "number" }),
  lastError: varchar("lastError", { length: 500 }),
  lastSyncedAt: bigint("lastSyncedAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [unique("integration_provider_user_unique").on(table.userId, table.provider)]);

/** Avisos recebidos de fontes acadêmicas conectadas; nunca armazena o corpo completo de e-mails. */
export const academicNotifications = mysqlTable("academicNotifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectId: int("subjectId").references(() => subjects.id, { onDelete: "set null" }),
  source: mysqlEnum("source", ["gmail", "classroom", "calendar", "system"]).notNull(),
  externalId: varchar("externalId", { length: 255 }),
  title: varchar("title", { length: 220 }).notNull(),
  summary: varchar("summary", { length: 600 }),
  actionUrl: varchar("actionUrl", { length: 1_500 }),
  receivedAt: bigint("receivedAt", { mode: "number" }).notNull(),
  readAt: bigint("readAt", { mode: "number" }),
  reviewStatus: mysqlEnum("reviewStatus", ["pending", "approved", "dismissed"]).default("pending").notNull(),
  reviewedAt: bigint("reviewedAt", { mode: "number" }),
  detectedStartsAt: bigint("detectedStartsAt", { mode: "number" }),
  detectedDueAt: bigint("detectedDueAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("notification_user_received_idx").on(table.userId, table.receivedAt),
  unique("notification_user_external_unique").on(table.userId, table.externalId),
]);

/** Uma agenda Heartbeat por estudante permite atualizações automáticas sem timers no servidor. */
export const integrationSyncSchedules = mysqlTable("integrationSyncSchedules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  isEnabled: boolean("isEnabled").default(false).notNull(),
  lastRunAt: bigint("lastRunAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("integration_schedule_task_idx").on(table.scheduleCronTaskUid)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
