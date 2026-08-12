import crypto from "node:crypto";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import type { Express, Request, Response } from "express";
import {
  academicEvents,
  academicNotifications,
  integrationConnections,
  lessonTopics,
  studyTasks,
  subjects,
} from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { listEnabledIntegrationSyncSchedules, recordIntegrationSyncRun } from "./db";

/** Intervalo econômico para o modo sem mensageria paga: quatro verificações por hora. */
export const GOOGLE_SYNC_CRON = "0 */15 * * * *";
export const REMINDER_WINDOW_MS = 7 * 86_400_000;
const TOPIC_SIGNAL = /(?:(?:conteúdo|tema|assunto)(?:\s+da\s+aula)?|plano de aula|próxima aula|aula de hoje)\s*[:\-–—]\s*([^\n.]{3,220})/i;

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.announcements.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
];

type GoogleTokenSet = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

type OAuthState = { userId: number; redirectUri: string; expiresAt: number; nonce: string };

function credentials() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("A integração Google ainda não foi configurada.");
  return { clientId, clientSecret };
}

function signingKey() {
  return crypto.createHash("sha256").update(`${ENV.cookieSecret}:codex-google-oauth`).digest();
}

function encodeState(payload: OAuthState) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", signingKey()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function decodeState(state: string): OAuthState {
  const [body, signature] = state.split(".");
  if (!body || !signature) throw new Error("Estado de autorização inválido.");
  const expected = crypto.createHmac("sha256", signingKey()).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error("Estado de autorização inválido.");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthState;
  if (!Number.isInteger(payload.userId) || !payload.redirectUri || payload.expiresAt < Date.now()) throw new Error("A autorização expirou. Inicie a conexão novamente.");
  return payload;
}

function encrypt(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", signingKey(), iv);
  const encoded = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encoded]).toString("base64url");
}

function decrypt(value: string) {
  const raw = Buffer.from(value, "base64url");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", signingKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function getGoogleRedirectUri(req: Request) {
  const host = req.get("host");
  const baseUrl = ENV.publicBaseUrl || (host ? `${req.protocol}://${host}` : "");
  if (!baseUrl) throw new Error("Não foi possível determinar o endereço do Codex.");
  return `${baseUrl}/api/integrations/google/callback`;
}

export function createGoogleAuthorizationUrl(userId: number, redirectUri: string) {
  const { clientId } = credentials();
  const state = encodeState({ userId, redirectUri, expiresAt: Date.now() + 10 * 60_000, nonce: crypto.randomUUID() });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

async function googleJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`A fonte Google respondeu com erro (${response.status}).`);
  return (await response.json()) as T;
}

async function exchangeCode(code: string, redirectUri: string) {
  const { clientId, clientSecret } = credentials();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });
  if (!response.ok) throw new Error("O Google não concluiu a autorização. Tente conectar novamente.");
  return (await response.json()) as GoogleTokenSet;
}

async function upsertConnectionSet(userId: number, accountEmail: string | null, tokens: GoogleTokenSet) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const accessCipher = encrypt(tokens.access_token);
  const refreshCipher = tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined;
  const expiresAt = tokens.expires_in ? Date.now() + tokens.expires_in * 1_000 : undefined;
  for (const provider of ["gmail", "google_classroom", "google_calendar"] as const) {
    const values = {
      userId,
      provider,
      accountEmail,
      status: "connected" as const,
      scopes: tokens.scope ?? GOOGLE_SCOPES.join(" "),
      tokenCipher: accessCipher,
      refreshTokenCipher: refreshCipher,
      tokenExpiresAt: expiresAt,
      lastError: null,
      lastSyncedAt: null,
    };
    await db.insert(integrationConnections).values(values).onDuplicateKeyUpdate({ set: values });
  }
}

export async function completeGoogleAuthorization(code: string, state: string) {
  const payload = decodeState(state);
  const tokens = await exchangeCode(code, payload.redirectUri);
  if (!tokens.refresh_token) throw new Error("O Google não entregou acesso contínuo. Remova o acesso do Codex na sua conta Google e tente novamente.");
  const identity = await googleJson<{ email?: string }>("https://openidconnect.googleapis.com/v1/userinfo", tokens.access_token);
  await upsertConnectionSet(payload.userId, identity.email ?? null, tokens);
}

export async function getIntegrationSummary(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ provider: integrationConnections.provider, status: integrationConnections.status, accountEmail: integrationConnections.accountEmail, lastSyncedAt: integrationConnections.lastSyncedAt, lastError: integrationConnections.lastError })
    .from(integrationConnections).where(eq(integrationConnections.userId, userId));
}

