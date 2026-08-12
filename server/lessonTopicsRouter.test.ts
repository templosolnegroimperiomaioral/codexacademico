import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  createLessonTopic: vi.fn(),
  reviewLessonTopic: vi.fn(),
}));

vi.mock("./db", () => mocks);

import { appRouter } from "./routers";

function authenticatedContext(): TrpcContext {
  return {
    user: { id: 51, openId: "gabrielle", email: "gabrielle@example.com", name: "Gabrielle Luiza", loginMethod: "google", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("academic.lessonTopics", () => {
  it("cria manualmente o conteúdo previsto para uma aula da conta autenticada", async () => {
    mocks.createLessonTopic.mockResolvedValueOnce({ id: 81, reviewStatus: "approved" });
    const caller = appRouter.createCaller(authenticatedContext());

    await expect(caller.academic.lessonTopics.create({ subjectId: 12, title: "Inventário e partilha", plannedFor: 1_786_000_000_000 })).resolves.toEqual({ id: 81, reviewStatus: "approved" });
    expect(mocks.createLessonTopic).toHaveBeenCalledWith(51, { subjectId: 12, title: "Inventário e partilha", plannedFor: 1_786_000_000_000 });
  });

  it("rejeita conteúdos manuais sem data de aula", async () => {
    const caller = appRouter.createCaller(authenticatedContext());
    await expect(caller.academic.lessonTopics.create({ subjectId: 12, title: "Inventário e partilha" } as never)).rejects.toThrow();
  });

  it("encaminha a aprovação do e-mail detectado para associação controlada à próxima aula", async () => {
    mocks.reviewLessonTopic.mockResolvedValueOnce({ success: true, reviewStatus: "approved" });
    const caller = appRouter.createCaller(authenticatedContext());

    await expect(caller.academic.lessonTopics.review({ id: 81, reviewStatus: "approved" })).resolves.toEqual({ success: true, reviewStatus: "approved" });
    expect(mocks.reviewLessonTopic).toHaveBeenCalledWith(51, 81, "approved");
  });
});
