# BattleFIDs — Full Protocol Documentation

> Written 2026-06-15. Purpose: give an auditing agent or new developer complete context on the codebase, rules, state of the system, and what remains to build.

---

## 1. What Is BattleFIDs?

BattleFIDs is a **Farcaster mini-app card game** where every collectible card represents a real Farcaster identity (FID). Players:

1. **Open packs** to collect FID cards drawn live from the Faces PFP database.
2. **Build weekly fantasy teams** — 5 card slots per week — where each card's real Farcaster activity during that week determines their score.
3. **Compete in a weekly league** against other players, earning Protocol Points for performance.
4. **Collect** rare FIDs (low FID numbers are scarcer and more powerful).

The game operates inside Farcaster via the miniapp SDK — no wallet, no tokens, no on-chain activity. It is a pure engagement and skill game built on real social data.

---

## 2. Tech Stack

| Layer | Choice | Details |
|---|---|---|
| Framework | Next.js 16.2.7 | App Router, `route.ts` files, server components. **Read `node_modules/next/dist/docs/` before writing API code — breaking changes exist.** |
| Language | TypeScript (strict) | Run `npx tsc --noEmit` after every change |
| UI | React 19 | Inline styles throughout (no Tailwind, no CSS modules) |
| Database | Neon serverless PostgreSQL | `@neondatabase/serverless` via `sql` tagged template from `@/lib/db` |
| Identity | Farcaster mini-app SDK 0.3.0 | `@farcaster/miniapp-sdk`, `useMiniApp()` → `miniAppUser.fid` |
| PFP source | Faces API | `web-legoblocksapps.vercel.app` — external service, not in this repo |
| Social data | Neynar API | Follower count, Neynar score, power badge, cast data |
| Hosting | Vercel | Cron jobs defined in `vercel.json` |
| Auth (admin) | Neynar custody address | FID → Neynar custody → `isAdminAddress()` in `src/lib/adminAuth.ts` |

---

## 3. File Structure