async function currentGoogleToken(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const [connection] = await db.select().from(integrationConnections)
    .where(and(eq(integrationConnections.userId, userId), eq(integrationConnections.provider, "gmail"))).limit(1);
  if (!connection?.tokenCipher || !connection.refreshTokenCipher) throw new Error("Conecte sua conta Google antes de sincronizar.");
  if (!connection.tokenExpiresAt || connection.tokenExpiresAt > Date.now() + 60_000) return decrypt(connection.tokenCipher);
  const { clientId, clientSecret } = credentials();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: decrypt(connection.refreshTokenCipher), grant_type: "refresh_token" }),
  });
  if (!response.ok) throw new Error("A autorização Google expirou. Conecte a conta novamente.");
  const refreshed = (await response.json()) as GoogleTokenSet;
  const tokenCipher = encrypt(refreshed.access_token);
  const tokenExpiresAt = Date.now() + (refreshed.expires_in ?? 3_000) * 1_000;
  await db.update(integrationConnections).set({ tokenCipher, tokenExpiresAt, lastError: null }).where(eq(integrationConnections.userId, userId));
  return refreshed.access_token;
}

function subjectFor(subjectList: { id: number; name: string }[], text: string) {
  const normalized = text.toLocaleLowerCase("pt-BR");
  return subjectList.find(subject => normalized.includes(subject.name.toLocaleLowerCase("pt-BR")))?.id;
}

/** Aceita somente indicações explícitas de tema; e-mails comuns não viram plano de aula. */
export function extractLessonTopicCandidate(text: string) {
  const match = text.replace(/\s+/g, " ").match(TOPIC_SIGNAL);
  if (!match?.[1]) return undefined;
  const title = match[1].replace(/\s+(?:para|na|no)\s+(?:aula|dia)\b.*$/i, "").trim();
  return title.length >= 3 ? title.slice(0, 220) : undefined;
}

async function saveDetectedLessonTopic(userId: number, subjectId: number, sourceMessageId: string, title: string, details: string, now: number) {
  const db = await getDb();
  if (!db) return;
  const [existing] = await db.select({ id: lessonTopics.id, reviewStatus: lessonTopics.reviewStatus }).from(lessonTopics)
    .where(and(eq(lessonTopics.userId, userId), eq(lessonTopics.sourceMessageId, sourceMessageId))).limit(1);
  if (existing) {
    if (existing.reviewStatus === "pending") await db.update(lessonTopics).set({ title, details, subjectId })
      .where(eq(lessonTopics.id, existing.id));
    return;
  }
  await db.insert(lessonTopics).values({ userId, subjectId, title, details: details.slice(0, 2_000), source: "gmail", sourceMessageId, reviewStatus: "pending" });
}

export function shouldPromoteCalendarCandidate(notification: { source: string; subjectId: number | null; detectedStartsAt: number | null; externalId: string | null }, reviewStatus: "approved" | "dismissed") {
  return reviewStatus === "approved" && notification.source === "calendar" && Boolean(notification.subjectId && notification.detectedStartsAt && notification.externalId);
}

export function shouldPromoteClassroomTask(notification: { source: string; subjectId: number | null; externalId: string | null }, reviewStatus: "approved" | "dismissed") {
  return reviewStatus === "approved" && notification.source === "classroom" && Boolean(notification.subjectId && notification.externalId);
}

export function shouldPromoteGmailTask(notification: { source: string; subjectId: number | null; externalId: string | null }, reviewStatus: "approved" | "dismissed") {
  return reviewStatus === "approved" && notification.source === "gmail" && Boolean(notification.subjectId && notification.externalId);
}

async function saveNotice(userId: number, item: { source: "gmail" | "classroom" | "calendar" | "system"; externalId: string; title: string; summary?: string; actionUrl?: string; receivedAt: number; subjectId?: number; detectedStartsAt?: number; detectedDueAt?: number; reviewStatus?: "approved" | "dismissed" }) {
  const db = await getDb();
  if (!db) return;
  const values = { userId, source: item.source, externalId: item.externalId, title: item.title.slice(0, 220), summary: item.summary?.slice(0, 600), actionUrl: item.actionUrl, receivedAt: item.receivedAt, subjectId: item.subjectId, detectedStartsAt: item.detectedStartsAt, detectedDueAt: item.detectedDueAt, reviewStatus: item.reviewStatus };
  const [existing] = await db.select({ id: academicNotifications.id }).from(academicNotifications)
    .where(and(eq(academicNotifications.userId, userId), eq(academicNotifications.source, item.source), eq(academicNotifications.externalId, item.externalId))).limit(1);
  if (existing) {
    await db.update(academicNotifications).set({ title: values.title, summary: values.summary, actionUrl: values.actionUrl, receivedAt: values.receivedAt, subjectId: values.subjectId, detectedStartsAt: values.detectedStartsAt, detectedDueAt: values.detectedDueAt })
      .where(eq(academicNotifications.id, existing.id));
    return;
  }
  await db.insert(academicNotifications).values(values);
}

