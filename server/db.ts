import { and, asc, desc, eq, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  academicEvents,
  academicProfiles,
  integrationSyncSchedules,
  InsertUser,
  lessonTopics,
  semesters,
  studyMaterials,
  studyTasks,
  subjects,
  users,
} from "../drizzle/schema";
import type { EventInput, LessonTopicInput, ProfileInput, SemesterInput, SubjectInput, TaskInput } from "./academicSchemas";
import { informedGrade, nextClassOccurrences } from "./informedGrade";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import { attachesTopicToClassOnReview } from "../shared/lessonTopicReview";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new Error("Banco de dados indisponível.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAcademicDashboard(userId: number) {
  const db = await getDb();
  if (!db) return { profile: undefined, semesters: [], subjects: [], events: [], tasks: [], materials: [], lessonTopics: [] };
  const now = Date.now();
  const [profile] = await db.select().from(academicProfiles).where(eq(academicProfiles.userId, userId)).limit(1);
  const [userSemesters, userSubjects, userEvents, userTasks, userMaterials, userLessonTopics] = await Promise.all([
    db.select().from(semesters).where(eq(semesters.userId, userId)).orderBy(desc(semesters.isCurrent), desc(semesters.createdAt)),
    db.select().from(subjects).where(eq(subjects.userId, userId)).orderBy(asc(subjects.name)),
    db.select().from(academicEvents).where(and(eq(academicEvents.userId, userId), gte(academicEvents.startsAt, now - 86_400_000))).orderBy(asc(academicEvents.startsAt)).limit(20),
    db.select().from(studyTasks).where(eq(studyTasks.userId, userId)).orderBy(asc(studyTasks.isCompleted), asc(studyTasks.dueAt)).limit(30),
    db.select().from(studyMaterials).where(eq(studyMaterials.userId, userId)).orderBy(desc(studyMaterials.createdAt)).limit(50),
    db.select().from(lessonTopics).where(eq(lessonTopics.userId, userId)).orderBy(asc(lessonTopics.plannedFor), desc(lessonTopics.createdAt)).limit(80),
  ]);
  return { profile, semesters: userSemesters, subjects: userSubjects, events: userEvents, tasks: userTasks, materials: userMaterials, lessonTopics: userLessonTopics };
}

async function assertUserSubject(userId: number, subjectId: number) {
  const db = requireDb(await getDb());
  const [subject] = await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.userId, userId))).limit(1);
  if (!subject) throw new Error("Disciplina não encontrada.");
  return db;
}

export async function saveAcademicProfile(userId: number, input: ProfileInput) {
  const db = requireDb(await getDb());
  await db.insert(academicProfiles).values({ userId, ...input }).onDuplicateKeyUpdate({ set: input });
  return { success: true } as const;
}

export async function createSemester(userId: number, input: SemesterInput) {
  const db = requireDb(await getDb());
  if (input.isCurrent) await db.update(semesters).set({ isCurrent: false }).where(eq(semesters.userId, userId));
  await db.insert(semesters).values({ userId, ...input });
  return { success: true } as const;
}

export async function createSubject(userId: number, input: SubjectInput) {
  const db = requireDb(await getDb());
  if (input.semesterId) {
    const [semester] = await db.select({ id: semesters.id }).from(semesters).where(and(eq(semesters.id, input.semesterId), eq(semesters.userId, userId))).limit(1);
    if (!semester) throw new Error("Período acadêmico não encontrado.");
  }
  await db.insert(subjects).values({ userId, ...input });
  return { success: true } as const;
}

export async function createAcademicEvent(userId: number, input: EventInput) {
  const db = requireDb(await getDb());
  if (input.endsAt && input.endsAt < input.startsAt) throw new Error("O término deve ser posterior ao início.");
  if (input.subjectId) {
    const [subject] = await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, input.subjectId), eq(subjects.userId, userId))).limit(1);
    if (!subject) throw new Error("Disciplina não encontrada.");
  }
  await db.insert(academicEvents).values({ userId, ...input, source: "manual" });
  return { success: true } as const;
}

export async function createStudyTask(userId: number, input: TaskInput) {
  const db = requireDb(await getDb());
  if (input.subjectId) {
    const [subject] = await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, input.subjectId), eq(subjects.userId, userId))).limit(1);
    if (!subject) throw new Error("Disciplina não encontrada.");
  }
  await db.insert(studyTasks).values({ userId, ...input });
  return { success: true } as const;
}

