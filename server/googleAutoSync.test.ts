import { describe, expect, it } from "vitest";
import { GOOGLE_SYNC_CRON } from "./googleIntegration";

describe("sincronização automática Google", () => {
  it("usa uma expressão cron de seis campos a cada quinze minutos", () => {
    expect(GOOGLE_SYNC_CRON).toBe("0 */15 * * * *");
    expect(GOOGLE_SYNC_CRON.trim().split(/\s+/)).toHaveLength(6);
  });
});
