import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { filterInboxNotices } from "../shared/noticeInbox";

const mocks = vi.hoisted(() => ({ listNotifications: vi.fn() }));

vi.mock("./googleIntegration", async importOriginal => {
  const actual = await importOriginal<typeof import("./googleIntegration")>();
  return { ...actual, listNotifications: mocks.listNotifications };
});

import { appRouter } from "./routers";

function context(): TrpcContext {
  return {
    user: { id: 52, openId: "inbox-user", email: "student@example.com", name: "Estudante", loginMethod: "google", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("academic.integrations.notifications", () => {
  it("entrega os avisos da própria conta para a central e permite filtrá-los por disciplina", async () => {
    const notices = [
      { id: 1, source: "gmail", subjectId: 8, reviewStatus: "pending", title: "Entrega" },
      { id: 2, source: "classroom", subjectId: 4, reviewStatus: "approved", title: "Material" },
    ];
    mocks.listNotifications.mockResolvedValueOnce(notices);
    const caller = appRouter.createCaller(context());

    await expect(caller.academic.integrations.notifications()).resolves.toEqual(notices);
    expect(mocks.listNotifications).toHaveBeenCalledWith(52);
    expect(filterInboxNotices(notices, 8)).toEqual([notices[0]]);
    expect(filterInboxNotices(notices, 99)).toEqual([]);
  });
});
