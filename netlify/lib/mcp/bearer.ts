export function checkBearer(req: Request): boolean {
  const expected = process.env.MCP_BEARER_TOKEN;
  if (!expected) return false;

  const header = req.headers.get("authorization");
  if (!header) return false;

  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  return match[1] === expected;
}
