# Botanicard

Personal plant inventory system — houseplant tracking and garden season management. Single-user, auth via Netlify Identity.

## Stack

- **Framework:** Vite + React + TypeScript
- **Hosting:** Netlify with `@netlify/vite-plugin`
- **Auth:** Netlify Identity (`@netlify/identity`) — Google OAuth only, registration locked
- **Database:** Netlify DB (Neon) with Drizzle ORM
- **API:** Netlify Functions (modern default export syntax with `Config` type)
- **Styling:** Tailwind CSS v4 (using `@theme` in `src/index.css`)
- **Routing:** React Router (`react-router-dom`)
- **Testing:** Vitest
- **Icons:** Phosphor Icons (`@phosphor-icons/react`, always `weight="light"`)
- **Fonts:** Playfair Display (headings), Inter (UI/data)

## Skills

When working on this project, prefer guidance from the `netlify-skills` plugin:

- `netlify-skills:netlify-identity` — auth, login, route/function protection
- `netlify-skills:netlify-functions` — API endpoint patterns
- `netlify-skills:netlify-database` — Netlify DB / Drizzle
- `netlify-skills:netlify-blobs` — photo and file storage
- `netlify-skills:netlify-image-cdn` — serving and transforming images
- `netlify-skills:netlify-cli-and-deploy` — deployment and env vars

Do **not** consult `seancdavis-skills:auth-design` for this project — it recommends a different stack (Neon Auth) and is being reworked.

## Project Structure

```
db/
  index.ts         # Singleton db export + re-exports schema
  schema.ts        # Drizzle schema definitions
src/
  components/      # Shared UI components (barrel exported via index.ts)
  pages/           # Route pages organized by domain
    houseplants/
    planters/
    garden/
  lib/             # Utilities (api client, hooks)
  contexts/        # React contexts (auth, toast)
netlify/
  functions/       # API endpoints (thin routers; one file per resource)
  lib/             # Shared server-side helpers
    auth.ts        # requireAuth wrapper (Identity-based)
    errors.ts      # ServiceError + errorResponse helper
    services/      # Business logic, one file per domain
    mcp/           # MCP server protocol, tools, bearer auth, dispatcher
  tests/           # Server-side tests (separate from functions/ — see Testing)
drizzle/           # Migration files
.github/
  workflows/
    ci.yml         # GitHub Actions — runs tests + build on every PR
```

## Services Layer

Business logic lives in `netlify/lib/services/<domain>.ts`. Netlify Functions are thin routers that parse the request, call a service function, and translate the result (or thrown error) into a `Response`.

- Services return plain data (arrays, objects) — no `Response` objects, no HTTP concerns.
- Services throw `NotFoundError` (404), `ValidationError` (400), or a custom `ServiceError(message, status)` for any expected failure.
- Function handlers wrap the body in `try { ... } catch (err) { return errorResponse(err, "Scope name"); }`. The helper maps `ServiceError` instances to JSON responses with the right status; unexpected errors are logged with `console.error` and returned as 500.
- The MCP server (`netlify/lib/mcp/`) imports the same service functions directly — never via HTTP.

When adding a new domain: create `netlify/lib/services/<domain>.ts` first, write the service functions, then wire up a thin Netlify Function that calls them.

## Auth

- Single-user system. Registration is locked in Netlify Identity; only one user (Sean) is invited via the Netlify dashboard.
- Trust is delegated to Identity — if Identity says a request has a valid session, it's the authorized user. No user table, no email allowlist in code.
- Every Netlify Function is wrapped with `requireAuth` from `netlify/lib/auth.ts`:
  ```ts
  export default requireAuth(async (req, context) => { ... });
  ```
  `requireAuth` calls `getUser()` and returns `401 Unauthorized` if no session.
- UI routes are gated by `src/components/Layout.tsx` — unauthenticated visitors are redirected to `/login` with a `returnTo` query param.
- The API client (`src/lib/api.ts`) handles `401` by redirecting to `/login` (covers expired-session cases mid-session).
- Identity does **not** work with `netlify dev`. Auth changes must be tested on deploy previews using production Identity.

## MCP Server

A remote MCP server lives at `/api/mcp`, implemented in `netlify/functions/mcp.ts` with logic in `netlify/lib/mcp/`. AI agents (Claude.ai, Claude Code, etc.) connect with bearer auth and call tools that read or write through the existing service layer.

