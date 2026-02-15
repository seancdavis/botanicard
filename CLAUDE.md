# Botanicard

Personal plant inventory system — houseplant tracking and garden season management.

## Stack

- **Framework:** Vite + React + TypeScript
- **Hosting:** Netlify with `@netlify/vite-plugin`
- **Database:** Netlify DB (Neon) with Drizzle ORM
- **Auth:** Neon Auth with Google OAuth + approved_users table
- **API:** Netlify Functions (modern default export syntax with `Config` object)
- **Styling:** Tailwind CSS v4 (using `@theme` in `src/index.css`)
- **Routing:** React Router (`react-router-dom`)
- **Icons:** Phosphor Icons (`@phosphor-icons/react`, always `weight="light"`)
- **Fonts:** Playfair Display (headings), Inter (UI/data)

## Project Structure

```
src/
  components/    # Shared UI components
  pages/         # Route pages organized by domain
    houseplants/
    planters/
    garden/
  lib/           # Utilities (api client, hooks)
  contexts/      # React contexts (auth, toast)
netlify/
  functions/     # API endpoints (Netlify Functions)
    _shared/     # Shared DB/auth utilities
drizzle/         # Migration files
```

## Key Conventions

- All API endpoints use modern Netlify Functions: `export default async (req: Request) => { ... }` + `export const config = { path: "..." }`
- Drizzle migrations use `prefix: 'timestamp'`
- Database schema lives in `netlify/functions/_shared/schema.ts`
- Design tokens defined in `src/index.css` `@theme` block
- Card components use: `rounded-xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-surface`
- Primary buttons: `bg-primary text-white rounded-md px-4 py-2`
- FAB buttons: `bg-accent text-white rounded-full`
- Status values — houseplants: active, archived, dead, given_away, sold
- Status values — planters: active, archived, broken, given_away, sold
- Status values — garden cells: seeded, sprouting, growing, transplanted, producing, harvested, dead

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Type-check and build
- `npx drizzle-kit generate` — Generate migration
- `npx drizzle-kit migrate` — Run migrations
- `npx drizzle-kit studio` — Database UI
