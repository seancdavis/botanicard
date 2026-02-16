import { eq } from "drizzle-orm";
import { db, approvedUsers } from "../../../db";

export interface AuthUser {
  email: string;
  name?: string;
  isAdmin: boolean;
}

export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.get("x-neon-auth-user");
  if (!authHeader) return null;

  let payload: { email?: string; name?: string };
  try {
    payload = JSON.parse(authHeader);
  } catch {
    return null;
  }

  if (!payload.email) return null;

  const [approved] = await db
    .select()
    .from(approvedUsers)
    .where(eq(approvedUsers.email, payload.email))
    .limit(1);

  if (!approved) return null;

  return {
    email: payload.email,
    name: payload.name || approved.name || undefined,
    isAdmin: approved.isAdmin === 1,
  };
}

export async function requireAuth(req: Request): Promise<AuthUser> {
  const user = await getAuthUser(req);
  if (!user) {
    throw Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}
