import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { COOKIE_NAME } from "../shared/const";
import { hashPassword } from "./credentials";

vi.mock("./db", () => ({
  claimShipperInvite: vi.fn(),
  claimStaffInvite: vi.fn(),
  createDocumentDownloadEvent: vi.fn(),
  createCredentialAccount: vi.fn(),
  createDocumentSealEvent: vi.fn(),
  createShipperInvite: vi.fn(),
  createStaffInvite: vi.fn(),
  createTicketEvidence: vi.fn(),
  getCredentialAccountByBusinessAndContact: vi.fn(),
  getCredentialAccountByLoginId: vi.fn(),
  getCredentialAccountByUserId: vi.fn(),
  getCredentialAccountsByOrganization: vi.fn(),
  getCredentialAccountsByBusinessNumber: vi.fn(),
  getAccountPermissionsByUserId: vi.fn(),
  getDocumentDownloadEventsByShipperUserId: vi.fn(),
  getDocumentSealEventsByShipperUserId: vi.fn(),
  getShipperInviteByToken: vi.fn(),
  getShipperInvitesByAgencyUserId: vi.fn(),
  getShipperSettlementProfileByUserId: vi.fn(),
  getStaffInviteByToken: vi.fn(),
  getShipperSealByUserId: vi.fn(),
  getUserByOpenId: vi.fn(),
  upsertShipperSeal: vi.fn(),
  upsertAccountPermissions: vi.fn(),
  upsertShipperSettlementProfile: vi.fn(),
  upsertUser: vi.fn(),
}));
vi.mock("./storage", () => ({ storagePut: vi.fn(), storageGetSignedUrl: vi.fn(async (key: string) => key) }));
vi.mock("./_core/sdk", () => ({ sdk: { createSessionToken: vi.fn(async () => "credential-session-token") } }));

import { claimShipperInvite, claimStaffInvite, createCredentialAccount, createDocumentDownloadEvent, createDocumentSealEvent, getAccountPermissionsByUserId, getCredentialAccountByLoginId, getCredentialAccountByUserId, getCredentialAccountsByBusinessNumber, getCredentialAccountsByOrganization, getDocumentDownloadEventsByShipperUserId, getDocumentSealEventsByShipperUserId, getShipperInviteByToken, getShipperInvitesByAgencyUserId, getShipperSettlementProfileByUserId, getStaffInviteByToken, getUserByOpenId, upsertAccountPermissions, upsertShipperSettlementProfile, upsertUser } from "./db";
import { sdk } from "./_core/sdk";
import { appRouter } from "./routers";