/** Registra um conteúdo manual já confirmado para uma data de aula. */
export async function createLessonTopic(userId: number, input: LessonTopicInput) {
  const db = await assertUserSubject(userId, input.subjectId);
  if (input.classEventId) {
    const [event] = await db.select({ id: academicEvents.id }).from(academicEvents)
      .where(and(eq(academicEvents.id, input.classEventId), eq(academicEvents.userId, userId), eq(academicEvents.subjectId, input.subjectId), eq(academicEvents.type, "class"))).limit(1);
    if (!event) throw new Error("Aula não encontrada para a disciplina informada.");
  }
  await db.insert(lessonTopics).values({ userId, ...input, source: "manual", reviewStatus: "approved", reviewedAt: Date.now() });
  return { success: true } as const;
}

/** Aprova ou descarta, somente para o dono, um assunto extraído de e-mail. */
export async function reviewLessonTopic(userId: number, topicId: number, reviewStatus: "approved" | "dismissed") {
  const db = requireDb(await getDb());
  const [topic] = await db.select({ id: lessonTopics.id, subjectId: lessonTopics.subjectId }).from(lessonTopics)
    .where(and(eq(lessonTopics.id, topicId), eq(lessonTopics.userId, userId), eq(lessonTopics.reviewStatus, "pending"))).limit(1);
  if (!topic) throw new Error("Tema pendente não encontrado.");
  const update: { reviewStatus: "approved" | "dismissed"; reviewedAt: number; classEventId?: number; plannedFor?: number } = { reviewStatus, reviewedAt: Date.now() };
  if (attachesTopicToClassOnReview(reviewStatus)) {
    const [nextClass] = await db.select({ id: academicEvents.id, startsAt: academicEvents.startsAt }).from(academicEvents)
      .where(and(eq(academicEvents.userId, userId), eq(academicEvents.subjectId, topic.subjectId), eq(academicEvents.type, "class"), gte(academicEvents.startsAt, Date.now() - 4 * 60 * 60 * 1_000)))
      .orderBy(asc(academicEvents.startsAt)).limit(1);
    if (nextClass) {
      update.classEventId = nextClass.id;
      update.plannedFor = nextClass.startsAt;
    }
  }
  await db.update(lessonTopics).set(update).where(eq(lessonTopics.id, topic.id));
  return { success: true, reviewStatus } as const;
}

export async function createMaterialLink(userId: number, input: { subjectId: number; title: string; url: string }) {
  const db = await assertUserSubject(userId, input.subjectId);
  await db.insert(studyMaterials).values({ userId, subjectId: input.subjectId, title: input.title, type: "link", externalUrl: input.url });
  return { success: true } as const;
}

export async function uploadStudyMaterial(userId: number, input: { subjectId: number; title: string; filename: string; contentType: string; contentBase64: string }) {
  const db = await assertUserSubject(userId, input.subjectId);
  const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const bytes = Buffer.from(input.contentBase64, "base64");
  if (!bytes.length || bytes.length > 5_000_000) throw new Error("O arquivo deve ter até 5 MB.");
  const stored = await storagePut(`academic/${userId}/${input.subjectId}/${safeName}`, bytes, input.contentType);
  await db.insert(studyMaterials).values({
    userId,
    subjectId: input.subjectId,
    title: input.title,
    type: "file",
    storageKey: stored.key,
    storageUrl: stored.url,
    mimeType: input.contentType,
    sizeBytes: bytes.length,
  });
  return { success: true, url: stored.url } as const;
}

export async function setStudyTaskCompleted(userId: number, taskId: number, isCompleted: boolean) {
  const db = requireDb(await getDb());
  await db.update(studyTasks).set({ isCompleted }).where(and(eq(studyTasks.id, taskId), eq(studyTasks.userId, userId)));
  return { success: true } as const;
}

