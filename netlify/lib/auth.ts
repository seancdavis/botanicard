import type { Context } from "@netlify/functions";
import { getUser } from "@netlify/identity";

type Handler = (
  req: Request,
  context: Context,
) => Response | Promise<Response>;

export function requireAuth(handler: Handler): Handler {
  return async (req, context) => {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(req, context);
  };
}