function reminderDayKey(now: number) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(now));
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? "00";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function buildDailyReminder({ kind, id, title, subjectId, dueAt, now }: { kind: "task" | "event"; id: number; title: string; subjectId: number | null; dueAt: number; now: number }) {
  const days = Math.max(0, Math.ceil((dueAt - now) / 86_400_000));
  const label = days === 0 ? "hoje" : days === 1 ? "amanhã" : `em ${days} dias`;
  return { externalId: `reminder:${kind}:${id}:${reminderDayKey(now)}`, title: `Lembrete: ${title}`, summary: `Este compromisso acadêmico vence ou acontece ${label}.`, subjectId: subjectId ?? undefined, detectedDueAt: dueAt };
}

/** Registra um único lembrete por dia para cada prova, entrega ou tarefa próxima. */
export async function generateUpcomingReminders(userId: number, now = Date.now()) {
  const db = await getDb();
  if (!db) return { created: 0 };
  const limit = now + REMINDER_WINDOW_MS;
  const [tasks, events, topics] = await Promise.all([
    db.select({ id: studyTasks.id, title: studyTasks.title, subjectId: studyTasks.subjectId, dueAt: studyTasks.dueAt }).from(studyTasks)
      .where(and(eq(studyTasks.userId, userId), eq(studyTasks.isCompleted, false), gte(studyTasks.dueAt, now), lte(studyTasks.dueAt, limit))),
    db.select({ id: academicEvents.id, title: academicEvents.title, subjectId: academicEvents.subjectId, startsAt: academicEvents.startsAt }).from(academicEvents)
      .where(and(eq(academicEvents.userId, userId), inArray(academicEvents.type, ["exam", "assignment", "presentation"]), gte(academicEvents.startsAt, now), lte(academicEvents.startsAt, limit))),
    db.select({ id: lessonTopics.id, title: lessonTopics.title, subjectId: lessonTopics.subjectId, plannedFor: lessonTopics.plannedFor, subjectName: subjects.name }).from(lessonTopics)
      .innerJoin(subjects, eq(lessonTopics.subjectId, subjects.id))
      .where(and(eq(lessonTopics.userId, userId), eq(lessonTopics.reviewStatus, "approved"), gte(lessonTopics.plannedFor, now - 12 * 60 * 60 * 1_000), lte(lessonTopics.plannedFor, now + 18 * 60 * 60 * 1_000))),
  ]);
  const candidates = [
    ...tasks.filter(item => item.dueAt !== null).map(item => buildDailyReminder({ kind: "task", id: item.id, title: item.title, subjectId: item.subjectId, dueAt: item.dueAt!, now })),
    ...events.map(item => buildDailyReminder({ kind: "event", id: item.id, title: item.title, subjectId: item.subjectId, dueAt: item.startsAt, now })),
  ];
  for (const candidate of candidates) await saveNotice(userId, { source: "system", receivedAt: now, reviewStatus: "approved", ...candidate });
  for (const topic of topics) await saveNotice(userId, {
    source: "system",
    externalId: `lesson-topic:${topic.id}:${reminderDayKey(now)}`,
    title: `Conteúdo da aula hoje: ${topic.title}`,
    summary: `Em ${topic.subjectName}, o assunto previsto para a aula de hoje é “${topic.title}”.`,
    receivedAt: now,
    subjectId: topic.subjectId,
    reviewStatus: "approved",
  });
  return { created: candidates.length + topics.length };
}

