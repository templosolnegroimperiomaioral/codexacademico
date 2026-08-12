import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({ syncGoogleAccount: vi.fn() }));

vi.mock("./googleIntegration", async importOriginal => {
  const actual = await importOriginal<typeof import("./googleIntegration")>();
  return { ...actual, syncGoogleAccount: mocks.syncGoogleAccount };
});

import { appRouter } from "./routers";

function authenticatedContext(): TrpcContext {
  return {
    user: {
      id: 41,
      openId: "manual-sync-user",
      email: "student@example.com",
      name: "Estudante",
      loginMethod: "google",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("academic.integrations.syncGoogle", () => {
  it("retorna o resultado da sincronização manual para a conta autenticada", async () => {
    mocks.syncGoogleAccount.mockResolvedValueOnce({ success: true, syncedAt: 1_786_000_000_000 });
    const caller = appRouter.createCaller(authenticatedContext());

    await expect(caller.academic.integrations.syncGoogle()).resolves.toEqual({ success: true, syncedAt: 1_786_000_000_000 });
    expect(mocks.syncGoogleAccount).toHaveBeenCalledWith(41);
  });

  it("propaga uma falha de conexão para que o painel possa informar o erro", async () => {
    mocks.syncGoogleAccount.mockRejectedValueOnce(new Error("Conecte sua conta Google antes de sincronizar."));
    const caller = appRouter.createCaller(authenticatedContext());

    await expect(caller.academic.integrations.syncGoogle()).rejects.toThrow("Conecte sua conta Google antes de sincronizar.");
  });
});
