import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

export type SessionPayload = {
  openId: string;
  name: string;
};

function sessionSecret() {
  if (ENV.isProduction && !ENV.cookieSecret) {
    throw new Error("JWT_SECRET deve ser configurado antes de publicar o Codex.");
  }
  return new TextEncoder().encode(ENV.cookieSecret || "codex-development-session-secret");
}

class SessionService {
  async createSessionToken(openId: string, options: { expiresInMs?: number; name?: string } = {}) {
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);
    return new SignJWT({ openId, name: options.name || "Estudante" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(sessionSecret());
  }

  async verifySession(cookieValue: string | undefined | null): Promise<SessionPayload | null> {
    if (!cookieValue) return null;
    try {
      const { payload } = await jwtVerify(cookieValue, sessionSecret(), { algorithms: ["HS256"] });
      if (typeof payload.openId !== "string" || typeof payload.name !== "string") return null;
      return { openId: payload.openId, name: payload.name };
    } catch {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = parseCookieHeader(req.headers.cookie ?? "");
    const bearer = typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : undefined;
    const session = await this.verifySession(cookies[COOKIE_NAME] ?? bearer);
    if (!session) throw ForbiddenError("Invalid session cookie");

    const user = await db.getUserByOpenId(session.openId);
    if (!user) throw ForbiddenError("User not found");
    await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
    return user;
  }
}

export const sessionService = new SessionService();
