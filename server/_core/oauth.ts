import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE } from "@shared/const";
import * as db from "../db";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";
import { sessionService } from "./session";

type LoginState = {
  redirectUri: string;
  nonce: string;
  expiresAt: number;
};

type GoogleIdentity = {
  sub?: string;
  email?: string;
  name?: string;
};

function googleCredentials() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET devem ser configurados.");
  return { clientId, clientSecret };
}

function oauthSigningKey() {
  if (ENV.isProduction && !ENV.cookieSecret) throw new Error("JWT_SECRET deve ser configurado antes de publicar o Codex.");
  return crypto.createHash("sha256").update(`${ENV.cookieSecret || "codex-development-session-secret"}:codex-login-oauth`).digest();
}

function encodeState(payload: LoginState) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", oauthSigningKey()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function decodeState(value: string): LoginState {
  const [body, signature] = value.split(".");
  if (!body || !signature) throw new Error("Estado de autenticação inválido.");
  const expected = crypto.createHmac("sha256", oauthSigningKey()).update(body).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error("Estado de autenticação inválido.");
  }
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as LoginState;
  if (!payload.redirectUri || !payload.nonce || payload.expiresAt < Date.now()) {
    throw new Error("A solicitação de acesso expirou. Inicie o login novamente.");
  }
  return payload;
}

function appBaseUrl(req: Request) {
  if (ENV.publicBaseUrl) return ENV.publicBaseUrl;
  const host = req.get("host");
  if (!host) throw new Error("Não foi possível determinar o domínio público do Codex.");
  return `${req.protocol}://${host}`;
}

function stateCookieOptions(req: Request) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const isSecure = req.protocol === "https" || forwardedProto === "https";
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60_000,
  };
}

function authorizeUrl(redirectUri: string, state: string) {
  const { clientId } = googleCredentials();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

async function exchangeGoogleCode(code: string, redirectUri: string) {
  const { clientId, clientSecret } = googleCredentials();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) throw new Error("O Google não concluiu a autenticação. Tente novamente.");
  return response.json() as Promise<{ access_token?: string }>;
}

async function loadGoogleIdentity(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("Não foi possível identificar a conta Google.");
  const identity = await response.json() as GoogleIdentity;
  if (!identity.sub || !identity.email) throw new Error("A conta Google não forneceu os dados necessários para acessar o Codex.");
  return identity;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/auth/google/start", (req: Request, res: Response) => {
    try {
      const redirectUri = `${appBaseUrl(req)}/api/auth/google/callback`;
      const nonce = crypto.randomUUID();
      const state = encodeState({ redirectUri, nonce, expiresAt: Date.now() + 10 * 60_000 });
      res.cookie(OAUTH_STATE_COOKIE, nonce, stateCookieOptions(req));
      return res.redirect(302, authorizeUrl(redirectUri, state));
    } catch (error) {
      console.error("[Auth] Google login initialization failed", error);
      return res.redirect("/?auth=configuration-error");
    }
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    if (!code || !state) return res.redirect("/?auth=cancelled");

    try {
      const payload = decodeState(state);
      const nonce = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
      if (!nonce || nonce !== payload.nonce) throw new Error("A validação da sessão de login falhou.");
      res.clearCookie(OAUTH_STATE_COOKIE, stateCookieOptions(req));

      const token = await exchangeGoogleCode(code, payload.redirectUri);
      if (!token.access_token) throw new Error("O Google não retornou um token de acesso.");
      const identity = await loadGoogleIdentity(token.access_token);
      const openId = `google:${identity.sub}`;
      const name = identity.name?.trim() || identity.email;
      await db.upsertUser({ openId, name, email: identity.email, loginMethod: "google", lastSignedIn: new Date() });

      const sessionToken = await sessionService.createSessionToken(openId, { name, expiresInMs: ONE_YEAR_MS });
      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      return res.redirect(302, "/?auth=success");
    } catch (error) {
      console.error("[Auth] Google login callback failed", error instanceof Error ? error.message : error);
      return res.redirect("/?auth=error");
    }
  });
}