```
src/
├── app/
│   ├── page.tsx                    # Root — Farcaster SDK gate, tab switcher, main layout
│   ├── admin/
│   │   ├── editions/page.tsx       # Admin: edition management UI
│   │   └── reports/page.tsx        # Admin: PFP report moderation queue
│   ├── api/
│   │   ├── admin/
│   │   │   ├── check/route.ts      # GET — verify FID is admin (Neynar custody lookup)
│   │   │   └── reports/
│   │   │       ├── route.ts        # GET — list pfp_reports
│   │   │       └── [id]/route.ts   # PATCH — block/dismiss a report
│   │   ├── browse/route.ts         # GET — paginated card list with blocklist applied
│   │   ├── client-ping/route.ts    # POST — upsert player row, award app_add points
│   │   ├── cron/
│   │   │   ├── tier/route.ts       # GET — daily tier assignment (6:00 UTC)
│   │   │   └── score/route.ts      # GET — weekly scoring run (Monday 00:00 UTC)
│   │   ├── editions/
│   │   │   ├── route.ts            # GET list / POST create edition
│   │   │   ├── [id]/route.ts       # PATCH update edition
│   │   │   └── slots/route.ts      # GET edition bonus slot definitions
│   │   ├── home/stats/route.ts     # GET — home page stats (60s revalidate)
│   │   ├── migrate/                # One-shot migration routes (safe to re-run)
│   │   │   ├── route.ts            # Full schema reset + edition seed
│   │   │   ├── league/route.ts     # League tables + players table
│   │   │   ├── pfp-moderation/route.ts  # pfp_blocklist + pfp_reports tables
│   │   │   ├── player-wallets/route.ts  # player_wallets table
│   │   │   └── (others)            # Additional additive migrations
│   │   ├── neynar/
│   │   │   ├── address/route.ts    # GET — FID → custody address (for admin auth)
│   │   │   └── users/route.ts      # GET — batch Neynar user lookup
│   │   ├── opt-out/pfp/route.ts    # POST — FID opts out of having cards in the game
│   │   ├── packs/route.ts          # POST — open a pack, save to DB, return cards
│   │   ├── players/
│   │   │   ├── route.ts            # GET — player profile + protocol points
│   │   │   └── wallets/route.ts    # GET/POST — linked wallets
│   │   ├── profile/[fid]/route.ts  # GET — single FID card data
│   │   ├── referral/route.ts       # POST — apply referral code
│   │   ├── report/pfp/route.ts     # POST — submit PFP report (auto-suspends image)
│   │   └── week/
│   │       ├── edition-pick/       # GET/POST — edition bonus slot picks
│   │       ├── leaderboard/route.ts # GET — weekly leaderboard
│   │       ├── score/route.ts       # GET — current week team score preview
│   │       └── team/route.ts        # GET/POST — weekly team slots
├── components/
│   ├── CardModal.tsx               # Full-screen card viewer + PFP report form
│   ├── CardTile.tsx                # Compact card display
│   ├── HomePage.tsx                # Home tab: stats, winners, CTA, leaderboard, how-to
│   ├── Leaderboard.tsx             # Weekly leaderboard list
│   ├── PackOpener.tsx              # Pack opening UX + global recent pulls feed
│   ├── ProfileView.tsx             # Player profile: points, tier, history
│   ├── TeamBuilder.tsx             # Weekly team draft UI
│   └── WeekProgress.tsx            # Live week score tracking
├── lib/
│   ├── adminAuth.ts                # isAdminAddress() — hardcoded admin wallet list
│   ├── badges.ts                   # Badge logic helpers
│   ├── battle.ts                   # Battle scoring helpers
│   ├── cardBuilder.ts              # buildCard() — assembles BattleFIDCard from Faces + Neynar data
│   ├── collection.ts               # Load player's owned cards
│   ├── db.ts                       # Neon sql tagged template export
│   ├── debug.ts                    # Dev-only debug helpers
│   ├── editionDb.ts                # Edition DB ↔ TypeScript type conversion; EDITION_SEEDS
│   ├── faces.ts                    # fetchFaces() — calls Faces API
│   ├── moderation.ts               # loadBlocklist() + applyBlocklist()
│   ├── neynar.ts                   # fetchNeynarUsers(), fetchWeeklyStats(), etc.
│   ├── pack.ts                     # openPack() — pulls 10 random FIDs from Faces
│   ├── packTiers.ts                # Pack tier definitions (scroll/tablet/codex)
│   ├── points.ts                   # POINTS constants + awardPoints() + upsertPlayer()
│   ├── valuation.ts                # Card valuation helpers
│   └── weeklyScoring.ts            # Week ID math + score formulas
├── types/
│   ├── badge.ts
│   ├── card.ts                     # BattleFIDCard, RarityTier, CardType, CardStats
│   ├── faces.ts                    # FidTimeline, FaceImage types
│   ├── league.ts                   # SlotType, PlayerTier, PointsAction, Player, WeeklyTeamSlots
│   └── neynar.ts                   # NeynarUser, CastEngagement
└── editions/
    ├── index.ts                    # Active edition export
    ├── types.ts                    # Edition TypeScript interface
    ├── base/config.ts              # Base edition visual config
    ├── 2026-rome/config.ts         # Roman themed edition
    └── builders/config.ts          # Builders edition
```

---

## 4. Database Schema

### Core tables (created by `/api/migrate`)

**`cards`** — one row per FID ever seen. The card IS the FID globally.
```
fid (PK), pfp_url, pfp_urls[], thumb_url, handle, display_name,
max_supply (= fid), rarity, stats (JSONB), battle_score,
like_count, has_badge, card_type, wins, losses, stored_at
```

**`packs`** — each pack opening event.
```
id (UUID PK), owner_fid, owner_device_id, tier, opened_at
```

