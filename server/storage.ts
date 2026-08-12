import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ENV } from "./_core/env";

function safeRelativeKey(key: string) {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.split("/").some(part => !part || part === "." || part === "..")) {
    throw new Error("Chave de armazenamento inválida.");
  }
  return normalized;
}

function absolutePath(key: string) {
  const root = path.resolve(ENV.uploadDir);
  const target = path.resolve(root, safeRelativeKey(key));
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Caminho de armazenamento inválido.");
  return target;
}

export async function storagePut(key: string, body: Buffer | Uint8Array | string, _contentType = "application/octet-stream") {
  const normalizedKey = safeRelativeKey(key);
  const target = absolutePath(normalizedKey);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body, { flag: "w" });
  return { key: normalizedKey, url: `/uploads/${normalizedKey}` };
}

export async function storageGet(key: string) {
  const normalizedKey = safeRelativeKey(key);
  return { key: normalizedKey, url: `/uploads/${normalizedKey}` };
}

/** A compatibilidade com a API anterior é mantida; o arquivo é servido pelo domínio do Codex. */
export async function storageGetSignedUrl(key: string) {
  return `/uploads/${safeRelativeKey(key)}`;
}
