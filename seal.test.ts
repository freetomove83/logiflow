import { describe, expect, it } from "vitest";
import { validateSealUpload } from "./seal";

describe("validateSealUpload", () => {
  it("accepts an allowed seal image in the configured size range", () => {
    expect(() => validateSealUpload("image/png", 2048)).not.toThrow();
  });

  it("rejects unsupported file formats and oversized image data", () => {
    expect(() => validateSealUpload("application/pdf", 2048)).toThrow("JPG, PNG 또는 WEBP");
    expect(() => validateSealUpload("image/png", 8 * 1024 * 1024)).toThrow("7MB");
  });
});