**`owned_cards`** — junction: which player owns which serial of which FID.
```
id (UUID PK), pack_id (FK packs), fid (FK cards), owner_fid,
owner_device_id, serial_number, is_edition_1of1, edition_id, opened_at
```

**`edition_1of1s`** — one special edition-themed card per FID per edition.
```
fid, edition_id (composite PK), claimed, pack_id, owner_fid, owner_device_id
```

**`weeks`** — one row per ISO week.
```
id (TEXT PK, e.g. '2026-W25'), starts_at, ends_at, computed_at
```
`computed_at IS NOT NULL` = scoring has run for that week.

**`weekly_teams`** — one row per player per week once they lock a team.
```
id (UUID PK), week_id, owner_fid, owner_device_id,
captain_fid, broadcaster_fid, publisher_fid, agitator_fid, networker_fid,
total_score, rank, slot_points, chosen_tier, assigned_group,
followers_baseline, score_baseline, avg_team_score, updated_at
UNIQUE(week_id, owner_fid), UNIQUE(week_id, owner_device_id)
```

**`weekly_card_scores`** — per-FID score cache per week.
```
id (UUID PK), week_id, fid, card_type, raw_score, normalized_score, computed_at
UNIQUE(week_id, fid)
```

**`xplora_balances`** — Xplora credits per FID (reserved, always 0 until wired).
```
owner_fid (PK), credits, updated_at
```

### Player / points tables (created by `/api/migrate/league`)

**`players`** — one row per identity (FID or device).
```
id (UUID PK), owner_fid (UNIQUE), owner_device_id (UNIQUE),
protocol_points, tier (beginner|confident|pro), locked_to_pro,
total_wins, total_losses, referral_code, referred_by, updated_at
```

**`protocol_points_log`** — immutable audit log of every points event.
```
id (UUID PK), owner_fid, device_id, action, points, meta (JSONB), created_at
```

### Moderation tables (created by `/api/migrate/pfp-moderation`)

**`pfp_blocklist`** — images hidden from all cards.
```
fid, image_url (composite PK), reason ('suspended'|'admin_block'|'user_opt_out'), created_at
```

**`pfp_reports`** — user-submitted reports.
```
id (SERIAL PK), fid, image_url, reason (TEXT), reporter_fid,
reported_at, resolved (BOOLEAN), resolution ('block'|'dismiss')
```

### Edition bonus tables (created by `/api/migrate/edition-slots`)

**`edition_bonus_slots`** — slot definitions per edition (e.g. "Top Embedder").
```
id, edition_id, slot_key, label, emoji, description, metric_type, sort_order
```

**`weekly_edition_picks`** — player's bonus slot picks per week.
```
id, week_id, edition_id, slot_key, owner_fid, owner_device_id,
card_fid, score_value, slot_points, rank
```

---

## 5. Card System

### Identity model
Each card represents exactly one Farcaster FID. `fid` is the primary key. A player can own multiple serial copies of the same FID card (serial_number 1…fid). `max_supply = fid` — so FID 1 has only 1 possible copy ever, FID 10000 has 10000 possible copies.

### Rarity by FID range
```
Alpha      → FID 1–10
Legendary  → FID 11–100
Elite      → FID 101–1000
Rare       → FID 1001–10000
Common     → FID 10001+
```
Edition-specific rarity names (e.g. Imperator/Senator/Centurion in Rome edition) are cosmetic aliases — the underlying tiers are fixed.

### Card stats (all 0–100, normalized)
```
supplyRarity   — FID-based, log-normalized. Lower FID = higher score. Fixed forever.
followerPower  — Neynar follower_count, log-normalized.
neynarForce    — Neynar score × 100.
castActivity   — reply interactivity from Neynar (30-day window).
badgeScore     — power badge (score ≥ 0.5) + verifications + following count.
pfpFreshness   — recency of latest PFP stored in Faces (decays over 365 days).
xploraXP       — reserved, always 0.
```

