import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { accountPermissions, credentialAccounts, documentDownloadEvents, documentSealEvents, InsertAccountPermission, InsertCredentialAccount, InsertDocumentDownloadEvent, InsertDocumentSealEvent, InsertShipperInvite, ShipperInvite, InsertShipperSeal, InsertShipperSettlementProfile, InsertStaffInvite, InsertTicketEvidence, InsertUser, shipperInvites, shipperContacts, shipperSeals, shipperSettlementProfiles, staffInvites, ticketEvidence, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(postgres(process.env.DATABASE_URL, { prepare: false }));
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (ENV.adminLoginId && user.openId === `credential:${ENV.adminLoginId}`) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/** Persists a single staff credential record after its companion app user exists. */
export async function createCredentialAccount(account: InsertCredentialAccount) {
  const db = await getDb();
  if (!db) throw new Error("데이터베이스 연결을 확인할 수 없습니다.");
  await db.insert(credentialAccounts).values(account);
}

export async function getCredentialAccountByLoginId(loginId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(credentialAccounts).where(eq(credentialAccounts.loginId, loginId)).limit(1);
  return result[0];
}

export async function getCredentialAccountByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(credentialAccounts).where(eq(credentialAccounts.userId, userId)).limit(1);
  return result[0];
}

export async function getCredentialAccountByBusinessAndContact(businessNumber: string, contactName: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(credentialAccounts).where(and(
    eq(credentialAccounts.businessNumber, businessNumber),
    eq(credentialAccounts.contactName, contactName),
  )).limit(1);
  return result[0];
}

export async function createShipperInvite(invite: InsertShipperInvite) {
  const db = await getDb();
  if (!db) throw new Error("데이터베이스 연결을 확인할 수 없습니다.");
  await db.insert(shipperInvites).values(invite);
}

export async function getCredentialAccountsByBusinessNumber(businessNumber: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(credentialAccounts).where(eq(credentialAccounts.businessNumber, businessNumber));
}

export async function getCredentialAccountsByOrganization(organizationType: "agency" | "shipper", organizationName: string, businessNumber: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(credentialAccounts).where(and(eq(credentialAccounts.organizationType, organizationType), eq(credentialAccounts.organizationName, organizationName), eq(credentialAccounts.businessNumber, businessNumber)));
}

export async function getShipperInviteByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(shipperInvites).where(eq(shipperInvites.token, token)).limit(1);
  return result[0];
}

export async function claimShipperInvite(token: string, claimedByUserId?: number) {
  const db = await getDb();
  if (!db) throw new Error("데이터베이스 연결을 확인할 수 없습니다.");
  await db.update(shipperInvites).set({ status: "claimed", claimedAt: new Date(), claimedByUserId: claimedByUserId ?? null }).where(eq(shipperInvites.token, token));
}

export async function getShipperInvitesByAgencyUserId(agencyUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shipperInvites).where(eq(shipperInvites.agencyUserId, agencyUserId));
}

export async function createStaffInvite(invite: InsertStaffInvite) {
  const db = await getDb();
  if (!db) throw new Error("데이터베이스 연결을 확인할 수 없습니다.");
  await db.insert(staffInvites).values(invite);
}

export async function upsertAccountPermissions(permission: InsertAccountPermission) {
  const db = await getDb();
  if (!db) throw new Error("데이터베이스 연결을 확인할 수 없습니다.");
  await db.insert(accountPermissions).values(permission).onConflictDoUpdate({ target: accountPermissions.userId, set: { permissionsJson: permission.permissionsJson, updatedByUserId: permission.updatedByUserId, updatedAt: new Date() } });
}

export async function getAccountPermissionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(accountPermissions).where(eq(accountPermissions.userId, userId)).limit(1);
  return result[0];
}

export async function getStaffInviteByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(staffInvites).where(eq(staffInvites.token, token)).limit(1);
  return result[0];
}

export async function claimStaffInvite(token: string) {
  const db = await getDb();
  if (!db) throw new Error("데이터베이스 연결을 확인할 수 없습니다.");
  await db.update(staffInvites).set({ status: "claimed", claimedAt: new Date() }).where(eq(staffInvites.token, token));
}

/** Save only evidence metadata; file bytes are stored separately in object storage. */
export async function createTicketEvidence(evidence: InsertTicketEvidence) {
  const db = await getDb();
  if (!db) {
    throw new Error("데이터베이스 연결을 확인할 수 없습니다.");
  }
  await db.insert(ticketEvidence).values(evidence);
}

/** Replaces a shipper's active seal metadata after the image is saved in object storage. */
export async function upsertShipperSeal(seal: InsertShipperSeal) {
  const db = await getDb();
  if (!db) throw new Error("데이터베이스 연결을 확인할 수 없습니다.");
  await db.insert(shipperSeals).values(seal).onConflictDoUpdate({
    target: shipperSeals.userId,
    set: {
      fileKey: seal.fileKey,
      url: seal.url,
      fileName: seal.fileName,
      contentType: seal.contentType,
      byteSize: seal.byteSize,
      updatedAt: new Date(),
    },
  });
}

export async function getShipperSealByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(shipperSeals).where(eq(shipperSeals.userId, userId)).limit(1);
  return result[0];
}

