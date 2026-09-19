import { COOKIE_NAME } from "@shared/const";
import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { claimShipperInvite, claimStaffInvite, createCredentialAccount, createDocumentDownloadEvent, createDocumentSealEvent, createShipperInvite, createStaffInvite, createTicketEvidence, getAccountPermissionsByUserId, getClaimedShipperInviteByUserId, getCredentialAccountByBusinessAndContact, getCredentialAccountByLoginId, getCredentialAccountByUserId, getCredentialAccountsByOrganization, getDocumentDownloadEventsByShipperUserId, getDocumentSealEventsByShipperUserId, getShipperInviteByToken, deleteShipperInviteByOwner, getShipperInvitesByAgencyUserId, updateShipperInviteByOwner, getShipperSealByUserId, getShipperContactsByUserId, deleteShipperSettlementProfile, getShipperSettlementProfileByUserId, getStaffInviteByToken, getUserByOpenId, truncateOperationalData, upsertAccountPermissions, upsertShipperSeal, replaceShipperContacts, updateCredentialAccountCourier, upsertShipperSettlementProfile, upsertUser, deleteShipperWithInvite } from "./db";
import { hashPassword, verifyPassword } from "./credentials";
import { evidenceCategories, safeEvidenceFileName, validateEvidenceUpload } from "./evidence";
import { validateSealUpload } from "./seal";
import { encryptSensitiveValue } from "./sensitive";
import { storageGetSignedUrl, storagePut } from "./storage";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const agencyProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const account = await getCredentialAccountByUserId(ctx.user.id);
  if (ctx.user.role !== "admin" && account?.organizationType !== "agency") {
    throw new TRPCError({ code: "FORBIDDEN", message: "대리점 운영자만 이 기능을 사용할 수 있습니다." });
  }
  return next({ ctx });
});

const shipperProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const account = await getCredentialAccountByUserId(ctx.user.id);
  if (account?.organizationType !== "shipper") {
    throw new TRPCError({ code: "FORBIDDEN", message: "화주 담당자 계정으로만 이 기능을 사용할 수 있습니다." });
  }
  return next({ ctx });
});

const agencyPermissionKeys = ["tickets.manage", "compensation.review", "shippers.manage", "reports.view", "settings.manage", "documents.manage", "team.manage"] as const;
type AgencyPermissionKey = typeof agencyPermissionKeys[number];
const agencyPermissionSchema = z.enum(agencyPermissionKeys);
const allAgencyPermissions: AgencyPermissionKey[] = [...agencyPermissionKeys];

function parsePermissions(serialized?: string | null) {
  try {
    const parsed = JSON.parse(serialized ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is AgencyPermissionKey => agencyPermissionKeys.includes(item as AgencyPermissionKey)) : [];
  } catch {
    return [];
  }
}

