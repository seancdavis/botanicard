# Botanicard

Personal plant inventory system — houseplant tracking and garden season management.

## Stack

- **Framework:** Vite + React + TypeScript
- **Hosting:** Netlify with `@netlify/vite-plugin`
- **Database:** Netlify DB (Neon) with Drizzle ORM
- **API:** Netlify Functions (modern default export syntax with `Config` type)
- **Styling:** Tailwind CSS v4 (using `@theme` in `src/index.css`)
- **Routing:** React Router (`react-router-dom`)
- **Icons:** Phosphor Icons (`@phosphor-icons/react`, always `weight="light"`)
- **Fonts:** Playfair Display (headings), Inter (UI/data)

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
  contexts/        # React contexts (toast)
netlify/
  functions/       # API endpoints (Netlify Functions)
drizzle/           # Migration files
```

## Key Conventions

- All API endpoints use modern Netlify Functions: `export default async (req: Request, context: Context) => { ... }` + `export const config: Config = { path: "..." }`
- Import `Config` and `Context` types from `@netlify/functions`
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
- Status values — garden cells: seeded, sprouting, growing, transplanted, producing, harvested, dead

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Type-check and build
- `npm run db:generate` — Generate migration
- `npm run db:migrate` — Run migrations (via `netlify dev:exec`)
- `npm run db:push` — Push schema directly (via `netlify dev:exec`)
- `npm run db:studio` — Database UI (via `netlify dev:exec`)
