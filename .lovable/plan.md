## Goal

Port the uploaded `BNI_Ethan_MemberForm_2025.html` into this TanStack Start app as the home route — preserving the BNI red/navy/gold branding, 5-step wizard, member roster sidebar, and admin export bar. Submissions persist in Lovable Cloud (Postgres + Storage). Everything is public — no auth.

## Routes

- `/` (`src/routes/index.tsx`) — full page: hero, 5-step form, roster sidebar, footer. Replaces the current placeholder.
- `/api/public/members` (server route) — `GET` returns roster (id, name, profession, company, services[], photo_url, mobile, email, created_at); `POST` accepts a validated submission.
- `/api/public/members/$id` — `DELETE` removes a member (matches the original "delete" button on each card; public, since no auth was requested).
- `/api/public/members/export.csv` — streams CSV of all submissions for the export bar.

## Data model (Lovable Cloud)

Table `bni_members`:
- `id uuid pk`, `created_at timestamptz default now()`
- `first_name text`, `last_name text`, `profession text`, `tagline text`
- `company text`, `website text`, `services text[]`, `referral text`, `service_area text`
- `mobile text`, `email text`, `address text`, `whatsapp text`, `linkedin text`
- `notes text`
- `photo_url text`, `attachment_urls jsonb` (array of `{name, url, size, type}`)

RLS: `SELECT` and `INSERT` open to `anon`; `DELETE` open to `anon` (matches "no auth" choice). Documented in security memory as intentional.

Storage buckets (public read):
- `bni-photos` — profile headshots
- `bni-attachments` — designer reference files

## Implementation

1. **Enable Lovable Cloud** → run migration creating table, RLS policies, and the two public buckets with size/type limits.
2. **Design tokens** — add BNI palette (`--bni-red`, `--bni-navy`, `--bni-gold`, etc.) and Playfair Display + DM Sans imports to `src/styles.css` via `@theme inline` tokens. Keep oklch for the shadcn base tokens; BNI colors stay as hex variables since they're brand-fixed.
3. **Components** (under `src/components/bni/`):
   - `Navbar.tsx`, `Hero.tsx`, `Footer.tsx`
   - `MemberForm.tsx` — 5 steps (You, Business, Contact, Files, Review) with zod validation, progress bar, photo uploader (preview + 5MB cap), services tag input, attachments drop zone (10MB/file cap), review screen, success card.
   - `RosterPanel.tsx` — fetches members via TanStack Query, shows count pill, progress to 24, empty state, member cards with delete + photo badge, export bar (CSV / JSON / Print).
4. **Server fns / routes**:
   - `src/lib/members.functions.ts` — `listMembers`, `createMember` (zod-validated), `deleteMember`. `createMember` uploads base64 photo + attachments to storage via `supabaseAdmin` inside the handler, then inserts the row.
   - Public API routes wrap the same logic for `/api/public/members*` so external tools can also pull the roster.
5. **Wire `/`** to render Navbar → Hero → grid of `<MemberForm>` + `<RosterPanel>` → Footer. Set route `head()` with BNI-specific title, description, og tags.
6. **Validation** — zod schemas mirror the original required fields (firstName, lastName, profession, company, services ≥1, mobile, valid email). Client-side errors mimic the `.emsg` styling.
7. **Security memory** — record that `bni_members` is intentionally public read/write/delete for the chapter-internal roster collector.

## Technical notes

- Photos sent as base64 in the `createMember` payload; server decodes, uploads to `bni-photos/{uuid}.{ext}`, stores returned public URL.
- Attachments uploaded one-by-one with a 10MB guard server-side; failures reported per-file but don't abort the submission.
- Roster query uses `queryOptions` + `ensureQueryData` in the loader and `useSuspenseQuery` in `RosterPanel`. After successful submit, `queryClient.invalidateQueries(['members'])` refreshes the sidebar.
- CSV export built server-side from the same `listMembers` data; `Print Roster` triggers `window.print()` with print CSS hiding the form column.
- All BNI colors live as CSS custom properties; components use `bg-[var(--bni-red)]` style classes to stay within the design-token rule.

## Out of scope

- Auth, admin-only views, email notifications, PDF generation of the roster card itself.