export async function syncGoogleAccount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const token = await currentGoogleToken(userId);
  const subjectList = await db.select({ id: subjects.id, name: subjects.name }).from(subjects).where(eq(subjects.userId, userId));
  const after = new Date(Date.now() - 14 * 86_400_000).toISOString();

  const gmail = await googleJson<{ messages?: { id: string }[] }>("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15&q=newer_than%3A14d", token);
  for (const message of gmail.messages ?? []) {
    const detail = await googleJson<{ id: string; snippet?: string; internalDate?: string; payload?: { headers?: { name: string; value: string }[] } }>(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`, token);
    const headers = detail.payload?.headers ?? [];
    const subject = headers.find(header => header.name.toLowerCase() === "subject")?.value ?? "Novo e-mail acadêmico";
    const from = headers.find(header => header.name.toLowerCase() === "from")?.value ?? "";
    const subjectId = subjectFor(subjectList, `${subject} ${detail.snippet ?? ""}`);
    if (subjectId || /classroom|ufrj|faculdade/i.test(from)) {
      await saveNotice(userId, { source: "gmail", externalId: `gmail:${detail.id}`, title: subject, summary: detail.snippet, actionUrl: `https://mail.google.com/mail/u/0/#all/${detail.id}`, receivedAt: Number(detail.internalDate) || Date.now(), subjectId });
    }
    const topicTitle = subjectId ? extractLessonTopicCandidate(`${subject}\n${detail.snippet ?? ""}`) : undefined;
    if (subjectId && topicTitle) await saveDetectedLessonTopic(userId, subjectId, `gmail:${detail.id}`, topicTitle, detail.snippet ?? subject, Date.now());
  }

  const calendar = await googleJson<{ items?: { id: string; summary?: string; description?: string; htmlLink?: string; start?: { dateTime?: string; date?: string } }[] }>(`https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(after)}&maxResults=25`, token);
  for (const item of calendar.items ?? []) {
    const title = item.summary ?? "Compromisso na agenda";
    const subjectId = subjectFor(subjectList, `${title} ${item.description ?? ""}`);
    if (!subjectId) continue;
    const startsAt = new Date(item.start?.dateTime ?? item.start?.date ?? Date.now()).getTime();
    await saveNotice(userId, { source: "calendar", externalId: `calendar:${item.id}`, title, summary: "Evento detectado no Google Calendar. Revise antes de adicionar à agenda do Codex.", actionUrl: item.htmlLink, receivedAt: startsAt, subjectId, detectedStartsAt: startsAt });
  }

  const courses = await googleJson<{ courses?: { id?: string; name?: string }[] }>("https://classroom.googleapis.com/v1/courses?studentId=me&pageSize=30", token);
  for (const course of courses.courses ?? []) {
    if (!course.id || !course.name) continue;
    const subjectId = subjectFor(subjectList, course.name);
    if (!subjectId) continue;
    const coursework = await googleJson<{ courseWork?: { id?: string; title?: string; description?: string; alternateLink?: string; updateTime?: string; dueDate?: { year?: number; month?: number; day?: number } }[] }>(`https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?courseWorkStates=PUBLISHED&pageSize=20`, token);
    for (const work of coursework.courseWork ?? []) {
      if (!work.id || !work.title) continue;
      const due = work.dueDate?.year && work.dueDate.month && work.dueDate.day ? Date.UTC(work.dueDate.year, work.dueDate.month - 1, work.dueDate.day, 23, 59) : undefined;
      await saveNotice(userId, { source: "classroom", externalId: `classroom:${course.id}:${work.id}`, title: work.title, summary: work.description ?? `Atividade detectada em ${course.name}. Revise antes de criar a tarefa no Codex.`, actionUrl: work.alternateLink, receivedAt: work.updateTime ? new Date(work.updateTime).getTime() : Date.now(), subjectId, detectedDueAt: due });
    }
  }

  const now = Date.now();
  await db.update(integrationConnections).set({ lastSyncedAt: now, lastError: null }).where(eq(integrationConnections.userId, userId));
  return { success: true, syncedAt: now } as const;
}

export async function listNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: academicNotifications.id,
    source: academicNotifications.source,
    title: academicNotifications.title,
    summary: academicNotifications.summary,
    actionUrl: academicNotifications.actionUrl,
    receivedAt: academicNotifications.receivedAt,
    readAt: academicNotifications.readAt,
    reviewStatus: academicNotifications.reviewStatus,
    reviewedAt: academicNotifications.reviewedAt,
    detectedStartsAt: academicNotifications.detectedStartsAt,
    detectedDueAt: academicNotifications.detectedDueAt,
    subjectId: academicNotifications.subjectId,
    subjectName: subjects.name,
  }).from(academicNotifications)
    .leftJoin(subjects, eq(academicNotifications.subjectId, subjects.id))
    .where(eq(academicNotifications.userId, userId))
    .orderBy(desc(academicNotifications.receivedAt)).limit(30);
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  await db.update(academicNotifications).set({ readAt: Date.now() }).where(and(eq(academicNotifications.id, notificationId), eq(academicNotifications.userId, userId)));
  return { success: true } as const;
}

