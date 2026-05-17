# Mentions Infrastructure — Investigation Findings

**Status:** Mixed case — messages have partial persistence + a dashboard surface; notes have zero persistence. The spec's prescribed solution (introduce `notifications` table + retrofit messages) is closer to **worst case** scope than the strict definition suggests. **Stopping per Part 2 Phase B instructions to confirm direction with Jason before proceeding.**

---

## 1. Server side — does the API persist mentions?

### Messages: **Yes, in JSONB on the row.**

**Table:** `public.messages` (`ddor_schema.sql:1349`)
```
mentions jsonb DEFAULT '[]'::jsonb
```

**Write path:** `app/api/channels/[id]/messages/route.ts:66-71`
```ts
const message = await insert('messages', {
    channel_id: params.id,
    sender_id: getUserId(session),
    body: body.body.trim(),
    mentions: body.mentions ? JSON.stringify(body.mentions) : '[]',
});
```
No dedicated `mentions` or `message_mentions` join table. No per-recipient notification row. The mentions array sits on the message itself.

### Notes: **No persistence at all.**

**Table:** `public.client_notes` (`ddor_schema.sql:893`) has *no* mentions column.
**Write path:** `app/api/notes/route.ts:50-76` does not accept or persist a `mentions` field.

---

## 2. Notifications surface — what's already there?

### `notifications` / `mentions` table: **Does not exist.**
Verified by grepping the live schema dump (`ddor_schema.sql`). No table named `notifications`, `mentions`, `message_mentions`, or `note_mentions`.

### `/api/notifications` route: **Exists, computes on-the-fly.**
**File:** `app/api/notifications/route.ts`

Returns `{ totalUnread, mentions, recentDMs, recentChannel }`. Mentions are computed live:
```ts
// Line 38
AND m.mentions::text LIKE '%' || $1 || '%'
```
i.e., string-search the JSONB column for the current user's UUID. Functional for now but doesn't scale, doesn't support per-mention read state, and only knows about *message* mentions.

### Dashboard surface: **Already wired up.**
**File:** `app/page.tsx:235-345` — "Messages & Mentions" section renders `notifications.mentions`, `recentDMs`, and `recentChannel`. Each mention click routes to `/messages` (no per-message deep link yet).

### Header bell icon: **Not implemented.**
Searched `components/Header.tsx` — no notification badge. Bell icon is imported in the dashboard but only decorates the mentions card title.

---

## 3. Current access enforcement on clients

**File:** `app/api/clients/route.ts:50-66` — role-based scoping inlined per route:
- `super_admin` / `business_user`: see all (optionally filter by `facility_id`)
- `navigator`: `WHERE f.county_id IN (SELECT county_id FROM user_counties WHERE user_id = $1)`
- everyone else: `WHERE c.facility_id = $1` (own facility only)

**File:** `app/api/clients/[id]/route.ts` — presumably calls `requireClientAccess(clientId)` from `lib/auth.ts:85`, which routes through `requireFacilityAccess` → checks role + `user_facilities` + (for navigators) `user_counties` + `facility_servicing_counties`.

**Implication for the placeholder:** the proper access logic *already exists* in `lib/auth.ts`. The placeholder in `lib/access.ts` (Part 3) can either:
- Match the existing rules immediately (no real placeholder needed — just refactor)
- Or stay permissive as the spec says, with a TODO

The spec explicitly says "permissive placeholder until Erin defines the rules" — but the rules implemented in `lib/auth.ts` *are* the current de facto rules. Worth confirming whether Erin's eventual ruling is expected to *replace* them or *layer on top of* them.

---

## 4. Category assessment

Per the spec's three buckets:

| Spec category | Reality |
|---|---|
| Best (mentions table + dashboard feed) | ❌ no notifications table |
| Middle (mentions table, no dashboard) | ❌ no notifications table; dashboard surface *does* exist |
| Worst (nothing persists) | ❌ — messages mentions do persist (JSONB) |

**Honest framing:** message mentions are at "best minus a real table" — they persist (JSONB) and surface on the dashboard but in a hack-y way. Note mentions are at **worst case** (zero persistence, zero surface).