describe("auth.loginCredential", () => {
  beforeEach(() => vi.clearAllMocks());

  it("verifies a credential account and writes the standard secure session cookie", async () => {
    vi.mocked(getCredentialAccountByLoginId).mockResolvedValue({
      id: 1,
      userId: 8,
      organizationType: "agency",
      accountRole: "owner",
      businessNumber: "1234567890",
      organizationName: "서울중앙물류",
      contactName: "김대리",
      loginId: "seoul.ops",
      passwordHash: await hashPassword("Logiflow!2026"),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const cookie = vi.fn();
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { cookie } as TrpcContext["res"] });

    const result = await caller.auth.loginCredential({ loginId: "seoul.ops", password: "Logiflow!2026" });

    expect(result).toMatchObject({ success: true, organizationType: "agency", organizationName: "서울중앙물류" });
    expect(sdk.createSessionToken).toHaveBeenCalledWith("credential:seoul.ops", { name: "김대리" });
    expect(cookie).toHaveBeenCalledWith(COOKIE_NAME, "credential-session-token", expect.objectContaining({ httpOnly: true, secure: true, maxAge: 2_592_000_000 }));
  });

  it("creates a role-specific account with a password hash and immediately signs in the owner", async () => {
    vi.mocked(getCredentialAccountByLoginId).mockResolvedValue(undefined);
    vi.mocked(getShipperInviteByToken).mockResolvedValue({
      id: 7,
      token: "lf-valid-invite-token",
      agencyUserId: 4,
      agencyName: "서울중앙물류",
      shipperName: "에이블컴퍼니",
      businessNumber: "1234567890",
      status: "active",
      expiresAt: new Date(Date.now() + 60_000),
      claimedAt: null,
      createdAt: new Date(),
    });
    vi.mocked(getUserByOpenId).mockResolvedValue({
      id: 21,
      openId: "credential:shipper.cs",
      email: null,
      name: "박지수",
      loginMethod: "credential",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    const cookie = vi.fn();
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { cookie } as TrpcContext["res"] });

    const result = await caller.auth.registerCredential({ organizationType: "shipper", businessNumber: "1234567890", organizationName: "에이블컴퍼니", contactName: "박지수", loginId: "shipper.cs", password: "Logiflow!2026", inviteToken: "lf-valid-invite-token" });

    expect(result).toEqual({ success: true, organizationType: "shipper", loginId: "shipper.cs" });
    expect(upsertUser).toHaveBeenCalledWith(expect.objectContaining({ openId: "credential:shipper.cs", loginMethod: "credential" }));
    expect(createCredentialAccount).toHaveBeenCalledWith(expect.objectContaining({ organizationType: "shipper", accountRole: "owner", userId: 21, passwordHash: expect.not.stringContaining("Logiflow!2026") }));
    expect(claimShipperInvite).toHaveBeenCalledWith("lf-valid-invite-token");
    expect(cookie).toHaveBeenCalledWith(COOKIE_NAME, "credential-session-token", expect.objectContaining({ httpOnly: true, secure: true }));
  });

  it("rejects a shipper registration when the invite's business number differs", async () => {
    vi.mocked(getShipperInviteByToken).mockResolvedValue({ id: 7, token: "lf-valid-invite-token", agencyUserId: 4, agencyName: "서울중앙물류", shipperName: "에이블컴퍼니", businessNumber: "1234567890", status: "active", expiresAt: new Date(Date.now() + 60_000), claimedAt: null, createdAt: new Date() });
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { cookie: vi.fn() } as TrpcContext["res"] });
    await expect(caller.auth.registerCredential({ organizationType: "shipper", businessNumber: "0000000000", organizationName: "에이블컴퍼니", contactName: "박지수", loginId: "shipper.cs", password: "Logiflow!2026", inviteToken: "lf-valid-invite-token" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("activates a member account only after a matching staff invitation", async () => {
    vi.mocked(getCredentialAccountByLoginId).mockResolvedValue(undefined);
    vi.mocked(getStaffInviteByToken).mockResolvedValue({ id: 9, token: "staff-valid-invite-token", invitedByUserId: 4, organizationType: "agency", organizationName: "서울중앙물류", businessNumber: "1234567890", contactName: "이운영", permissionsJson: "[\"tickets.manage\",\"reports.view\"]", status: "active", expiresAt: new Date(Date.now() + 60_000), claimedAt: null, createdAt: new Date() });
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 22, openId: "credential:agency.member", email: null, name: "이운영", loginMethod: "credential", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() });
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { cookie: vi.fn() } as TrpcContext["res"] });
    await caller.auth.registerCredential({ organizationType: "agency", businessNumber: "1234567890", organizationName: "서울중앙물류", contactName: "이운영", loginId: "agency.member", password: "Logiflow!2026", staffInviteToken: "staff-valid-invite-token" });
    expect(createCredentialAccount).toHaveBeenCalledWith(expect.objectContaining({ accountRole: "member", userId: 22 }));
    expect(upsertAccountPermissions).toHaveBeenCalledWith(expect.objectContaining({ userId: 22, updatedByUserId: 4, permissionsJson: "[\"tickets.manage\",\"reports.view\"]" }));
    expect(claimStaffInvite).toHaveBeenCalledWith("staff-valid-invite-token");
  });
});