export async function reviewNotification(userId: number, notificationId: number, reviewStatus: "approved" | "dismissed") {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const [notification] = await db.select().from(academicNotifications).where(and(eq(academicNotifications.id, notificationId), eq(academicNotifications.userId, userId))).limit(1);
  if (!notification) throw new Error("Aviso não encontrado.");
  await db.update(academicNotifications).set({ reviewStatus, reviewedAt: Date.now(), readAt: Date.now() })
    .where(and(eq(academicNotifications.id, notificationId), eq(academicNotifications.userId, userId)));
  if (shouldPromoteCalendarCandidate(notification, reviewStatus)) {
    const subjectId = notification.subjectId;
    const startsAt = notification.detectedStartsAt;
    const externalId = notification.externalId;
    if (!subjectId || !startsAt || !externalId) return { success: true, reviewStatus } as const;
    const [existing] = await db.select({ id: academicEvents.id }).from(academicEvents)
      .where(and(eq(academicEvents.userId, userId), eq(academicEvents.externalId, externalId))).limit(1);
    if (!existing) {
      await db.insert(academicEvents).values({
        userId,
        subjectId,
        type: "appointment",
        title: notification.title,
        details: notification.summary,
        startsAt,
        source: "calendar",
        externalId,
      });
    }
  }
  if (shouldPromoteClassroomTask(notification, reviewStatus)) {
    const subjectId = notification.subjectId;
    const externalId = notification.externalId;
    if (!subjectId || !externalId) return { success: true, reviewStatus } as const;
    const [existing] = await db.select({ id: studyTasks.id }).from(studyTasks)
      .where(and(eq(studyTasks.userId, userId), eq(studyTasks.externalId, externalId))).limit(1);
    if (!existing) {
      await db.insert(studyTasks).values({
        userId,
        subjectId,
        title: notification.title,
        notes: notification.summary,
        dueAt: notification.detectedDueAt,
        source: "classroom",
        externalId,
      });
    }
  }
  if (shouldPromoteGmailTask(notification, reviewStatus)) {
    const subjectId = notification.subjectId;
    const externalId = notification.externalId;
    if (!subjectId || !externalId) return { success: true, reviewStatus } as const;
    const [existing] = await db.select({ id: studyTasks.id }).from(studyTasks)
      .where(and(eq(studyTasks.userId, userId), eq(studyTasks.externalId, externalId))).limit(1);
    if (!existing) {
      await db.insert(studyTasks).values({
        userId,
        subjectId,
        title: notification.title,
        notes: notification.summary,
        source: "gmail",
        externalId,
      });
    }
  }
  return { success: true, reviewStatus } as const;
}

/** Endpoint interno acionado pelo cron da VPS. Cada conta continua controlando se deseja sincronizar. */
export function registerGoogleSyncScheduleRoute(app: Express) {
  app.post("/api/scheduled/google-sync", async (req: Request, res: Response) => {
    const suppliedSecret = req.header("x-cron-secret") || req.header("authorization")?.replace(/^Bearer\s+/i, "");
    const expectedSecret = Buffer.from(ENV.cronSecret);
    const receivedSecret = Buffer.from(suppliedSecret ?? "");
    if (!ENV.cronSecret || !suppliedSecret || receivedSecret.length !== expectedSecret.length || !crypto.timingSafeEqual(receivedSecret, expectedSecret)) {
      return res.status(403).json({ error: "cron-only" });
    }

    try {
      const schedules = await listEnabledIntegrationSyncSchedules();
      const results: { userId: number; status: "synced" | "failed"; error?: string }[] = [];
      for (const schedule of schedules) {
        try {
          await syncGoogleAccount(schedule.userId);
          await generateUpcomingReminders(schedule.userId);
          await recordIntegrationSyncRun(schedule.userId);
          results.push({ userId: schedule.userId, status: "synced" });
        } catch (error) {
          console.error("[Google Sync] Failed", schedule.userId, error);
          results.push({ userId: schedule.userId, status: "failed", error: error instanceof Error ? error.message : "Erro desconhecido" });
        }
      }
      return res.json({ ok: true, processed: results.length, results, syncedAt: Date.now() });
    } catch (error) {
      console.error("[Google Sync] Scheduler failed", error);
      return res.status(503).json({ error: "A sincronização está indisponível no momento." });
    }
  });
}

export function registerGoogleIntegrationRoutes(app: Express) {
  app.get("/api/integrations/google/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    if (!code || !state) return res.redirect("/?google=cancelled");
    try {
      await completeGoogleAuthorization(code, state);
      return res.redirect("/?google=connected");
    } catch (error) {
      console.error("[Google Integration] OAuth callback failed", error instanceof Error ? error.message : "unknown error");
      return res.redirect("/?google=error");
    }
  });
}