- **Auth:** bearer token via `MCP_BEARER_TOKEN` env var. NOT wrapped with `requireAuth` (that uses Identity cookies; agents have neither). If the env var is missing, every request is rejected.
- **Protocol:** JSON-RPC 2.0 over HTTP POST. Stateless — each request is independent. Supports `initialize`, `tools/list`, `tools/call`, and `ping`.
- **Tool scope:** read + create/update on houseplants, planters, garden cell groups, plus note creation/update and photo upload/retrieval. Deliberately **no delete tools** — destructive operations remain UI-only.
- **Audit logging:** every `tools/call` logs `[MCP] <toolName> <args>` and `[MCP] <toolName> ok|error: ...` via `console.info`. Visible in Netlify Function logs.
- **Adding a tool:** define it in `netlify/lib/mcp/tools.ts` with a JSON-Schema `inputSchema` and a handler that calls a service function. The handler may return plain data (wrapped as text content) or an explicit `{ content: [...] }` shape (used by `get_photo` to return image content).
- **Photo uploads:** the `upload_photo` MCP tool exists for small inline cases, but base64 in tool args eats LLM context and is capped by message-size limits. For full-size or local files, agents should hit `POST /api/mcp/upload?filename=<name>` (`netlify/functions/mcp-upload.ts`) directly with the same bearer token, `Content-Type: image/<type>`, and raw bytes. It returns `{ key }` in the same shape as the tool, so the returned key can be passed to `create_note` / `update_planter` etc. as usual. Subject to Netlify's ~6MB synchronous-function body cap.
- **Connecting a client:** Claude.ai's web Connectors UI requires OAuth 2.1 + PKCE and does not accept bearer tokens, so this server cannot be installed there. From Claude Desktop or Claude Code, connect via `~/Library/Application Support/Claude/claude_desktop_config.json` using the `mcp-remote` bridge. Add `mcpServers` as a **sibling of `preferences`** at the root (NOT nested inside `preferences` — Claude Desktop auto-populates that key for app state):
  ```json
  {
    "preferences": { ... existing Claude Desktop state ... },
    "mcpServers": {
      "botanicard": {
        "command": "npx",
        "args": [
          "-y",
          "mcp-remote",
          "https://<your-site>.netlify.app/api/mcp",
          "--header",
          "Authorization: Bearer ${BOTANICARD_MCP_TOKEN}"
        ],
        "env": { "BOTANICARD_MCP_TOKEN": "<token>" }
      }
    }
  }
  ```
  Cmd+Q Claude Desktop fully and reopen. Tools appear in the connectors picker. Bridge stderr lives at `~/Library/Logs/Claude/mcp-server-botanicard.log` when debugging.

## Key Conventions

- All API endpoints use modern Netlify Functions: `export default requireAuth(async (req: Request, context: Context) => { ... })` + `export const config: Config = { path: "..." }`
- Function handlers are thin routers — parse path/method, call service functions, return `Response.json(result)`. Do NOT put DB queries or business logic in handlers.
- Import `Config` and `Context` types from `@netlify/functions`; import `requireAuth` from `../lib/auth`; import `errorResponse` from `../lib/errors`
- Wrap the handler body in `try { ... } catch (err) { return errorResponse(err, "<Scope>"); }`
- Services accessed via `import { ... } from "../lib/services/<domain>"`
- Database accessed from services via singleton: `import { db, tableName } from "../../../db"`
- Use `Response.json()` for all JSON responses (not `new Response(JSON.stringify(...))`)
- In Drizzle `sql` template literals, `${table.column}` renders as just `"column"` without table qualification — use raw SQL table-qualified references (e.g. `"houseplants"."id"`) inside correlated subqueries to avoid ambiguous column errors
- Drizzle migrations use `prefix: 'timestamp'`
- Database schema lives in `db/schema.ts`
- Database env var: `NETLIFY_DATABASE_URL`
- Design tokens defined in `src/index.css` `@theme` block
- Card components use: `rounded-xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-surface`
- Primary buttons: `bg-primary text-white rounded-md px-4 py-2`
- FAB buttons: `bg-accent text-white rounded-full`
- List pages must destructure `error` from `useData` and render an error state using `EmptyState` with `WarningCircle` icon
- Empty states use the `EmptyState` component (`src/components/EmptyState.tsx`) — never raw divs
- Status values — houseplants: active, archived, dead, given_away, sold
- Status values — planters: active, archived, broken, given_away, sold
- Status values — garden cell groups: seeded, sprouting, growing, transplanted, producing, harvested, dead

## Testing

- Vitest is the test runner. Tests live next to source as `*.test.ts(x)`.
- **Exception:** tests for Netlify Functions go in `netlify/tests/`, not `netlify/functions/`. Netlify treats every top-level file in `netlify/functions/` as a deployable function and rejects names containing `.` (so `*.test.ts` adjacent to functions breaks the deploy).
- Server-side tests mock `@netlify/identity`'s `getUser` (auth) or the service modules (MCP) to control behavior without hitting the DB.
- The test config sets a fake `NETLIFY_DB_URL` so Drizzle's module-level init succeeds; tests must not actually query the database.
- CI runs `npm test` and `npm run build` on every PR via `.github/workflows/ci.yml`.

## Commands

- `npm run dev` — Start dev server (note: Identity does not work locally — deploy to a preview to test auth)
- `npm run build` — Type-check and build
- `npm test` — Run tests once
- `npm run test:watch` — Run tests in watch mode
- `npm run db:generate` — Generate migration
- `npm run db:migrate` — Run migrations (via `netlify dev:exec`)
- `npm run db:push` — Push schema directly (via `netlify dev:exec`)
- `npm run db:studio` — Database UI (via `netlify dev:exec`)