describe("auth.profile and organization access", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the signed-in credential account's organization type for role-aware navigation", async () => {
    vi.mocked(getCredentialAccountByUserId).mockResolvedValue({ id: 4, userId: 8, organizationType: "shipper", accountRole: "member", businessNumber: "1234567890", organizationName: "에이블컴퍼니", contactName: "박지수", loginId: "shipper.cs", passwordHash: "safe-hash", createdAt: new Date(), updatedAt: new Date() });
    const caller = appRouter.createCaller({ user: { id: 8, openId: "credential:shipper.cs", email: null, name: "박지수", loginMethod: "credential", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.auth.profile()).resolves.toMatchObject({ organizationType: "shipper", accountRole: "member", organizationName: "에이블컴퍼니", businessNumber: "1234567890", contactName: "박지수" });
  });

  it("blocks a shipper from issuing a new shipper invitation", async () => {
    vi.mocked(getCredentialAccountByUserId).mockResolvedValue({ id: 4, userId: 8, organizationType: "shipper", accountRole: "owner", businessNumber: "1234567890", organizationName: "에이블컴퍼니", contactName: "박지수", loginId: "shipper.cs", passwordHash: "safe-hash", createdAt: new Date(), updatedAt: new Date() });
    const caller = appRouter.createCaller({ user: { id: 8, openId: "credential:shipper.cs", email: null, name: "박지수", loginMethod: "credential", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.invites.create({ agencyName: "서울중앙물류", shipperName: "신규 화주", businessNumber: "9876543210" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("operations.shipper history", () => {
  beforeEach(() => vi.clearAllMocks());
  const shipperUser = { id: 8, openId: "credential:shipper.cs", email: null, name: "박지수", loginMethod: "credential", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
  const agencyUser = { id: 4, openId: "credential:agency.ops", email: null, name: "김대리", loginMethod: "credential", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

  it("stores only an encrypted settlement account value and a masked last-four field", async () => {
    vi.mocked(getCredentialAccountByUserId).mockResolvedValue({ id: 4, userId: 8, organizationType: "shipper", accountRole: "owner", businessNumber: "1234567890", organizationName: "에이블컴퍼니", contactName: "박지수", loginId: "shipper.cs", passwordHash: "safe-hash", createdAt: new Date(), updatedAt: new Date() });
    const caller = appRouter.createCaller({ user: shipperUser, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.operations.upsertSettlement({ bank: "신한은행", accountHolder: "에이블컴퍼니", accountNumber: "11012348821" })).resolves.toMatchObject({ success: true, accountLast4: "8821" });
    expect(upsertShipperSettlementProfile).toHaveBeenCalledWith(expect.objectContaining({ bank: "신한은행", accountLast4: "8821", encryptedAccountNumber: expect.not.stringContaining("11012348821") }));
  });

  it("records a document seal event only when the agency is linked to the shipper", async () => {
    vi.mocked(getCredentialAccountByUserId)
      .mockResolvedValueOnce({ id: 3, userId: 4, organizationType: "agency", accountRole: "owner", businessNumber: "1111111111", organizationName: "서울중앙물류", contactName: "김대리", loginId: "agency.ops", passwordHash: "safe-hash", createdAt: new Date(), updatedAt: new Date() })
      .mockResolvedValueOnce({ id: 4, userId: 8, organizationType: "shipper", accountRole: "owner", businessNumber: "1234567890", organizationName: "에이블컴퍼니", contactName: "박지수", loginId: "shipper.cs", passwordHash: "safe-hash", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(getShipperInvitesByAgencyUserId).mockResolvedValue([{ id: 2, token: "lf-agency-owned-token", agencyUserId: 4, agencyName: "서울중앙물류", shipperName: "에이블컴퍼니", businessNumber: "1234567890", status: "claimed", expiresAt: new Date(Date.now() + 60_000), claimedAt: new Date(), createdAt: new Date() }]);
    const caller = appRouter.createCaller({ user: agencyUser, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.operations.recordSealEvent({ shipperUserId: 8, documentRef: "LF-CA-20260827-021", eventType: "applied" })).resolves.toEqual({ success: true });
    expect(createDocumentSealEvent).toHaveBeenCalledWith(expect.objectContaining({ shipperUserId: 8, actorUserId: 4, eventType: "applied" }));
  });

  it("returns only the agency's own invited shipper ledger with masked settlement information", async () => {
    vi.mocked(getCredentialAccountByUserId).mockResolvedValue({ id: 3, userId: 4, organizationType: "agency", accountRole: "owner", businessNumber: "1111111111", organizationName: "서울중앙물류", contactName: "김대리", loginId: "agency.ops", passwordHash: "safe-hash", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(getShipperInvitesByAgencyUserId).mockResolvedValue([{ id: 2, token: "lf-agency-owned-token", agencyUserId: 4, agencyName: "서울중앙물류", shipperName: "에이블컴퍼니", businessNumber: "1234567890", status: "claimed", expiresAt: new Date(Date.now() + 60_000), claimedAt: new Date(), createdAt: new Date() }]);
    vi.mocked(getCredentialAccountsByBusinessNumber).mockResolvedValue([{ id: 4, userId: 8, organizationType: "shipper", accountRole: "owner", businessNumber: "1234567890", organizationName: "에이블컴퍼니", contactName: "박지수", loginId: "shipper.cs", passwordHash: "safe-hash", createdAt: new Date(), updatedAt: new Date() }]);
    vi.mocked(getShipperSettlementProfileByUserId).mockResolvedValue({ id: 1, userId: 8, bank: "신한은행", accountHolder: "에이블컴퍼니", encryptedAccountNumber: "ciphertext", accountLast4: "8821", status: "submitted", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(getDocumentSealEventsByShipperUserId).mockResolvedValue([]);
    vi.mocked(getDocumentDownloadEventsByShipperUserId).mockResolvedValue([]);
    const caller = appRouter.createCaller({ user: agencyUser, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.operations.agencyShipperHistory()).resolves.toEqual([expect.objectContaining({ token: "lf-agency-owned-token", settlement: expect.objectContaining({ bank: "신한은행", accountLast4: "8821" }), sealEvents: [] })]);
  });

  it("allows only finalized documents to be downloaded and writes a privacy-safe audit event", async () => {
    vi.mocked(getCredentialAccountByUserId).mockResolvedValue({ id: 4, userId: 8, organizationType: "shipper", accountRole: "owner", businessNumber: "1234567890", organizationName: "에이블컴퍼니", contactName: "박지수", loginId: "shipper.cs", passwordHash: "safe-hash", createdAt: new Date(), updatedAt: new Date() });
    const caller = appRouter.createCaller({ user: shipperUser, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    vi.mocked(getDocumentSealEventsByShipperUserId).mockResolvedValue([{ id: 1, shipperUserId: 8, actorUserId: 4, documentRef: "LF-CA-20260827-021", eventType: "applied", createdAt: new Date() }]);
    await expect(caller.operations.recordDocumentDownload({ documentRef: "LF-CA-20260827-021" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    vi.mocked(getDocumentSealEventsByShipperUserId).mockResolvedValue([{ id: 1, shipperUserId: 8, actorUserId: 4, documentRef: "LF-CA-20260827-021", eventType: "finalized", createdAt: new Date() }]);
    await expect(caller.operations.recordDocumentDownload({ documentRef: "LF-CA-20260827-021" })).resolves.toEqual({ success: true });
    expect(createDocumentDownloadEvent).toHaveBeenCalledWith({ shipperUserId: 8, downloadedByUserId: 8, documentRef: "LF-CA-20260827-021" });
  });

  it("summarizes settlement, signature and PDF download status without returning sensitive account data", async () => {
    vi.mocked(getCredentialAccountByUserId).mockResolvedValue({ id: 4, userId: 8, organizationType: "shipper", accountRole: "owner", businessNumber: "1234567890", organizationName: "에이블컴퍼니", contactName: "박지수", loginId: "shipper.cs", passwordHash: "safe-hash", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(getShipperSettlementProfileByUserId).mockResolvedValue({ id: 1, userId: 8, bank: "신한은행", accountHolder: "에이블컴퍼니", encryptedAccountNumber: "ciphertext", accountLast4: "8821", status: "submitted", createdAt: new Date(), updatedAt: new Date() });
    vi.mocked(getDocumentSealEventsByShipperUserId).mockResolvedValue([{ id: 1, shipperUserId: 8, actorUserId: 4, documentRef: "LF-CA-20260827-020", eventType: "applied", createdAt: new Date() }, { id: 2, shipperUserId: 8, actorUserId: 4, documentRef: "LF-CA-20260827-021", eventType: "finalized", createdAt: new Date() }]);
    vi.mocked(getDocumentDownloadEventsByShipperUserId).mockResolvedValue([{ id: 1, shipperUserId: 8, downloadedByUserId: 8, documentRef: "LF-CA-20260827-021", createdAt: new Date() }]);
    const caller = appRouter.createCaller({ user: shipperUser, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    const result = await caller.operations.shipperDocumentDashboard();
    expect(result).toMatchObject({ pendingSettlement: true, pendingSignatureDocuments: ["LF-CA-20260827-020"], finalizedDocuments: [expect.objectContaining({ documentRef: "LF-CA-20260827-021", downloadCount: 1 })] });
    expect(JSON.stringify(result)).not.toContain("ciphertext");
  });
});

describe("permissions.agencyMembers", () => {
  beforeEach(() => vi.clearAllMocks());
  const agencyOwner = { id: 4, openId: "credential:agency.ops", email: null, name: "김대리", loginMethod: "credential", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
  const ownerAccount = { id: 3, userId: 4, organizationType: "agency" as const, accountRole: "owner" as const, businessNumber: "1111111111", organizationName: "서울중앙물류", contactName: "김대리", loginId: "agency.ops", passwordHash: "safe-hash", createdAt: new Date(), updatedAt: new Date() };
  const memberAccount = { ...ownerAccount, id: 4, userId: 9, accountRole: "member" as const, contactName: "이운영", loginId: "agency.member" };

  it("permits the owner to save only a same-agency member's granular permissions", async () => {
    vi.mocked(getCredentialAccountByUserId).mockResolvedValueOnce(ownerAccount).mockResolvedValueOnce(ownerAccount).mockResolvedValueOnce(memberAccount);
    const caller = appRouter.createCaller({ user: agencyOwner, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.permissions.updateAgencyMember({ userId: 9, permissions: ["tickets.manage", "reports.view"] })).resolves.toEqual({ success: true });
    expect(upsertAccountPermissions).toHaveBeenCalledWith({ userId: 9, permissionsJson: "[\"tickets.manage\",\"reports.view\"]", updatedByUserId: 4 });
  });

  it("blocks a non-owner from accessing the agency member permission list", async () => {
    vi.mocked(getCredentialAccountByUserId).mockResolvedValue(memberAccount);
    const caller = appRouter.createCaller({ user: { ...agencyOwner, id: 9 }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.permissions.agencyMembers()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getCredentialAccountsByOrganization).not.toHaveBeenCalled();
    expect(getAccountPermissionsByUserId).not.toHaveBeenCalled();
  });
});

describe("invites.shipperSetup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the invited shipper's locked organization data without asking the shipper to re-enter it", async () => {
    vi.mocked(getShipperInviteByToken).mockResolvedValue({ id: 7, token: "lf-valid-invite-token", agencyUserId: 4, agencyName: "서울중앙물류", shipperName: "에이블컴퍼니", businessNumber: "1234567890", status: "active", expiresAt: new Date(Date.now() + 60_000), claimedAt: null, createdAt: new Date() });
    const caller = appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.invites.shipperSetup({ token: "lf-valid-invite-token" })).resolves.toMatchObject({ agencyName: "서울중앙물류", shipperName: "에이블컴퍼니", businessNumber: "1234567890" });
  });
});
