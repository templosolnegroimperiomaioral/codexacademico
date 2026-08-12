import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().transform(value => value || undefined);

export const profileInput = z.object({
  displayName: optionalText(180),
  institution: optionalText(180),
  course: optionalText(180),
  timezone: z.string().trim().min(1).max(64).default("America/Sao_Paulo"),
});

export const semesterInput = z.object({
  name: z.string().trim().min(2, "Informe o nome do período.").max(80),
  startsAt: z.number().int().positive().optional(),
  endsAt: z.number().int().positive().optional(),
  isCurrent: z.boolean().default(false),
});

export const subjectInput = z.object({
  semesterId: z.number().int().positive().optional(),
  name: z.string().trim().min(2, "Informe o nome da disciplina.").max(180),
  professor: optionalText(180),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor hexadecimal.").default("#C9A66B"),
  room: optionalText(100),
  scheduleNote: optionalText(1_000),
});

export const eventInput = z.object({
  subjectId: z.number().int().positive().optional(),
  type: z.enum(["class", "exam", "assignment", "presentation", "seminar", "reading", "hearing", "appointment", "other"]).default("other"),
  title: z.string().trim().min(2, "Informe o título do compromisso.").max(220),
  details: optionalText(2_000),
  location: optionalText(180),
  startsAt: z.number().int().positive(),
  endsAt: z.number().int().positive().optional(),
});

export const taskInput = z.object({
  subjectId: z.number().int().positive().optional(),
  title: z.string().trim().min(2, "Informe o título da tarefa.").max(220),
  notes: optionalText(2_000),
  dueAt: z.number().int().positive().optional(),
});

export const taskCompletionInput = z.object({
  id: z.number().int().positive(),
  isCompleted: z.boolean(),
});

export const notificationReviewInput = z.object({
  id: z.number().int().positive(),
  reviewStatus: z.enum(["approved", "dismissed"]),
});

export const materialLinkInput = z.object({
  subjectId: z.number().int().positive(),
  title: z.string().trim().min(2, "Informe o título do material.").max(220),
  url: z.string().trim().url("Informe um link válido.").max(2_000),
});

export const materialUploadInput = z.object({
  subjectId: z.number().int().positive(),
  title: z.string().trim().min(2, "Informe o título do arquivo.").max(220),
  filename: z.string().trim().min(1).max(180),
  contentType: z.string().trim().min(1).max(160),
  contentBase64: z.string().min(1).max(7_000_000),
});

export const lessonTopicInput = z.object({
  subjectId: z.number().int().positive(),
  classEventId: z.number().int().positive().optional(),
  title: z.string().trim().min(2, "Informe o assunto da aula.").max(220),
  details: optionalText(2_000),
  plannedFor: z.number().int().positive("Informe a data prevista da aula."),
});

export const lessonTopicReviewInput = z.object({
  id: z.number().int().positive(),
  reviewStatus: z.enum(["approved", "dismissed"]),
});

export type SubjectInput = z.infer<typeof subjectInput>;
export type EventInput = z.infer<typeof eventInput>;
export type TaskInput = z.infer<typeof taskInput>;
export type SemesterInput = z.infer<typeof semesterInput>;
export type ProfileInput = z.infer<typeof profileInput>;
export type NotificationReviewInput = z.infer<typeof notificationReviewInput>;
export type LessonTopicInput = z.infer<typeof lessonTopicInput>;