### Battle score
Weighted blend: `supplyRarity×0.25 + followerPower×0.20 + neynarForce×0.20 + castActivity×0.10 + badgeScore×0.10 + pfpFreshness×0.15`

### Card type classification
Assigned at pack-open time based on Neynar stats:
```
BROADCASTER — score ≥ 0.6 AND followers ≥ 8000   (viral reach)
PUBLISHER   — power_badge AND verified AND followers ≥ 500 (quality content)
AGITATOR    — replies ≥ 15 (debate starter)
NETWORKER   — everything else (default)
CAPTAIN     — any card can be used in the Captain slot; type = CAPTAIN in that context
```

### PFP cycling
Each card stores an array of historical PFP URLs (`pfp_urls[]`). In the card viewer, these cycle as an animation — the card IS the FID, and you see their identity history.

---

## 6. Pack System

### Pack opening (`src/lib/pack.ts`)
1. Probe Faces API for total available FIDs.
2. Pick a random `offset` across `totalFids - 40`.
3. Fetch 40 FIDs from Faces.
4. Shuffle, take first 10.
5. Batch-fetch Neynar data for those FIDs.
6. `buildCard()` each one → return 10 `BattleFIDCard`.

### Pack tiers (defined in `src/lib/packTiers.ts`, edition-themed names in `editionDb.ts`)
| Tier | Base name | Cards | Weight |
|---|---|---|---|
| scroll | SCROLL | 3 | Common-weighted |
| tablet | TABLET | 5 | No common |
| codex | CODEX | 10 | Rare minimum |

> **Note:** Pack tiers beyond `scroll` are defined but the current UI only opens a single 10-card pack regardless. The tier UI may not be wired to change actual weighted pulls.

### Pack open → DB
`POST /api/packs` inserts a row into `packs`, then inserts one `owned_cards` row per card (with serial number assigned based on existing count for that FID). Awards `pack_open` protocol points (10 pts).

### Edition 1/1s
A special mechanic: one card per FID per edition is marked as a 1/1. First pack pull that lands on an unclaimed 1/1 claims it. UI shows "✦ 1/1" badge. Not fully rolled out — `edition_1of1s` table exists, seed/claim logic is partially implemented.

---

## 7. League / Weekly Competition

### Week timing
- ISO week IDs: `2026-W25` format, Monday 00:00 UTC start, Sunday 23:59 UTC end.
- All week math in `src/lib/weeklyScoring.ts`.

### Team building (`src/components/TeamBuilder.tsx`)
Players draft 5 slots from their owned collection:
```
CAPTAIN      — any card, rarity multiplies team total
BROADCASTER  — best card scored on recasts received
PUBLISHER    — best card scored on likes received
AGITATOR     — best card scored on replies received
NETWORKER    — best card scored on replies sent
```

Validation: must own the card. Once a team row exists in `weekly_teams`, it is **permanently locked** for that week — `isLocked = true` on any existing row (set at `TeamBuilder.tsx:127`).

Players choose a tier at lock-in:
- `beginner` — safe, score-band protected group
- `confident` — 50/50 random assignment to beginner or pro (revealed post-lock)
- `pro` — open pool vs everyone

### Cron: tier assignment (`/api/cron/tier` — daily 06:00 UTC)
Runs each day. Resolves `confident` players: assigns them `beginner` or `pro` group randomly (`assigned_group`). Also computes `avg_team_score` from players' owned cards (average battle_score) used as tiebreaker.

### Cron: weekly scoring (`/api/cron/score` — Monday 00:00 UTC)
Scores the week that just ended (`prevWeekId()`). Idempotent — skips if `computed_at` already set.

**Scoring algorithm:**
1. Load all locked teams (`casts_fid IS NOT NULL`).
2. Collect all FIDs used across all slots.
3. Batch-fetch Neynar weekly stats (recasts, likes, replies sent/received, cast count).
4. Per group (beginner/pro), per slot, rank teams by that slot's metric.
5. **Points per slot = number of teams beaten in that slot.**
6. Sum slot points = team's `slot_points` / `total_score`.
7. Rank within group by slot_points, tiebreak by avg_team_score.
8. Top half of each group = "win."