The spec's prescribed solution treats this as worst case anyway:
> "If there's no shared `notifications` table yet, this is the moment to introduce one… Retrofit messages to write to the same table."

That retrofit is what makes this materially scope-changing for Phase 1.

---

## 5. Two strategies — pick one

### Strategy A — Follow the spec literally (proper notifications table)

1. New schema:
   ```sql
   CREATE TABLE notifications (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     recipient_user_id UUID NOT NULL REFERENCES users(id),
     source_type TEXT NOT NULL,
     source_id UUID NOT NULL,
     client_id UUID REFERENCES clients(id),
     created_by UUID NOT NULL REFERENCES users(id),
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     read_at TIMESTAMPTZ
   );
   CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_user_id, read_at);
   ```
2. `POST /api/notes` and `POST /api/channels/[id]/messages` both insert a `notifications` row per mention.
3. `/api/notifications` rewrites its mentions query against this table, joining `notes`/`messages` for context.
4. **Backfill:** scan `messages.mentions` JSONB → seed `notifications` so dashboard history doesn't drop. ~unknown count of historical mention events — need a count first.
5. Dashboard mentions widget rewires off the new shape.

**Cost:** schema migration, backfill script, retrofit of an already-working surface, regression risk on the live messages mentions UX before July 1.
**Benefit:** clean per-mention read state, easy to add more source types later, proper architecture.

### Strategy B — Smaller, mirror the existing pattern

1. Add `mentions jsonb DEFAULT '[]'::jsonb` to `client_notes`.
2. `POST /api/notes` accepts and persists `mentions` (same shape as messages).
3. `/api/notifications` extends its mention query to UNION:
   ```sql
   SELECT 'message' AS source_type, m.id, m.body, m.created_at, m.channel_id AS context_id, ...
   FROM messages m WHERE m.mentions::text LIKE '%' || $1 || '%' ...
   UNION ALL
   SELECT 'note' AS source_type, n.id, n.content AS body, n.created_at, n.client_id AS context_id, ...
   FROM client_notes n WHERE n.mentions::text LIKE '%' || $1 || '%' ...
   ORDER BY created_at DESC LIMIT 10;
   ```
4. Dashboard widget renders both source types from the same shape.
5. No retrofit of messages. No backfill. No data migration.

**Cost:** Carries forward the existing JSONB-LIKE pattern (doesn't scale, no per-mention read state — read state is still per-channel for messages, and notes get no read state at all).
**Benefit:** Ships fast, low risk, July-1-safe, can be upgraded to Strategy A in Phase 2.

---

## 6. Recommendation

**Strategy B for Phase 1**, upgrade to Strategy A in Phase 2.

Rationale tied to CLAUDE.md principles:
- "Boring beats clever" + 5-year solo-maintainer horizon → extending the existing JSONB pattern is the obvious choice
- "When in doubt about scope, default to deferring to Phase 2" — the proper notifications table is a clear Phase 2 candidate
- July 1 is non-negotiable; backfilling and retrofitting an already-working surface introduces avoidable risk
- Per-note read state (the thing Strategy A unlocks) hasn't been requested by Erin

Note that the spec's exact words call for Strategy A. This recommendation departs from that — hence stopping to confirm.

---

## 7. Open questions before proceeding

1. **Strategy A or B?**
2. **Access placeholder:** keep it permissive per spec, or have it call into the existing `requireClientAccess`/`requireFacilityAccess` logic from `lib/auth.ts` immediately? The "real" rules already exist; the only thing not yet defined is whatever Erin layers on top.
3. **Part 1 (Notes tab redesign) is independent of this decision.** OK to proceed with Part 1 in parallel — the new `NoteForm` component just uses a plain `<textarea>` until Part 2 lands, then swaps it for `MentionTextarea`. Confirm?
4. **Deep-link parameter:** if Strategy B, the `note` query param for `/clients/{clientId}?tab=notes&note={noteId}` is still trivial. If Strategy A, same.

Awaiting Jason's call.
