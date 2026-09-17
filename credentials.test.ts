import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./credentials";

describe("credential password protection", () => {
  it("stores a salted scrypt record and verifies only the original password", async () => {
    const passwordHash = await hashPassword("Logiflow!2026");
    expect(passwordHash).toMatch(/^scrypt\$[^$]+\$[^$]+$/);
    expect(passwordHash).not.toContain("Logiflow!2026");
    await expect(verifyPassword("Logiflow!2026", passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("not-the-password", passwordHash)).resolves.toBe(false);
  });
});