**Points awarded during scoring:**
- `week_played` (+20) — everyone who had a locked team
- `slot_beat` (+1 × number beaten) — per slot performance
- `overall_win` (+50) — top-half finish
- `rare_card_bonus` (+25) — any slot FID ≤ 100

### Edition bonus slots
Optionally, editions can define extra competition slots (e.g. "Top Embedder") with different metric types (`neynar_embed_casts`, `neynar_total_reactions`, etc.). Players pick a card for each. Scored in the same cron run after the main scoring pass.

### Leaderboard
`/api/week/leaderboard` — returns current week's `weekly_teams` ordered by `slot_points DESC`. Shows rank, owner handle, slot points, group (Beginner/Pro).

Footer: `N of M · Pts: 1/beat per slot · +50 overall win · +25 rare card (FID ≤100) · +20 entry · updated end of week`

---

## 8. Protocol Points

Accumulated cross-week in `players.protocol_points`. All events logged to `protocol_points_log`.

| Action | Points | When |
|---|---|---|
| `app_add` | 50 | First time opening the mini-app (via client-ping on mount) |
| `pack_open` | 10 | Each pack opened |
| `team_lock` | 15 | First team submission per week (not re-saves) |
| `week_played` | 20 | Having a locked team when scoring runs |
| `overall_win` | 50 | Top-half finish in your tier group |
| `rare_card_bonus` | 25 | Team contains a FID ≤ 100 card |
| `share` | 5 | (Manual trigger — not yet wired to a share button) |
| `invite_sent` | 100 | When a referred player joins via your code |
| `slot_beat` | 1 × N | N = people beaten in each slot |

---

## 9. Edition System

Three built-in editions with distinct visual themes, rarity names, slot labels, and captain multipliers. Editions are stored in the `editions` DB table and seeded from `EDITION_SEEDS` in `src/lib/editionDb.ts`.

| Edition ID | Name | Theme | Accent |
|---|---|---|---|
| `base` | The Protocol | Default Farcaster purple | #8a63d2 |
| `2026-rome` | 2026 Edition | Roman imperial gold | #C9A84C |
| `builders` | Builders Edition | Green/cyan build season | #22c55e |

**Edition rarity name mappings:**
- Base: GENESIS / ORACLE / NODE / VALIDATOR / CASTER
- Rome: IMPERATOR / SENATOR / CENTURION / LEGIONARY / CITIZEN
- Builders: ARCHITECT / ENGINEER / DEVELOPER / CONTRIBUTOR / BUILDER

**Captain multipliers** vary per edition — Rome has higher multipliers (e.g. Alpha 1.60× vs base 1.50×).

**`useEdition()` context** in React resolves the active edition and provides `accent`, `theme`, `rarity` config. All UI components should consume this for edition-aware theming.

**Admin control:** `/admin/editions` page allows creating/updating editions without code deploys (writes to the DB, served live by `/api/editions`).

---

## 10. PFP Moderation System

Three-layer defence against inappropriate profile pictures appearing on cards:

### Layer 1 — User opt-out
`POST /api/opt-out/pfp` — FID requests to be excluded from the game entirely. Inserts into `pfp_blocklist` with `reason = 'user_opt_out'`.

### Layer 2 — User report → auto-suspend
`POST /api/report/pfp` (from `CardModal.tsx` report form):
1. Requires a **category + free-text reason** (category pill + 5-char minimum textarea, both required).
2. Inserts row into `pfp_reports`.
3. Immediately inserts into `pfp_blocklist` with `reason = 'suspended'` — image is **hidden from all cards instantly** while under review.

Report form categories (hardcoded in `CardModal.tsx`): Explicit content, Impersonation, Harmful content, Spam / fake.