/** Importa a grade conferida para a conta atual; novas execuções não duplicam disciplinas ou aulas. */
export async function importInformedGrade(userId: number) {
  const db = requireDb(await getDb());
  await db.insert(academicProfiles).values({
    userId,
    institution: "Faculdade de Direito · UFRJ",
    course: "Direito",
    timezone: "America/Sao_Paulo",
  }).onDuplicateKeyUpdate({
    set: { institution: "Faculdade de Direito · UFRJ", course: "Direito", timezone: "America/Sao_Paulo" },
  });

  let [semester] = await db.select().from(semesters)
    .where(and(eq(semesters.userId, userId), eq(semesters.name, "2026.2"))).limit(1);
  if (!semester) {
    await db.update(semesters).set({ isCurrent: false }).where(eq(semesters.userId, userId));
    await db.insert(semesters).values({ userId, name: "2026.2", isCurrent: true });
    [semester] = await db.select().from(semesters)
      .where(and(eq(semesters.userId, userId), eq(semesters.name, "2026.2"))).limit(1);
  }

  let createdSubjects = 0;
  let createdEvents = 0;
  for (const item of informedGrade) {
    let [subject] = await db.select().from(subjects)
      .where(and(eq(subjects.userId, userId), eq(subjects.name, item.name))).limit(1);
    if (!subject) {
      await db.insert(subjects).values({
        userId,
        semesterId: semester?.id,
        name: item.name,
        professor: item.professor,
        color: item.color,
        room: item.classes[0]?.room,
        scheduleNote: item.classes.map(entry => `${entry.weekday}ª · ${entry.startsAt}–${entry.endsAt}`).join(" | "),
      });
      [subject] = await db.select().from(subjects)
        .where(and(eq(subjects.userId, userId), eq(subjects.name, item.name))).limit(1);
      createdSubjects += 1;
    }
    if (!subject) continue;
    for (const entry of item.classes) {
      for (const occurrence of nextClassOccurrences(entry)) {
        const externalId = `informed-grade:${item.code}:${entry.weekday}:${occurrence.startsAt}`;
        const [existing] = await db.select({ id: academicEvents.id }).from(academicEvents)
          .where(and(eq(academicEvents.userId, userId), eq(academicEvents.externalId, externalId))).limit(1);
        if (!existing) {
          await db.insert(academicEvents).values({
            userId,
            subjectId: subject.id,
            type: "class",
            title: item.name,
            details: `Aula de ${item.name} · Prof. ${item.professor}`,
            location: entry.room,
            startsAt: occurrence.startsAt,
            endsAt: occurrence.endsAt,
            source: "manual",
            externalId,
          });
          createdEvents += 1;
        }
      }
    }
  }
  return { success: true, createdSubjects, createdEvents, totalSubjects: informedGrade.length } as const;
}

/** Retorna a agenda de sincronização que pertence exclusivamente ao estudante. */
export async function getIntegrationSyncSchedule(userId: number) {
  const db = requireDb(await getDb());
  const [schedule] = await db.select().from(integrationSyncSchedules)
    .where(eq(integrationSyncSchedules.userId, userId)).limit(1);
  return schedule;
}

/** O callback cron resolve a agenda somente pelo identificador assinado pela plataforma. */
export async function getIntegrationSyncScheduleByTaskUid(taskUid: string) {
  const db = requireDb(await getDb());
  const [schedule] = await db.select().from(integrationSyncSchedules)
    .where(eq(integrationSyncSchedules.scheduleCronTaskUid, taskUid)).limit(1);
  return schedule;
}

export async function listEnabledIntegrationSyncSchedules() {
  const db = requireDb(await getDb());
  return db.select().from(integrationSyncSchedules)
    .where(eq(integrationSyncSchedules.isEnabled, true));
}

export async function saveIntegrationSyncTask(userId: number, taskUid: string) {
  const db = requireDb(await getDb());
  await db.insert(integrationSyncSchedules).values({
    userId,
    scheduleCronTaskUid: taskUid,
    isEnabled: true,
  }).onDuplicateKeyUpdate({
    set: { scheduleCronTaskUid: taskUid, isEnabled: true },
  });
  return { success: true } as const;
}

export async function setIntegrationSyncEnabled(userId: number, isEnabled: boolean) {
  const db = requireDb(await getDb());
  await db.update(integrationSyncSchedules).set({ isEnabled })
    .where(eq(integrationSyncSchedules.userId, userId));
  return { success: true } as const;
}

export async function recordIntegrationSyncRun(userId: number) {
  const db = requireDb(await getDb());
  await db.update(integrationSyncSchedules).set({ lastRunAt: Date.now() })
    .where(eq(integrationSyncSchedules.userId, userId));
}
