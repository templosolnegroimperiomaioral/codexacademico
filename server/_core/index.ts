import "dotenv/config";
import express from "express";
import { createServer } from "http";
import path from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerGoogleIntegrationRoutes, registerGoogleSyncScheduleRoute } from "../googleIntegration";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ENV } from "./env";

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", 1);
  app.get("/health", (_req, res) => res.status(200).json({ status: "ok", service: "codex-academico" }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use("/uploads", express.static(path.resolve(ENV.uploadDir), { fallthrough: false, maxAge: "1h" }));

  registerOAuthRoutes(app);
  registerGoogleIntegrationRoutes(app);
  registerGoogleSyncScheduleRoute(app);
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

  if (process.env.NODE_ENV === "development") await setupVite(app, server);
  else serveStatic(app);

  const port = Number.parseInt(process.env.PORT || "3000", 10);
  const host = process.env.HOST || "0.0.0.0";
  server.listen(port, host, () => console.log(`Codex running on http://${host}:${port}/`));
}

startServer().catch(error => {
  console.error("Codex failed to start", error);
  process.exitCode = 1;
});
