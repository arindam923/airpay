import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "./db";
import { organization as orgTable, member } from "./schema";
import { randomBytes } from "node:crypto";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  plugins: [organization()],
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          try {
            const { member } = await import("./schema");
            const { eq } = await import("drizzle-orm");
            const rows = await db.select().from(member).where(eq(member.userId, session.userId)).limit(1);
            if (rows[0] && !session.activeOrganizationId) {
              return { data: { ...session, activeOrganizationId: rows[0].organizationId } };
            }
          } catch (err) {
            console.error("[auth] session org set failed:", err);
          }
          return { data: session };
        },
      },
    },
    user: {
      create: {
        after: async (user) => {
          try {
            const base = (user.name || user.email.split("@")[0] || "workspace")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");
            const slug = `${base || "workspace"}-${randomBytes(3).toString("hex")}`;
            const orgId = randomBytes(12).toString("hex");
            const now = new Date();
            await db.insert(orgTable).values({
              id: orgId,
              name: `${user.name || "My"}'s workspace`,
              slug,
              createdAt: now,
            });
            await db.insert(member).values({
              id: randomBytes(12).toString("hex"),
              organizationId: orgId,
              userId: user.id,
              role: "owner",
              createdAt: now,
            });
          } catch (err) {
            console.error("[auth] org auto-create failed:", err);
          }
        },
      },
    },
  },
});
