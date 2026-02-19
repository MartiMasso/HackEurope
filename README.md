# Paperwork OS (Vault + Packs)

A clean starter template for a document workflow web app built with:
- Next.js 14 App Router
- TypeScript (strict)
- Tailwind CSS
- Supabase (Auth, Postgres, Storage)

## Features

- Auth with email/password (`/login`)
- Protected app pages with sidebar navigation
- Upload documents to Supabase Storage bucket `vault`
- Persist document metadata to `documents` table
- Profile editor storing structured fields in `fields` table
- Deterministic mock field extraction pipeline (`extractFieldsFromDocument`)
- PDF pack generation with `pdf-lib`, saved to `packs` bucket + `packs` table
- Dashboard summary: profile completion, documents, generated packs
- Toast notifications, loading states, and basic error handling

## Routes

- `/` Landing page
- `/login` Authentication page
- `/dashboard` Profile completion + docs + packs overview
- `/upload` Upload documents
- `/profile` Edit structured profile fields
- `/packs` Generate and download pack PDFs

## Project structure

```text
.
├── .env.example
├── .eslintrc.json
├── .gitignore
├── README.md
├── next.config.mjs
├── next-env.d.ts
├── package.json
├── postcss.config.mjs
├── supabase
│   └── schema.sql
├── tailwind.config.ts
├── tsconfig.json
└── src
    ├── app
    │   ├── (app)
    │   │   ├── actions.ts
    │   │   ├── dashboard
    │   │   │   ├── actions.ts
    │   │   │   └── page.tsx
    │   │   ├── layout.tsx
    │   │   ├── loading.tsx
    │   │   ├── packs
    │   │   │   ├── actions.ts
    │   │   │   └── page.tsx
    │   │   ├── profile
    │   │   │   ├── actions.ts
    │   │   │   └── page.tsx
    │   │   └── upload
    │   │       ├── actions.ts
    │   │       └── page.tsx
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── loading.tsx
    │   ├── login
    │   │   ├── actions.ts
    │   │   └── page.tsx
    │   └── page.tsx
    ├── components
    │   ├── app-nav-link.tsx
    │   ├── query-toast.tsx
    │   └── submit-button.tsx
    └── lib
        ├── extraction
        │   └── extract.ts
        ├── packs
        │   └── generatePack.ts
        ├── profile
        │   └── definitions.ts
        ├── supabase
        │   ├── client.ts
        │   └── server.ts
        └── types.ts
```

## 1) Create Supabase project

1. Create a new Supabase project.
2. Open **Project Settings > API** and copy:
   - `Project URL`
   - `anon public` key
3. In **Authentication > Providers > Email**, enable Email provider.
4. For easiest local testing, disable "Confirm email" (optional but recommended for starter flow).

## 2) Configure environment variables

Copy `.env.example` to `.env.local` and fill values:

```bash
cp .env.example .env.local
```

Required vars:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## 3) Create schema, RLS and storage policies

Run `supabase/schema.sql` in Supabase SQL Editor.

This script creates:
- Tables: `documents`, `fields`, `packs`
- Indexes + unique constraint for `fields (user_id, key)`
- Row Level Security policies for all three tables
- Storage buckets: `vault`, `packs`
- Storage object policies scoped to `auth.uid()` folder ownership

## 4) Install dependencies and run app

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## 5) Typical flow

1. Create account or sign in at `/login`.
2. Upload a file in `/upload`.
3. From `/dashboard`, click **Extract fields** for a document.
4. Review/edit fields in `/profile`.
5. Generate a PDF pack in `/packs`, then download it.

## Implementation notes

- Protected pages are grouped in `src/app/(app)` and require a valid Supabase session.
- Field extraction is intentionally a mock interface in:
  - `src/lib/extraction/extract.ts`
- PDF generation uses `pdf-lib` in:
  - `src/lib/packs/generatePack.ts`
- Replace extraction internals with OCR/LLM later without changing page/server-action wiring.

## Scripts

- `npm run dev` Start local dev server
- `npm run build` Production build
- `npm run start` Start production server
- `npm run lint` Lint project