export async function upsertShipperSettlementProfile(profile: InsertShipperSettlementProfile) {
  const db = await getDb();
  if (!db) throw new Error("데이터베이스 연결을 확인할 수 없습니다.");
  await db.insert(shipperSettlementProfiles).values(profile).onConflictDoUpdate({
    target: shipperSettlementProfiles.userId,
    set: { bank: profile.bank, accountHolder: profile.accountHolder, encryptedAccountNumber: profile.encryptedAccountNumber, accountLast4: profile.accountLast4, status: "registered", updatedAt: new Date() },
  });
}

export async function getShipperSettlementProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(shipperSettlementProfiles).where(eq(shipperSettlementProfiles.userId, userId)).limit(1);
  return result[0];
}

export async function deleteShipperSettlementProfile(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("데이터베이스 연결을 확인할 수 없습니다.");
  await db.delete(shipperSettlementProfiles).where(eq(shipperSettlementProfiles.userId, userId));
}

export async function createDocumentSealEvent(event: InsertDocumentSealEvent) {
  const db = await getDb();
  if (!db) throw new Error("데이터베이스 연결을 확인할 수 없습니다.");
  await db.insert(documentSealEvents).values(event);
}

export async function getDocumentSealEventsByShipperUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documentSealEvents).where(eq(documentSealEvents.shipperUserId, userId));
}

export async function createDocumentDownloadEvent(event: InsertDocumentDownloadEvent) {
  const db = await getDb();
  if (!db) throw new Error("데이터베이스 연결을 확인할 수 없습니다.");
  await db.insert(documentDownloadEvents).values(event);
}

export async function getDocumentDownloadEventsByShipperUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documentDownloadEvents).where(eq(documentDownloadEvents.shipperUserId, userId));
}

export async function truncateOperationalData() {
  const db = await getDb();
  if (!db) throw new Error("데이터베이스 연결을 확인할 수 없습니다.");
  await db.execute(sql`TRUNCATE TABLE document_download_events, document_seal_events, shipper_settlement_profiles, shipper_seals, ticket_evidence, account_permissions, staff_invites, shipper_invites, credential_accounts, users RESTART IDENTITY CASCADE`);
}

export async function getClaimedShipperInviteByBusinessNumber(businessNumber: string) {
  const db = await getDb();
  if (!db) throw new Error("database unavailable");
  const result = await db.select().from(shipperInvites).where(and(eq(shipperInvites.businessNumber, businessNumber), eq(shipperInvites.status, "claimed"))).limit(1);
  return result[0] ?? null;
}

export async function updateShipperInviteByOwner(id: number, agencyUserId: number, updates: Partial<InsertShipperInvite>) {
  const db = await getDb();
  if (!db) throw new Error("데이터베이스 연결을 확인할 수 없습니다.");
  const result = await db.update(shipperInvites).set(updates).where(and(eq(shipperInvites.id, id), eq(shipperInvites.agencyUserId, agencyUserId))).returning();
  return result[0];
}

export async function deleteShipperInviteByOwner(id: number, agencyUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("데이터베이스 연결을 확인할 수 없습니다.");
  const result = await db.delete(shipperInvites).where(and(eq(shipperInvites.id, id), eq(shipperInvites.agencyUserId, agencyUserId))).returning();
  return result[0];
}

export async function replaceShipperContacts(shipperUserId: number, contacts: { name: string; department: string; phone: string }[]) {
  const db = await getDb();
  if (!db) throw new Error("데이터베이스 연결을 확인할 수 없습니다.");
  await db.delete(shipperContacts).where(eq(shipperContacts.shipperUserId, shipperUserId));
  if (contacts.length) await db.insert(shipperContacts).values(contacts.map(contact => ({ shipperUserId, name: contact.name, department: contact.department, phone: contact.phone })));
}

export async function getShipperContactsByUserId(shipperUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shipperContacts).where(eq(shipperContacts.shipperUserId, shipperUserId)).orderBy(shipperContacts.id);
}

export async function getClaimedShipperInviteByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(shipperInvites).where(eq(shipperInvites.claimedByUserId, userId)).limit(1);
  return result[0];
}

export async function updateCredentialAccountCourier(userId: number, courier: string) {
  const db = await getDb();
  if (!db) throw new Error("데이터베이스 연결을 확인할 수 없습니다.");
  const result = await db.update(credentialAccounts).set({ courier }).where(eq(credentialAccounts.userId, userId)).returning();
  return result[0];
}

export async function deleteShipperWithInvite(invite: ShipperInvite): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("데이터베이스 연결을 확인할 수 없습니다.");
  const uid = invite.claimedByUserId;
  if (uid) {
    await db.delete(shipperContacts).where(eq(shipperContacts.shipperUserId, uid));
    await db.delete(shipperSettlementProfiles).where(eq(shipperSettlementProfiles.userId, uid));
    await db.delete(shipperSeals).where(eq(shipperSeals.userId, uid));
    await db.delete(documentSealEvents).where(eq(documentSealEvents.shipperUserId, uid));
    await db.delete(documentDownloadEvents).where(eq(documentDownloadEvents.shipperUserId, uid));
    await db.delete(ticketEvidence).where(eq(ticketEvidence.userId, uid));
    await db.delete(accountPermissions).where(eq(accountPermissions.userId, uid));
    await db.delete(credentialAccounts).where(eq(credentialAccounts.userId, uid));
    await db.delete(users).where(eq(users.id, uid));
  }
  await db.delete(shipperInvites).where(eq(shipperInvites.id, invite.id));
  return Boolean(uid);
}

