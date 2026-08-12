const normalizeBaseUrl = (value: string | undefined) => value?.trim().replace(/\/+$/, "") ?? "";

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "codex-academico",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  googleCloudProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID ?? "",
  publicBaseUrl: normalizeBaseUrl(process.env.APP_BASE_URL),
  cronSecret: process.env.CRON_SECRET ?? "",
  uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
};
