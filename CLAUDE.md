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
  functions/       # API endpoints (Netlify Functions)
  lib/             # Shared server-side helpers (auth, etc.)
drizzle/           # Migration files
```

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

## Key Conventions

- All API endpoints use modern Netlify Functions: `export default requireAuth(async (req: Request, context: Context) => { ... })` + `export const config: Config = { path: "..." }`
- Import `Config` and `Context` types from `@netlify/functions`; import `requireAuth` from `../lib/auth`
- API functions must wrap the handler body in a try-catch that logs with `console.error` and returns a JSON error response with status 500
- Database accessed via singleton: `import { db, tableName } from "../../db"`
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
- Server-side tests mock `@netlify/identity`'s `getUser` to control auth state.
- The test config sets a fake `NETLIFY_DB_URL` so Drizzle's module-level init succeeds; tests must not actually query the database.

## Commands

- `npm run dev` — Start dev server (note: Identity does not work locally — deploy to a preview to test auth)
- `npm run build` — Type-check and build
- `npm test` — Run tests once
- `npm run test:watch` — Run tests in watch mode
- `npm run db:generate` — Generate migration
- `npm run db:migrate` — Run migrations (via `netlify dev:exec`)
- `npm run db:push` — Push schema directly (via `netlify dev:exec`)
- `npm run db:studio` — Database UI (via `netlify dev:exec`)
