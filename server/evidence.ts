import { TRPCError } from "@trpc/server";

export const evidenceCategories = ["damage_photo", "damage_video", "price_proof", "compensation_proof"] as const;
export type EvidenceCategory = (typeof evidenceCategories)[number];

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const videoTypes = new Set(["video/mp4", "video/quicktime"]);
const imageMaxBytes = 7 * 1024 * 1024;
const videoMaxBytes = 30 * 1024 * 1024;

export function validateEvidenceUpload(category: EvidenceCategory, contentType: string, byteSize: number) {
  const isVideo = category === "damage_video";
  const allowed = isVideo ? videoTypes : imageTypes;
  const maxBytes = isVideo ? videoMaxBytes : imageMaxBytes;
  if (!allowed.has(contentType)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: isVideo ? "영상은 MP4 또는 MOV 형식만 업로드할 수 있습니다." : "이미지는 JPG, PNG 또는 WEBP 형식만 업로드할 수 있습니다." });
  }
  if (!Number.isSafeInteger(byteSize) || byteSize < 1 || byteSize > maxBytes) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `파일 크기는 ${isVideo ? "30MB" : "7MB"} 이하여야 합니다.` });
  }
}

export function safeEvidenceFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "evidence";
}
