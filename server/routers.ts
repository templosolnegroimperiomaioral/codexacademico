import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { eventInput, lessonTopicInput, lessonTopicReviewInput, materialLinkInput, materialUploadInput, notificationReviewInput, profileInput, semesterInput, subjectInput, taskCompletionInput, taskInput } from "./academicSchemas";
import * as academicDb from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { createGoogleAuthorizationUrl, getGoogleRedirectUri, getIntegrationSummary, listNotifications, markNotificationRead, reviewNotification, syncGoogleAccount } from "./googleIntegration";

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  academic: router({
    dashboard: protectedProcedure.query(({ ctx }) => academicDb.getAcademicDashboard(ctx.user.id)),
    profile: router({
      save: protectedProcedure.input(profileInput).mutation(({ ctx, input }) => academicDb.saveAcademicProfile(ctx.user.id, input)),
    }),
    semesters: router({
      create: protectedProcedure.input(semesterInput).mutation(({ ctx, input }) => academicDb.createSemester(ctx.user.id, input)),
    }),
    grade: router({
      importInformed: protectedProcedure.mutation(({ ctx }) => academicDb.importInformedGrade(ctx.user.id)),
    }),
    subjects: router({
      create: protectedProcedure.input(subjectInput).mutation(({ ctx, input }) => academicDb.createSubject(ctx.user.id, input)),
    }),
    events: router({
      create: protectedProcedure.input(eventInput).mutation(({ ctx, input }) => academicDb.createAcademicEvent(ctx.user.id, input)),
    }),
    tasks: router({
      create: protectedProcedure.input(taskInput).mutation(({ ctx, input }) => academicDb.createStudyTask(ctx.user.id, input)),
      setCompleted: protectedProcedure.input(taskCompletionInput).mutation(({ ctx, input }) => academicDb.setStudyTaskCompleted(ctx.user.id, input.id, input.isCompleted)),
      delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await academicDb.getDb();
        if (!db) throw new Error("Banco de dados indisponível.");
        const { and, eq } = await import("drizzle-orm");
        const { studyTasks } = await import("../drizzle/schema");
        await db.delete(studyTasks).where(and(eq(studyTasks.id, input.id), eq(studyTasks.userId, ctx.user.id)));
        return { success: true } as const;
      }),
    }),
    materials: router({
      createLink: protectedProcedure.input(materialLinkInput).mutation(({ ctx, input }) => academicDb.createMaterialLink(ctx.user.id, input)),
      upload: protectedProcedure.input(materialUploadInput).mutation(({ ctx, input }) => academicDb.uploadStudyMaterial(ctx.user.id, input)),
    }),
    lessonTopics: router({
      create: protectedProcedure.input(lessonTopicInput).mutation(({ ctx, input }) => academicDb.createLessonTopic(ctx.user.id, input)),
      review: protectedProcedure.input(lessonTopicReviewInput).mutation(({ ctx, input }) => academicDb.reviewLessonTopic(ctx.user.id, input.id, input.reviewStatus)),
    }),
    integrations: router({
      summary: protectedProcedure.query(({ ctx }) => getIntegrationSummary(ctx.user.id)),
      redirectUri: protectedProcedure.query(({ ctx }) => getGoogleRedirectUri(ctx.req)),
      googleAuthorization: protectedProcedure.mutation(({ ctx }) => createGoogleAuthorizationUrl(ctx.user.id, getGoogleRedirectUri(ctx.req))),
      syncGoogle: protectedProcedure.mutation(async ({ ctx }) => syncGoogleAccount(ctx.user.id)),
      notifications: protectedProcedure.query(({ ctx }) => listNotifications(ctx.user.id)),
      markNotificationRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => markNotificationRead(ctx.user.id, input.id)),
      reviewNotification: protectedProcedure.input(notificationReviewInput).mutation(({ ctx, input }) => reviewNotification(ctx.user.id, input.id, input.reviewStatus)),
      autoSyncStatus: protectedProcedure.query(async ({ ctx }) => (await academicDb.getIntegrationSyncSchedule(ctx.user.id)) ?? null),
      enableAutoSync: protectedProcedure.mutation(async ({ ctx }) => {
        if (!ENV.isProduction || !ENV.cronSecret) throw new Error("A atualização automática será disponibilizada após a configuração do servidor de produção.");
        const connections = await getIntegrationSummary(ctx.user.id);
        if (!connections.some(connection => connection.status === "connected")) throw new Error("Conecte sua conta Google antes de ativar os avisos automáticos.");
        await academicDb.saveIntegrationSyncTask(ctx.user.id, "vps-cron");
        return { enabled: true, nextExecutionAt: null } as const;
      }),
      disableAutoSync: protectedProcedure.mutation(async ({ ctx }) => {
        await academicDb.setIntegrationSyncEnabled(ctx.user.id, false);
        return { enabled: false } as const;
      }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
