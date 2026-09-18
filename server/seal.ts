import { TRPCError } from "@trpc/server";

const allowedSealTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxSealBytes = 7 * 1024 * 1024;

export function validateSealUpload(contentType: string, byteSize: number) {
  if (!allowedSealTypes.has(contentType)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "직인 이미지는 JPG, PNG 또는 WEBP 형식만 등록할 수 있습니다." });
  }
  if (!Number.isSafeInteger(byteSize) || byteSize < 1 || byteSize > maxSealBytes) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "직인 이미지는 7MB 이하여야 합니다." });
  }
}
