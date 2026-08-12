import { describe, expect, it } from "vitest";

/**
 * Verificação opcional para ambientes que possuem o cliente OAuth de produção.
 * A suíte local não envia segredos nem depende de rede externa.
 */
describe("Google OAuth credentials", () => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  it.skipIf(!clientId || !clientSecret)("recognizes the configured OAuth client", async () => {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code: "codex-credential-validation-placeholder",
        grant_type: "authorization_code",
        redirect_uri: "https://localhost.invalid/oauth/google/callback",
      }),
    });

    const payload = (await response.json()) as { error?: string };
    expect(payload.error).not.toBe("invalid_client");
    expect(["invalid_grant", "invalid_request"]).toContain(payload.error);
  }, 20_000);
});
