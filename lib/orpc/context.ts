import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { member } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { ENV_HEADER, normalizeEnvironment, type Environment } from "@/lib/environment";

export interface ORPCContext {
  headers: Headers;
  session: Awaited<ReturnType<typeof auth.api.getSession>> | null;
  organizationId: string | null;
  role: string | null;
  /** Active environment from the `x-airpay-env` header (sandbox by default). */
  environment: Environment;
}

export async function createORPCContext(headers: Headers): Promise<ORPCContext> {
  const session = await auth.api.getSession({ headers });
  const environment = normalizeEnvironment(headers.get(ENV_HEADER));
  let organizationId: string | null = null;
  let role: string | null = null;

  if (session?.user) {
    const db = await getDb();
    const memberships = await db
      .select()
      .from(member)
      .where(eq(member.userId, session.user.id));

    // Prefer the session's active organization, but fall back to the user's
    // first membership. Freshly created sessions can have a null
    // activeOrganizationId (org/member creation races session creation),
    // which otherwise makes every org-scoped call fail for a brand-new account.
    const activeId = session.session?.activeOrganizationId ?? null;
    const chosen =
      (activeId && memberships.find((m) => m.organizationId === activeId)) ||
      memberships[0];

    if (chosen) {
      organizationId = chosen.organizationId;
      role = chosen.role ?? null;
    }
  }

  return { headers, session, organizationId, role, environment };
}