async function canManageShipperDocument(actorUserId: number, actorRole: string, shipperUserId: number) {
  if (actorUserId === shipperUserId || actorRole === "admin") return true;
  const actor = await getCredentialAccountByUserId(actorUserId);
  const shipper = await getCredentialAccountByUserId(shipperUserId);
  if (actor?.organizationType !== "agency" || shipper?.organizationType !== "shipper") return false;
  const invites = await getShipperInvitesByAgencyUserId(actorUserId);
  return invites.some(invite => invite.businessNumber === shipper.businessNumber && invite.status === "claimed");
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
  admin: router({
    resetDemoData: protectedProcedure.mutation(async ({ ctx }) => {
      const account = await getCredentialAccountByUserId(ctx.user.id);
      if (ctx.user.role !== "admin" && account?.organizationType !== "agency") {
        throw new TRPCError({ code: "FORBIDDEN", message: "대리점 운영자만 테스트 데이터를 초기화할 수 있습니다." });
      }
      await truncateOperationalData();
      return { success: true } as const;
    }),
  }),
    me: publicProcedure.query(opts => opts.ctx.user),
    profile: protectedProcedure.query(async ({ ctx }) => {
      const account = await getCredentialAccountByUserId(ctx.user.id);
      return {
        organizationType: account?.organizationType ?? (ctx.user.role === "admin" ? "agency" : null),
        accountRole: account?.accountRole ?? (ctx.user.role === "admin" ? "owner" : null),
        organizationName: account?.organizationName ?? null,
        businessNumber: account?.businessNumber ?? null,
        courier: account?.courier ?? null,
        contactName: account?.contactName ?? ctx.user.name ?? null,
      } as const;
    }),
    updateCourier: protectedProcedure.input(z.object({ courier: z.string().trim().min(1).max(40) })).mutation(async ({ ctx, input }) => {
      await updateCredentialAccountCourier(ctx.user.id, input.courier);
      return { success: true, courier: input.courier } as const;
    }),
    registerCredential: publicProcedure.input(z.object({
      organizationType: z.enum(["agency", "shipper"]),
      businessNumber: z.string().regex(/^\d{10}$/, "사업자등록번호 10자리를 숫자로 입력해 주세요."),
      organizationName: z.string().trim().min(2).max(255),
      contactName: z.string().trim().min(2).max(100),
      loginId: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{6,48}$/, "아이디는 영문 소문자, 숫자, ., _, - 6~48자로 입력해 주세요."),
      password: z.string().min(10, "비밀번호는 10자 이상으로 설정해 주세요.").max(128),
      contacts: z.array(z.object({ name: z.string().trim().min(1).max(100), department: z.string().trim().max(100).default(""), phone: z.string().trim().max(40).default("") })).max(10).optional(),
      businessAddress: z.string().trim().max(255).optional(),
      productCategory: z.string().trim().max(100).optional(),
      inviteToken: z.string().trim().min(8).max(80).optional(),
      staffInviteToken: z.string().trim().min(8).max(80).optional(),
      courier: z.string().trim().min(1).max(40).optional(),
    })).mutation(async ({ ctx, input }) => {
      let accountRole: "owner" | "member" = "owner";
      let staffInvitePermissions: AgencyPermissionKey[] = [];
      let staffInviteActorUserId: number | undefined;
      if (input.staffInviteToken) {
        const staffInvite = await getStaffInviteByToken(input.staffInviteToken);
        if (!staffInvite || staffInvite.status !== "active" || staffInvite.expiresAt.getTime() < Date.now() || staffInvite.organizationType !== input.organizationType || staffInvite.businessNumber !== input.businessNumber) {
          throw new TRPCError({ code: "FORBIDDEN", message: "담당자 초대 링크 또는 사업자등록번호를 다시 확인해 주세요." });
        }
        accountRole = "member";
        staffInvitePermissions = parsePermissions(staffInvite.permissionsJson);
        staffInviteActorUserId = staffInvite.invitedByUserId;
      } else if (input.organizationType === "shipper") {
        if (!input.inviteToken) throw new TRPCError({ code: "FORBIDDEN", message: "화주 계정은 대리점의 유효한 초대 링크에서만 설정할 수 있습니다." });
        const invite = await getShipperInviteByToken(input.inviteToken);
        if (!invite || invite.status !== "active" || invite.expiresAt.getTime() < Date.now()) {
          throw new TRPCError({ code: "FORBIDDEN", message: "초대 링크 또는 사업자등록번호를 다시 확인해 주세요." });
        }
      }
      let courierToSave: string | undefined;
      if (input.organizationType === "agency") courierToSave = input.courier;
      else if (input.inviteToken) {
        const inviteForCourier = await getShipperInviteByToken(input.inviteToken);
        if (inviteForCourier) {
          const agencyAccountForCourier = await getCredentialAccountByUserId(inviteForCourier.agencyUserId);
          courierToSave = agencyAccountForCourier?.courier ?? undefined;
        }
      }
      const existing = await getCredentialAccountByLoginId(input.loginId);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요." });

      const openId = `credential:${input.loginId}`;
      await upsertUser({ openId, name: input.contactName, loginMethod: "credential", lastSignedIn: new Date() });
      const user = await getUserByOpenId(openId);
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "계정 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." });

      try {
        await createCredentialAccount({
          userId: user.id,
          organizationType: input.organizationType,
          accountRole,
          businessNumber: input.businessNumber,
          businessAddress: input.businessAddress ?? "",
          productCategory: input.productCategory ?? "",
          organizationName: input.organizationName,
          contactName: input.contactName,
          loginId: input.loginId,
          passwordHash: await hashPassword(input.password),
          courier: courierToSave ?? null,
        });
      } catch (error) {
        if (error instanceof Error && /duplicate|unique/i.test(error.message)) {
          throw new TRPCError({ code: "CONFLICT", message: "이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요." });
        }
        throw error;
      }

      if (input.organizationType === "shipper" && input.inviteToken) await claimShipperInvite(input.inviteToken, user.id);
      if (input.organizationType === "shipper" && input.contacts?.length) await replaceShipperContacts(user.id, input.contacts);
      if (input.organizationType === "agency" && accountRole === "member") {
        await upsertAccountPermissions({ userId: user.id, permissionsJson: JSON.stringify(staffInvitePermissions), updatedByUserId: staffInviteActorUserId ?? user.id });
      }
      if (input.staffInviteToken) await claimStaffInvite(input.staffInviteToken);

      const sessionToken = await sdk.createSessionToken(openId, { name: input.contactName });
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(ctx.req), maxAge: 1000 * 60 * 60 * 24 * 30 });
      return { success: true, organizationType: input.organizationType, loginId: input.loginId } as const;
    }),
    loginCredential: publicProcedure.input(z.object({
      loginId: z.string().trim().toLowerCase().min(1).max(48),
      password: z.string().min(1).max(128),
    })).mutation(async ({ ctx, input }) => {
      const account = await getCredentialAccountByLoginId(input.loginId);
      if (!account || !(await verifyPassword(input.password, account.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "아이디 또는 비밀번호를 다시 확인해 주세요." });
      }
      const sessionToken = await sdk.createSessionToken(`credential:${account.loginId}`, { name: account.contactName });
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(ctx.req), maxAge: 1000 * 60 * 60 * 24 * 30 });
      return { success: true, organizationType: account.organizationType, organizationName: account.organizationName, contactName: account.contactName } as const;
    }),
    lookupCredential: publicProcedure.input(z.object({
      businessNumber: z.string().regex(/^\d{10}$/, "사업자등록번호 10자리를 숫자로 입력해 주세요."),
      contactName: z.string().trim().min(2).max(100),
    })).mutation(async ({ input }) => {
      const account = await getCredentialAccountByBusinessAndContact(input.businessNumber, input.contactName);
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "입력하신 사업자번호와 담당자명으로 등록된 계정을 찾지 못했습니다." });
      const loginId = account.loginId;
      const maskedLoginId = loginId.length <= 4 ? `${loginId.slice(0, 1)}***` : `${loginId.slice(0, 3)}${"*".repeat(Math.max(2, loginId.length - 5))}${loginId.slice(-2)}`;
      return { organizationName: account.organizationName, maskedLoginId, organizationType: account.organizationType } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  invites: router({
    deleteShipper: agencyProcedure.input(z.object({ token: z.string().trim().min(8).max(80) })).mutation(async ({ ctx, input }) => {
      const invite = await getShipperInviteByToken(input.token);
      if (!invite || invite.agencyUserId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "삭제할 화주 연결을 찾을 수 없습니다." });
      const removedAccount = await deleteShipperWithInvite(invite);
      return { removedAccount } as const;
    }),
    create: agencyProcedure.input(z.object({
      agencyName: z.string().trim().min(2).max(255),
      shipperName: z.string().trim().min(2).max(255),
      contractNumber: z.string().trim().regex(/^[0-9A-Za-z-]{6,24}$/, "계약 택배 번호 6~24자를 입력해 주세요."),
    })).mutation(async ({ ctx, input }) => {
      const actorAccount = await getCredentialAccountByUserId(ctx.user.id);
      const agencyName = actorAccount?.organizationName || input.agencyName;
      const token = `lf-${randomUUID().replace(/-/g, "")}`;
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
      await createShipperInvite({ token, agencyUserId: ctx.user.id, agencyName, shipperName: input.shipperName, businessNumber: "", contractNumber: input.contractNumber, status: "active", expiresAt });
      return { token, expiresAt } as const;
    }),
    verify: publicProcedure.input(z.object({
      token: z.string().trim().min(8).max(80),
    })).mutation(async ({ input }) => {
      const invite = await getShipperInviteByToken(input.token);
      if (!invite || invite.status !== "active" || invite.expiresAt.getTime() < Date.now()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "초대 링크 또는 사업자등록번호를 다시 확인해 주세요." });
      }
      return { agencyName: invite.agencyName, shipperName: invite.shipperName, contractNumber: invite.contractNumber, expiresAt: invite.expiresAt } as const;
    }),
    list: agencyProcedure.query(async ({ ctx }) => {
      const invites = await getShipperInvitesByAgencyUserId(ctx.user.id);
      return invites.slice().sort((a, b) => b.id - a.id).map(invite => ({ id: invite.id, token: invite.token, shipperName: invite.shipperName, contractNumber: invite.contractNumber, status: invite.status, expiresAt: invite.expiresAt, claimedAt: invite.claimedAt, createdAt: invite.createdAt }));
    }),
    update: agencyProcedure.input(z.object({
      id: z.number().int().positive(),
      shipperName: z.string().trim().min(2).max(255),
      contractNumber: z.string().trim().regex(/^[0-9A-Za-z-]{6,24}$/, "계약 택배 번호 6~24자를 입력해 주세요."),
    })).mutation(async ({ ctx, input }) => {
      const invite = await updateShipperInviteByOwner(input.id, ctx.user.id, { shipperName: input.shipperName, contractNumber: input.contractNumber });
      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "수정할 초대 링크를 찾지 못했습니다." });
      return { success: true } as const;
    }),
    remove: agencyProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const invite = await deleteShipperInviteByOwner(input.id, ctx.user.id);
      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "삭제할 초대 링크를 찾지 못했습니다." });
      return { success: true } as const;
    }),
    shipperSetup: publicProcedure.input(z.object({ token: z.string().trim().min(8).max(80) })).query(async ({ input }) => {
      const invite = await getShipperInviteByToken(input.token);
      if (!invite || invite.expiresAt.getTime() < Date.now()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "유효하지 않거나 만료된 화주 초대 링크입니다." });
      }
      const agencyAccount = await getCredentialAccountByUserId(invite.agencyUserId);
      return { agencyName: agencyAccount?.organizationName || invite.agencyName, shipperName: invite.shipperName, contractNumber: invite.contractNumber, courier: agencyAccount?.courier ?? null, expiresAt: invite.expiresAt } as const;
    }),
    staffSetup: publicProcedure.input(z.object({ token: z.string().trim().min(8).max(80) })).query(async ({ input }) => {
      const invite = await getStaffInviteByToken(input.token);
      if (!invite || invite.status !== "active" || invite.expiresAt.getTime() < Date.now()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "유효하지 않거나 만료된 담당자 초대 링크입니다." });
      }
      return { organizationType: invite.organizationType, organizationName: invite.organizationName, businessNumber: invite.businessNumber, contactName: invite.contactName, expiresAt: invite.expiresAt } as const;
    }),
    createStaff: protectedProcedure.input(z.object({
      organizationType: z.enum(["agency", "shipper"]),
      organizationName: z.string().trim().min(2).max(255),
      businessNumber: z.string().regex(/^\d{10}$/, "사업자등록번호 10자리를 숫자로 입력해 주세요."),
      contactName: z.string().trim().min(2).max(100),
      permissions: z.array(agencyPermissionSchema).max(agencyPermissionKeys.length).optional(),
    })).mutation(async ({ ctx, input }) => {
      const account = await getCredentialAccountByUserId(ctx.user.id);
      const belongsToOrganization = account && account.organizationType === input.organizationType && account.organizationName === input.organizationName && account.businessNumber === input.businessNumber;
      if (ctx.user.role !== "admin" && !belongsToOrganization) {
        throw new TRPCError({ code: "FORBIDDEN", message: "소속된 조직의 담당자만 초대할 수 있습니다." });
      }
      if (input.organizationType === "agency" && ctx.user.role !== "admin" && account?.accountRole !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "대리점 대표 운영자만 직원을 초대할 수 있습니다." });
      }
      const token = `staff-${randomUUID().replace(/-/g, "")}`;
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
      const permissions = input.organizationType === "agency" ? Array.from(new Set(input.permissions ?? ["tickets.manage"])) : [];
      await createStaffInvite({ token, invitedByUserId: ctx.user.id, organizationType: input.organizationType, organizationName: input.organizationName, businessNumber: input.businessNumber, contactName: input.contactName, permissionsJson: JSON.stringify(permissions), status: "active", expiresAt });
      return { token, expiresAt } as const;
    }),
  }),
  permissions: router({
    agencyMembers: agencyProcedure.query(async ({ ctx }) => {
      const account = await getCredentialAccountByUserId(ctx.user.id);
      if (account?.accountRole !== "owner" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "대리점 대표 운영자만 직원 권한을 조회할 수 있습니다." });
      }
      if (!account) return [];
      const members = await getCredentialAccountsByOrganization("agency", account.organizationName, account.businessNumber);
      return Promise.all(members.map(async member => {
        const saved = await getAccountPermissionsByUserId(member.userId);
        return {
          userId: member.userId,
          contactName: member.contactName,
          loginId: member.loginId,
          accountRole: member.accountRole,
          permissions: member.accountRole === "owner" ? allAgencyPermissions : parsePermissions(saved?.permissionsJson),
          updatedAt: saved?.updatedAt ?? member.updatedAt,
        };
      }));
    }),
    updateAgencyMember: agencyProcedure.input(z.object({ userId: z.number().int().positive(), permissions: z.array(agencyPermissionSchema).max(agencyPermissionKeys.length) })).mutation(async ({ ctx, input }) => {
      const actor = await getCredentialAccountByUserId(ctx.user.id);
      if (actor?.accountRole !== "owner" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "대리점 대표 운영자만 세부 권한을 변경할 수 있습니다." });
      const member = await getCredentialAccountByUserId(input.userId);
      if (!member || member.organizationType !== "agency" || member.organizationName !== actor?.organizationName || member.businessNumber !== actor.businessNumber) throw new TRPCError({ code: "FORBIDDEN", message: "같은 대리점 소속 담당자의 권한만 변경할 수 있습니다." });
      if (member.accountRole === "owner") throw new TRPCError({ code: "FORBIDDEN", message: "대표 운영자의 전체 권한은 이 화면에서 변경할 수 없습니다." });
      await upsertAccountPermissions({ userId: member.userId, permissionsJson: JSON.stringify(Array.from(new Set(input.permissions))), updatedByUserId: ctx.user.id });
      return { success: true } as const;
    }),
  }),
  operations: router({
    upsertSettlement: shipperProcedure.input(z.object({
      bank: z.string().trim().min(2).max(64),
      accountHolder: z.string().trim().min(2).max(100),
      accountNumber: z.string().regex(/^\d{8,30}$/, "정산 계좌번호는 숫자 8~30자리로 입력해 주세요."),
    })).mutation(async ({ ctx, input }) => {
      await upsertShipperSettlementProfile({ userId: ctx.user.id, bank: input.bank, accountHolder: input.accountHolder, encryptedAccountNumber: encryptSensitiveValue(input.accountNumber), accountLast4: input.accountNumber.slice(-4), status: "registered" });
      return { success: true, accountLast4: input.accountNumber.slice(-4) } as const;
    }),
    deleteSettlement: shipperProcedure.mutation(async ({ ctx }) => {
      await deleteShipperSettlementProfile(ctx.user.id);
      return { success: true } as const;
    }),
    recordSealEvent: protectedProcedure.input(z.object({ shipperUserId: z.number().int().positive(), documentRef: z.string().trim().min(4).max(96), eventType: z.enum(["applied", "finalized"]) })).mutation(async ({ ctx, input }) => {
      if (!await canManageShipperDocument(ctx.user.id, ctx.user.role, input.shipperUserId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "연결되지 않은 화주의 문서 날인 이력을 기록할 수 없습니다." });
      }
      await createDocumentSealEvent({ shipperUserId: input.shipperUserId, actorUserId: ctx.user.id, documentRef: input.documentRef, eventType: input.eventType });
      return { success: true } as const;
    }),
    shipperDocumentDashboard: shipperProcedure.query(async ({ ctx }) => {
      const settlement = await getShipperSettlementProfileByUserId(ctx.user.id);
      const sealEvents = await getDocumentSealEventsByShipperUserId(ctx.user.id);
      const downloads = await getDocumentDownloadEventsByShipperUserId(ctx.user.id);
      const applied = new Set(sealEvents.filter(event => event.eventType === "applied").map(event => event.documentRef));
      const finalized = new Set(sealEvents.filter(event => event.eventType === "finalized").map(event => event.documentRef));
      const finalizedDocuments = Array.from(finalized).map(documentRef => {
        const documentDownloads = downloads.filter(event => event.documentRef === documentRef);
        return {
          documentRef,
          finalizedAt: sealEvents.filter(event => event.documentRef === documentRef && event.eventType === "finalized").at(-1)?.createdAt ?? new Date(),
          downloadCount: documentDownloads.length,
          lastDownloadedAt: documentDownloads.at(-1)?.createdAt ?? null,
        };
      });
      const account = await getCredentialAccountByUserId(ctx.user.id);
      const claimedInvite = await getClaimedShipperInviteByUserId(ctx.user.id);
      const agencyAccount = claimedInvite ? await getCredentialAccountByUserId(claimedInvite.agencyUserId) : null;
      return {
        pendingSettlement: !settlement,
        settlement: settlement ? { bank: settlement.bank, accountHolder: settlement.accountHolder, accountLast4: settlement.accountLast4, updatedAt: settlement.updatedAt } : null,
        pendingSignatureDocuments: Array.from(applied).filter(documentRef => !finalized.has(documentRef)),
        finalizedDocuments,
        downloadEvents: downloads.map(event => ({ documentRef: event.documentRef, createdAt: event.createdAt })),
        agencyName: agencyAccount?.organizationName || claimedInvite?.agencyName || null,
      };
    }),
    recordDocumentDownload: shipperProcedure.input(z.object({ documentRef: z.string().trim().min(4).max(96) })).mutation(async ({ ctx, input }) => {
      const events = await getDocumentSealEventsByShipperUserId(ctx.user.id);
      if (!events.some(event => event.documentRef === input.documentRef && event.eventType === "finalized")) throw new TRPCError({ code: "FORBIDDEN", message: "확정·날인된 문서만 PDF로 다운로드할 수 있습니다." });
      await createDocumentDownloadEvent({ shipperUserId: ctx.user.id, downloadedByUserId: ctx.user.id, documentRef: input.documentRef });
      return { success: true } as const;
    }),
    agencyShipperHistory: agencyProcedure.query(async ({ ctx }) => {
      const invites = await getShipperInvitesByAgencyUserId(ctx.user.id);
      const rows = await Promise.all(invites.map(async invite => {
        const owner = invite.claimedByUserId ? await getCredentialAccountByUserId(invite.claimedByUserId) : undefined;
        const settlement = owner ? await getShipperSettlementProfileByUserId(owner.userId) : undefined;
        const sealEvents = owner ? await getDocumentSealEventsByShipperUserId(owner.userId) : [];
        const downloadEvents = owner ? await getDocumentDownloadEventsByShipperUserId(owner.userId) : [];
        const contactRows = owner ? await getShipperContactsByUserId(owner.userId) : [];
        return {
          token: invite.token,
          businessNumber: owner?.businessNumber || invite.businessNumber || null,
          name: invite.shipperName,
          contractNumber: invite.contractNumber,
          businessAddress: owner?.businessAddress || null,
          productCategory: owner?.productCategory || null,
          inviteStatus: invite.status,
          invitedAt: invite.createdAt,
          expiresAt: invite.expiresAt,
          claimedAt: invite.claimedAt,
          contactCount: contactRows.length,
          contacts: contactRows.map(contact => ({ name: contact.name, department: contact.department, phone: contact.phone })),
          ownerUserId: owner?.userId ?? null,
          settlement: settlement ? { bank: settlement.bank, accountLast4: settlement.accountLast4, status: settlement.status, updatedAt: settlement.updatedAt } : null,
          sealEvents: sealEvents.map(event => ({ documentRef: event.documentRef, eventType: event.eventType, createdAt: event.createdAt })),
          downloadEvents: downloadEvents.map(event => ({ documentRef: event.documentRef, createdAt: event.createdAt })),
        };
      }));
      return rows;
    }),
  }),
  tracking: router({
    lookup: protectedProcedure.input(z.object({ trackingNumber: z.string().trim().regex(/^[0-9A-Za-z-]{6,24}$/, "송장번호 6~24자로 입력해 주세요.") })).query(async ({ ctx, input }) => {
      const account = await getCredentialAccountByUserId(ctx.user.id);
      const courier = account?.courier ?? null;
      return {
        trackingNumber: input.trackingNumber,
        courier,
        linked: false,
        message: courier ? `${courier} ${input.trackingNumber} 조회를 준비했습니다. 택배사 조회 API 연동 후 실시간 추적이 활성화됩니다.` : "본사 택배사가 지정되지 않았습니다. 대리점 설정에서 먼저 선택해 주세요.",
      } as const;
    }),
  }),
  evidence: router({
    upload: protectedProcedure.input(z.object({
      requestRef: z.string().min(4).max(64),
      category: z.enum(evidenceCategories),
      fileName: z.string().min(1).max(255),
      contentType: z.string().min(1).max(128),
      byteSize: z.number().int().positive(),
      base64: z.string().min(4).max(42 * 1024 * 1024),
    })).mutation(async ({ ctx, input }) => {
      validateEvidenceUpload(input.category, input.contentType, input.byteSize);
      const buffer = Buffer.from(input.base64, "base64");
      if (buffer.length !== input.byteSize) throw new Error("파일 크기 검증에 실패했습니다.");
      const fileName = safeEvidenceFileName(input.fileName);
      const { key, url } = await storagePut(`cs-evidence/${ctx.user.id}/${input.requestRef}/${input.category}-${Date.now()}-${fileName}`, buffer, input.contentType);
      await createTicketEvidence({ userId: ctx.user.id, requestRef: input.requestRef, category: input.category, fileKey: key, url, fileName: input.fileName, contentType: input.contentType, byteSize: input.byteSize });
      return { key, url: await storageGetSignedUrl(key), fileName: input.fileName };
    }),
  }),
  seal: router({
    /** Stores an authenticated shipper's active corporate seal in private project storage. */
    upload: protectedProcedure.input(z.object({
      fileName: z.string().min(1).max(255),
      contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      byteSize: z.number().int().positive().max(7 * 1024 * 1024),
      base64: z.string().min(4).max(10 * 1024 * 1024),
    })).mutation(async ({ ctx, input }) => {
      validateSealUpload(input.contentType, input.byteSize);
      const buffer = Buffer.from(input.base64, "base64");
      if (buffer.length !== input.byteSize) throw new Error("직인 파일 크기 검증에 실패했습니다.");
      const fileName = safeEvidenceFileName(input.fileName);
      const { key, url } = await storagePut(`shipper-seals/${ctx.user.id}/active-${Date.now()}-${fileName}`, buffer, input.contentType);
      await upsertShipperSeal({ userId: ctx.user.id, fileKey: key, url, fileName: input.fileName, contentType: input.contentType, byteSize: input.byteSize });
      return { key, url: await storageGetSignedUrl(key), fileName: input.fileName };
    }),
    /** Returns only the authenticated user's seal metadata with a fresh presigned read URL; cross-company access must be policy-gated by ticket ownership. */
    mine: protectedProcedure.query(async ({ ctx }) => {
      const seal = await getShipperSealByUserId(ctx.user.id);
      if (!seal) return undefined;
      return { ...seal, url: await storageGetSignedUrl(seal.fileKey) };
    }),
    /** Document preview lookup confirms that an agency is linked to the target shipper before returning private seal metadata. */
    forDocument: protectedProcedure.input(z.object({ ownerUserId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      if (!await canManageShipperDocument(ctx.user.id, ctx.user.role, input.ownerUserId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "직인 자료를 열람할 권한이 없습니다." });
      }
      const seal = await getShipperSealByUserId(input.ownerUserId);
      if (!seal) return undefined;
      return { ...seal, url: await storageGetSignedUrl(seal.fileKey) };
    }),
  }),
});

export type AppRouter = typeof appRouter;
