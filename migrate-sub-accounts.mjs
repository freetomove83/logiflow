import fs from "node:fs";
import postgres from "postgres";
const env = fs.readFileSync(new URL("./.env", import.meta.url), "utf8");
const url = env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, "");
const sql = postgres(url, { max: 1 });
const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'cs_tickets'`;
if (cols.some(c => c.column_name === "followedByUserId")) {
  console.log("followedByUserId already exists");
} else {
  await sql`ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS "followedByUserId" integer`;
  console.log("added cs_tickets.followedByUserId");
}
const accounts = await sql`SELECT "userId", "organizationType", "accountRole", "organizationName", "contactName", "loginId" FROM credential_accounts ORDER BY "userId"`;
console.log("accounts:", JSON.stringify(accounts));
await sql.end();
