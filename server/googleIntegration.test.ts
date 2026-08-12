import { describe, expect, it } from "vitest";
import { buildDailyReminder, createGoogleAuthorizationUrl, REMINDER_WINDOW_MS } from "./googleIntegration";

process.env.GOOGLE_OAUTH_CLIENT_ID ??= "test-client.apps.googleusercontent.com";
process.env.GOOGLE_OAUTH_CLIENT_SECRET ??= "test-client-secret";

describe("Google integration authorization", () => {
  it("builds an offline authorization URL without exposing any client secret", () => {
    const url = new URL(createGoogleAuthorizationUrl(42, "https://codex.example/api/integrations/google/callback"));
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("redirect_uri")).toBe("https://codex.example/api/integrations/google/callback");
    expect(url.searchParams.get("state")).toBeTruthy();
    expect(url.searchParams.get("client_secret")).toBeNull();
  });
});

describe("daily academic reminders", () => {
  const now = new Date("2026-08-11T15:00:00.000Z").getTime();

  it("creates a human-readable reminder for a deadline inside the seven-day window", () => {
    const reminder = buildDailyReminder({ kind: "task", id: 7, title: "Entrega do trabalho", subjectId: 3, dueAt: now + 2 * 86_400_000, now });
    expect(reminder.title).toBe("Lembrete: Entrega do trabalho");
    expect(reminder.summary).toContain("em 2 dias");
    expect(reminder.subjectId).toBe(3);
    expect(reminder.externalId).toContain("reminder:task:7:2026-08-11");
    expect(2 * 86_400_000).toBeLessThanOrEqual(REMINDER_WINDOW_MS);
  });

  it("uses a different idempotency key on the following day", () => {
    const first = buildDailyReminder({ kind: "event", id: 4, title: "Prova", subjectId: null, dueAt: now + 86_400_000, now });
    const nextDay = buildDailyReminder({ kind: "event", id: 4, title: "Prova", subjectId: null, dueAt: now + 86_400_000, now: now + 86_400_000 });
    expect(first.externalId).not.toBe(nextDay.externalId);
    expect(first.subjectId).toBeUndefined();
  });
});
