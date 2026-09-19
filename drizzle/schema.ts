import { integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Columns use camelCase to match both database fields and generated types.
 */
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const organizationTypeEnum = pgEnum("organization_type", ["agency", "shipper"]);
export const accountRoleEnum = pgEnum("account_role", ["owner", "member"]);
export const inviteStatusEnum = pgEnum("invite_status", ["active", "claimed", "expired"]);
export const evidenceCategoryEnum = pgEnum("evidence_category", ["damage_photo", "damage_video", "price_proof"]);
export const settlementStatusEnum = pgEnum("settlement_status", ["submitted", "verified", "registered"]);
export const sealEventTypeEnum = pgEnum("seal_event_type", ["applied", "finalized"]);

export const users = pgTable("users", {
  /** Surrogate primary key. Identity column managed by the database. */
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  /** Local credential identity (`credential:<loginId>`). Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Per-person credentials for the agency and shipper portals. Passwords are stored only as salted hashes. */
export const credentialAccounts = pgTable("credential_accounts", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull().unique(),
  organizationType: organizationTypeEnum("organizationType").notNull(),
  accountRole: accountRoleEnum("accountRole").default("owner").notNull(),
  businessNumber: varchar("businessNumber", { length: 20 }).notNull(),
  organizationName: varchar("organizationName", { length: 255 }).notNull(),
  contactName: varchar("contactName", { length: 100 }).notNull(),
  loginId: varchar("loginId", { length: 48 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),  courier: varchar("courier", { length: 40 }),
  businessAddress: varchar("businessAddress", { length: 255 }).default("").notNull(),
  productCategory: varchar("productCategory", { length: 100 }).default("").notNull(),

});

export type CredentialAccount = typeof credentialAccounts.$inferSelect;
export type InsertCredentialAccount = typeof credentialAccounts.$inferInsert;

/** A single-shipper invitation. Its business number is verified before the invited owner creates credentials. */
export const shipperInvites = pgTable("shipper_invites", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  token: varchar("token", { length: 80 }).notNull().unique(),
  agencyUserId: integer("agencyUserId").notNull(),
  agencyName: varchar("agencyName", { length: 255 }).notNull(),
  shipperName: varchar("shipperName", { length: 255 }).notNull(),
  businessNumber: varchar("businessNumber", { length: 20 }).notNull(),
  status: inviteStatusEnum("status").default("active").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  claimedAt: timestamp("claimedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),  contractNumber: varchar("contractNumber", { length: 40 }).notNull().default(""),
  claimedByUserId: integer("claimedByUserId"),

});

export type ShipperInvite = typeof shipperInvites.$inferSelect;
export type InsertShipperInvite = typeof shipperInvites.$inferInsert;

/** One-time activation invitation for an additional agency or shipper staff member. */
export const staffInvites = pgTable("staff_invites", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  token: varchar("token", { length: 80 }).notNull().unique(),
  invitedByUserId: integer("invitedByUserId").notNull(),
  organizationType: organizationTypeEnum("organizationType").notNull(),
  organizationName: varchar("organizationName", { length: 255 }).notNull(),
  businessNumber: varchar("businessNumber", { length: 20 }).notNull(),
  contactName: varchar("contactName", { length: 100 }).notNull(),
  permissionsJson: text("permissionsJson").notNull(),
  status: inviteStatusEnum("status").default("active").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  claimedAt: timestamp("claimedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StaffInvite = typeof staffInvites.$inferSelect;
export type InsertStaffInvite = typeof staffInvites.$inferInsert;

/** Fine-grained console capabilities assigned by an agency owner to an agency staff account. */
export const accountPermissions = pgTable("account_permissions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull().unique(),
  permissionsJson: text("permissionsJson").notNull(),
  updatedByUserId: integer("updatedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AccountPermission = typeof accountPermissions.$inferSelect;
export type InsertAccountPermission = typeof accountPermissions.$inferInsert;

/** Evidence metadata for shipper CS requests. File bytes remain in S3-compatible object storage. */
export const ticketEvidence = pgTable("ticket_evidence", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull(),
  requestRef: varchar("requestRef", { length: 64 }).notNull(),
  category: evidenceCategoryEnum("category").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  url: varchar("url", { length: 768 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  contentType: varchar("contentType", { length: 128 }).notNull(),
  byteSize: integer("byteSize").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TicketEvidence = typeof ticketEvidence.$inferSelect;
export type InsertTicketEvidence = typeof ticketEvidence.$inferInsert;

/** The active corporate seal selected by a shipper. The binary is stored in object storage. */
export const shipperSeals = pgTable("shipper_seals", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull().unique(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  url: varchar("url", { length: 768 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  contentType: varchar("contentType", { length: 128 }).notNull(),
  byteSize: integer("byteSize").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ShipperSeal = typeof shipperSeals.$inferSelect;
export type InsertShipperSeal = typeof shipperSeals.$inferInsert;

/** Encrypted payout account material for a shipper. Only the bank and last four digits are suitable for operational views. */
export const shipperSettlementProfiles = pgTable("shipper_settlement_profiles", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: integer("userId").notNull().unique(),
  bank: varchar("bank", { length: 64 }).notNull(),
  accountHolder: varchar("accountHolder", { length: 100 }).notNull(),
  encryptedAccountNumber: text("encryptedAccountNumber").notNull(),
  accountLast4: varchar("accountLast4", { length: 4 }).notNull(),
  status: settlementStatusEnum("status").default("registered").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ShipperSettlementProfile = typeof shipperSettlementProfiles.$inferSelect;
export type InsertShipperSettlementProfile = typeof shipperSettlementProfiles.$inferInsert;

/** Audit events record document references only; the corporate seal asset itself remains private in object storage. */
export const documentSealEvents = pgTable("document_seal_events", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  shipperUserId: integer("shipperUserId").notNull(),
  actorUserId: integer("actorUserId").notNull(),
  documentRef: varchar("documentRef", { length: 96 }).notNull(),
  eventType: sealEventTypeEnum("eventType").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentSealEvent = typeof documentSealEvents.$inferSelect;
export type InsertDocumentSealEvent = typeof documentSealEvents.$inferInsert;

/** Download audit log for finalized document PDFs. It stores a document reference only, never the PDF or seal asset. */
export const documentDownloadEvents = pgTable("document_download_events", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  shipperUserId: integer("shipperUserId").notNull(),
  downloadedByUserId: integer("downloadedByUserId").notNull(),
  documentRef: varchar("documentRef", { length: 96 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentDownloadEvent = typeof documentDownloadEvents.$inferSelect;
export type InsertDocumentDownloadEvent = typeof documentDownloadEvents.$inferInsert;

export const shipperContacts = pgTable("shipper_contacts", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  shipperUserId: integer("shipperUserId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  department: varchar("department", { length: 100 }),
  phone: varchar("phone", { length: 40 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ShipperContact = typeof shipperContacts.$inferSelect;
export type InsertShipperContact = typeof shipperContacts.$inferInsert;
