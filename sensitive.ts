import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { ENV } from "./_core/env";

const ALGORITHM = "aes-256-gcm";

/** Encrypts settlement account material at rest. Operational views use only the separate last-four field. */
export function encryptSensitiveValue(value: string) {
  if (!ENV.cookieSecret) throw new Error("민감 정보 암호화 키가 설정되지 않았습니다.");
  const key = createHash("sha256").update(ENV.cookieSecret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}