### Layer 3 — Admin block/reinstate
`PATCH /api/admin/reports/[id]` with `{ action: 'block' | 'dismiss' }`:
- `block` — upserts `pfp_blocklist` entry to `reason = 'admin_block'` (permanent). Image stays hidden forever.
- `dismiss` — deletes the `suspended` entry. Image becomes visible again.

### Blocklist enforcement
`loadBlocklist()` in `src/lib/moderation.ts` loads all `pfp_blocklist` URLs into a `Set<string>`. `applyBlocklist()` filters `pfpUrls[]` and replaces `pfpUrl` with the next clean image if the primary is blocked.

Applied at: `GET /api/browse`, `GET /api/profile/[fid]`, pack opening.

**Known gap:** `loadBlocklist()` loads ALL blocked URLs on every request — no caching or pagination. Will be slow at scale.

---

## 11. Navigation Structure

### Tabs (defined in `src/app/page.tsx`)
```
home        ⌂  Home        — landing, stats, winners, CTAs, how-to-play
pack        ◆  Packs       — open packs + global recent pulls feed
collection  ⚔  Collection  — player's owned cards
league      🏆  League      — team builder + week progress + leaderboard
profile     ◉  Profile     — protocol points, tier, history
```

Browse (`🃏`) is a hidden tab — not in the nav bar but still rendered. Accessible from Home ("Browse Cards" button) and via `setTab('browse')`.

Default tab on load: `home`.

### Home page (`src/components/HomePage.tsx`)
- Stats strip: total cards in circulation, total players, teams drafted this week
- Last week's champion (gold, up to 2 per group)
- Top-rated card thumbnail + Open Packs CTA (side by side)
- My Cards count button
- Action row: My League button + Browse Cards button
- Protocol Leaders top 3 + Full Leaderboard link
- Edition badge (current edition name + tag)
- How to Play accordion (4 steps + points cheatsheet, expandable)

Fetches from `/api/home/stats` (60s revalidate cache).

---

## 12. Admin

Admin pages live at `/admin/editions` and `/admin/reports`.

**Auth flow:** On page load, check `sessionStorage` for `wallet_address`. If missing, fetch FID from `sessionStorage.miniapp_fid`, call `/api/admin/check?fid=N` which does Neynar custody address lookup, compare against `isAdminAddress()` hardcoded list.

**Note:** `isAdminAddress()` list is hardcoded in `src/lib/adminAuth.ts`. No DB-driven admin management.

**Reports page** (`/admin/reports`):
- Pending tab shows reports not yet resolved (all auto-suspended)
- Each report shows: image preview, FID badge, "⚑ Suspended" amber badge, reason text, reporter info
- Actions: "⊘ Block Image" (permanent) or "✓ Reinstate" (lift suspension)
- Resolved show "⊘ Blocked" or "✓ Reinstated" with reduced opacity

---

## 13. External APIs

### Faces API (`src/lib/faces.ts`)
Pulls FID timelines with historical PFP images. Base URL: `web-legoblocksapps.vercel.app`. Params: `limit`, `offset`, `imagesPerFid`, `sort`, `order`. Returns `{ data: FidTimeline[], totalFids }`.

**Gap:** There is no DELETE endpoint on the Faces side to hard-delete source images. This is noted as a TODO — the Faces app (separate repo) needs a DELETE endpoint so BattleFIDs admin can remove an image at the PFP source level (not just blocklist it locally).

### Neynar API (`src/lib/neynar.ts`)
Used for: batch user lookup, weekly stats (recasts, likes, replies), cast counts, follower count snapshots. API key in env var `NEYNAR_API_KEY`.

Weekly stats fetch (`fetchWeeklyStats`) uses channel/cast search to aggregate activity since week start — not a native Neynar weekly endpoint. This is approximate.

---

## 14. Cron Schedule

