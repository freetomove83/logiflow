import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./storage", () => ({
    storageGetSignedUrl: vi.fn(async (key: string) => key), 
  storagePut: vi.fn(async () => ({ key: "shipper-seals/8/active-test.png", url: "shipper-seals/8/active-test.png" })),
}));

vi.mock("./db", () => ({
  claimShipperInvite: vi.fn(),
  claimStaffInvite: vi.fn(),
  createCredentialAccount: vi.fn(),
  createShipperInvite: vi.fn(),
  createStaffInvite: vi.fn(),
  createTicketEvidence: vi.fn(),
  getCredentialAccountByBusinessAndContact: vi.fn(),
  getCredentialAccountByLoginId: vi.fn(),
  getShipperInviteByToken: vi.fn(),
  getStaffInviteByToken: vi.fn(),
  getShipperSealByUserId: vi.fn(),
  getUserByOpenId: vi.fn(),
  upsertShipperSeal: vi.fn(),
  upsertUser: vi.fn(),
}));

import { upsertShipperSeal } from "./db";
import { appRouter } from "./routers";
import { storagePut } from "./storage";

const testUser = {
  id: 8,
  openId: "seal-test-user",
  email: "seal@example.com",
  name: "Seal Test",
  loginMethod: "manus",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("seal.upload", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores a validated seal in S3 and records its metadata for the signed-in shipper", async () => {
    const caller = appRouter.createCaller({ user: testUser, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    const content = Buffer.from("seal-image-bytes");

    const result = await caller.seal.upload({
      fileName: "corporate-seal.png",
      contentType: "image/png",
      byteSize: content.length,
      base64: content.toString("base64"),
    });

    expect(storagePut).toHaveBeenCalledWith(expect.stringContaining("shipper-seals/8/"), content, "image/png");
    expect(upsertShipperSeal).toHaveBeenCalledWith(expect.objectContaining({ userId: 8, fileName: "corporate-seal.png", url: result.url }));
    expect(result.url).toBe("shipper-seals/8/active-test.png");
  });
});
