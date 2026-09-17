import { describe, expect, it } from "vitest";
import { validateEvidenceUpload } from "./evidence";

describe("validateEvidenceUpload", () => {
  it("accepts supported photo and video evidence within the configured limits", () => {
    expect(() => validateEvidenceUpload("damage_photo", "image/jpeg", 1024)).not.toThrow();
    expect(() => validateEvidenceUpload("damage_video", "video/mp4", 1024)).not.toThrow();
  });

  it("rejects unsupported formats and over-limit uploads", () => {
    expect(() => validateEvidenceUpload("price_proof", "application/pdf", 1024)).toThrow("JPG, PNG 또는 WEBP");
    expect(() => validateEvidenceUpload("damage_video", "video/mp4", 31 * 1024 * 1024)).toThrow("30MB");
  });
});