| Schedule | Path | What it does |
|---|---|---|
| `0 6 * * *` (daily 06:00 UTC) | `/api/cron/tier` | Assign groups to `confident` players; compute avg_team_score; award daily bonuses |
| `0 0 * * 1` (Monday 00:00 UTC) | `/api/cron/score` | Score the previous week; award all points; mark `weeks.computed_at` |

Secret: `CRON_SECRET` env var, passed as query param `?secret=…` in `vercel.json`.

---

## 15. What Is Fully Working

- Farcaster mini-app gate (SDK auth, FID identity)
- Pack opening — pulls live FIDs from Faces, assembles cards with Neynar data, saves to DB
- Collection display — player's owned cards with full card viewer/modal
- PFP cycling animation on cards
- Weekly team builder with 5 slot types
- Team lock (any saved team = locked, `isLocked = true`)
- Team lock points — awarded only on first submission per week per player
- Leaderboard display for current week
- Score preview (live `/api/week/score/preview`)
- Protocol points system — accumulation + log
- Edition system — 3 editions, DB-driven config, `useEdition()` context
- Edition-aware theming throughout UI
- PFP report form — category + reason required, auto-suspend on submit
- Admin report queue — block/reinstate lifecycle
- Blocklist enforcement at browse/pack/profile read time
- User PFP opt-out
- Home page with stats, last winner, top card, CTAs, how-to-play
- Global recent pack pulls feed on Packs tab
- Weekly cron scoring — slot_beat ranking, overall_win, rare_card_bonus
- Edition bonus slots (schema + scoring wired)
- Referral code system (DB + award logic)
- Admin editions management UI

---

## 16. Known Gaps and Incomplete Items

### High priority / broken

1. **`weekly_teams` column mismatch** — Scoring cron queries `casts_fid, replies_fid, followers_fid, score_rise_fid, likes_fid` (old 5-slot column model) but team builder UI uses `captain_fid, broadcaster_fid, publisher_fid, agitator_fid, networker_fid` (new card-type model). These two schemas do not currently align. **Before the first real scoring run, this must be reconciled** — either migrate weekly_teams to use the new column names, or update the cron to read the new columns.

2. **`weeks` table row creation** — The cron assumes a row exists in `weeks` for the week being scored. Who inserts it? The team save API (`/api/week/team`) should upsert into `weeks` on first team submission, but this may not be wired. Verify before first scoring run.

3. **Scoring metrics vs card type** — The scoring cron reads raw Neynar metrics (`casts`, `replies`, `likes`) but the weekly slot types are `BROADCASTER/PUBLISHER/AGITATOR/NETWORKER` scored on `recastsReceived/likesReceived/repliesReceived/repliesSent`. The cron's `WeekStats` type uses `{ casts, replies, likes }` — this does not include `recasts`. Either the slot system or the scoring must be made consistent.

4. **`fetchWeeklyStats` vs `fetchCastCount`** — Two separate Neynar calls per FID in the cron. At scale (many unique FIDs across all teams) this will be slow and may hit Neynar rate limits. Needs batching or caching.

5. **Blocklist performance** — `loadBlocklist()` loads all blocked image URLs on every card read. At scale, this should be cached (e.g. in Vercel edge cache or a Redis TTL).

### Medium priority / missing features

6. **`share` action not wired** — `POINTS.share = 5` exists but no UI element calls `awardPoints(fid, device, 'share')`. Share button not built.

7. **`invite_sent` referral loop incomplete** — Referral codes exist and can be stored, but the award of `invite_sent` (100 pts) when an invited person joins is not wired to `/api/client-ping` or the player upsert flow.

8. **Pack tiers not wired to weighted pulls** — Scroll/Tablet/Codex pack names exist and are themed per edition, but `openPack()` in `src/lib/pack.ts` always does the same unweighted random draw regardless of tier. Rare-guaranteed pulls for Codex tier are not implemented.

9. **Edition 1/1 claim flow** — `edition_1of1s` table exists, but the logic to detect and claim a 1/1 during pack opening is not fully wired. The UI badge ("✦ 1/1") exists in the recent pulls feed, but 1/1 ownership is not being reliably set.

10. **`xploraXP` stat is always 0** — Reserved for Xplora integration, never populated.

11. **Faces DELETE endpoint** — Cannot permanently delete a source image from the Faces database via BattleFIDs admin. Must be added to the Faces app separately.

12. **No pagination on owned cards** — Collection loads all owned cards at once. Will be slow for active players.

13. **No push notifications** — No notification when week results are posted, no reminder to draft a team.

14. **Team validation against ownership** — The team save API should verify the player actually owns the FIDs they're slotting. This validation may be client-side only currently (TeamBuilder.tsx filters from `owned`), but the API does not independently verify ownership.

15. **Score preview accuracy** — `/api/week/score/preview` gives a snapshot in time. There is no "live updating" or websocket — the WeekProgress component would need to poll.

### Low priority / future

16. **Results API for prediction markets** — Agreed legally safe to build as a data-provider endpoint (not a prediction market). Not yet built. Would expose `GET /api/results/week/[weekId]` returning final ranks/scores. Could be monetised with API keys.

17. **API key infrastructure** — Not built. User said "not yet" on 2026-06-15.

18. **`wager_usdc` and `xplora_credits_won`** columns exist in `weekly_teams` — These are stubs for future wagering/credits features. Not implemented.

---

## 17. Legal Position

### What BattleFIDs is NOT
BattleFIDs does **not** run a prediction market. There is no wagering against outcomes before the fact using real money. No user is betting against another user. The Protocol Points system is non-monetary — points cannot be redeemed for cash.

### What it is
A **skill-based fantasy social game** where real published data (Farcaster on-chain/off-chain activity) determines scores. Players compete based on their predictions of other identities' social performance, but no money changes hands within the app.

### Data provider / oracle position
BattleFIDs can legally publish a **results API** exposing weekly league outcomes. This is a data-provider role — the same role as a sports stats provider. External prediction markets that integrate these results take on their own regulatory responsibilities. BattleFIDs bears no liability for how third parties use published public data. Charging for API access is a standard SaaS model — legal and clean.

### Card supply model
Cards have a `max_supply = fid` (e.g. FID 500 can have at most 500 copies in existence). This is a cosmetic/game-mechanics scarcity model, not a regulated financial instrument. No secondary market, no trading, no monetary value attached.

---

## 18. Environment Variables Required

```
DATABASE_URL         # Neon PostgreSQL connection string
NEYNAR_API_KEY       # Neynar API key
CRON_SECRET          # Vercel cron auth secret (26b07f1012eaa3008b1a257c7ff270fd in vercel.json)
FACES_API_URL        # Base URL for Faces API (web-legoblocksapps.vercel.app)
```

---

## 19. Development Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npx tsc --noEmit     # Type-check without emitting (run after every change)
```

**Before writing any Next.js API code:** read `node_modules/next/dist/docs/` — this is Next.js 16.2.7 with breaking changes from earlier versions. (Per AGENTS.md / CLAUDE.md.)

---

## 20. Key Architectural Decisions

- **FID as card identity, not PFP image** — The card persists; PFPs cycle. This means a card you own stays yours even if the person changes their profile picture. Historical PFPs animate on the card.
- **No wallet, no tokens** — Fully Farcaster-native, Farcaster SDK for identity. Deliberately avoids crypto complexity to maximize reach.
- **Edition system is DB-driven** — New editions can be created without code deploys via the admin UI. Static TypeScript configs exist for the 3 built-in editions for visual detail; dynamic editions use generated styles.
- **Scoring is beat-based not absolute** — Points = number of players beaten per slot. This means score is relative, not dependent on any absolute Neynar metric threshold. A week with lower overall activity is still fair.
- **Mini-app only** — Desktop/browser versions are not a design goal. The viewport is mobile Farcaster frame dimensions.
