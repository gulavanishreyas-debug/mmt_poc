# Copilot Instructions for MakeMyTrip Social Cart 2.0

## Project Overview
**Purpose:** Collaborative, gamified group travel booking with real-time chat, polling, and hotel voting.  
**Tech Stack:** Next.js 13.5.6 (React 18), TypeScript, TailwindCSS, Zustand, Framer Motion, Canvas Confetti.  
**Storage:** Vercel KV (Redis) in production, in-memory Map in development. Uses `app/api/social-cart/kv-adapter.ts` for environment-aware storage.

## Critical Architecture: Dual State + KV Storage + SSE Real-Time Sync

### Two-Source State System
State lives in **TWO synchronized locations**:
1. **Client (Zustand):** `lib/store.ts` - UI state, current user's view
2. **Server (Vercel KV/Redis):** `app/api/social-cart/kv-adapter.ts` - Source of truth for multi-user collaboration
   - **Production:** Uses Vercel KV (Redis) - shared across all serverless instances
   - **Development:** Uses in-memory Map - fast local testing without database

**Real-time synchronization via Server-Sent Events (SSE):**
```typescript
// Server: app/api/social-cart/events/route.ts
// Maintains persistent HTTP connections per trip

// Client: lib/hooks/useRealTimeSync.ts  
// Subscribes to SSE, updates Zustand on events
```

**Data flow for ANY mutation:**
1. User action → API route updates `storage.ts` → calls `broadcastToTrip(tripId, { type: 'EVENT_TYPE', data })`
2. SSE pushes event to all connected clients
3. `useRealTimeSync` catches event → updates Zustand store → UI re-renders

**⚠️ CRITICAL:** Every API route that mutates state MUST call `broadcastToTrip()` or changes won't sync across users.

### API Route Pattern (Required Template)
```typescript
import { trips, broadcastToTrip } from '../storage';

export async function POST(request: NextRequest) {
  const { tripId, ...data } = await request.json();
  
  // 1. Get trip from KV storage (ASYNC)
  const trip = await trips.get(tripId);
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  
  // 2. Mutate trip data
  trip.someField = data.value;
  
  // 3. Save back to KV storage (ASYNC)
  await trips.set(tripId, trip);
  
  // 4. Broadcast to all clients (REQUIRED for real-time sync)
  broadcastToTrip(tripId, { type: 'EVENT_NAME', data });
  
  return NextResponse.json({ success: true });
}
```

**⚠️ CRITICAL:** 
- All `trips.get()` and `trips.set()` calls MUST use `await` (they're async in production)
- Always call `broadcastToTrip()` after mutations or changes won't sync to other users
- Trip data expires after 24 hours in Vercel KV

## Step-Based Navigation Architecture
`app/page.tsx` acts as router, rendering components based on `useTripStore().currentStep`:
- `home` → `Homepage.tsx` - Landing with CTA
- `create` → `TripCreation.tsx` - Trip setup form
- `invite` → `InvitationScreen.tsx` - Share links (WhatsApp deep links: `https://wa.me/?text=...`)
- `hub` → `TripHub.tsx` - Member dashboard
- `poll` → `GroupChatPolling.tsx` - Chat-style polling (hides `FloatingWidget`)
- `hotels` → `HotelFlow.tsx` - Hotel voting interface
- `booking` → `BookingScreen.tsx` - Final selection + confetti

**Transitions:** Components call `useTripStore().setStep()` to navigate. No Next.js router needed.

## Poll System Deep Dive
**Active system:** Multi-poll (`polls[]`, `activePoll`) - old single poll system (`isPollActive`, `votes[]`) is deprecated but still in store.

**Auto-generation in `app/api/social-cart/polls/route.ts`:**
```typescript
// Dynamic date calculation relative to today
const makeRange = (startOffsetDays, endOffsetDays) => {
  const start = new Date(now.getTime() + startOffsetDays * 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + endOffsetDays * 24 * 60 * 60 * 1000);
  return `${formatDate(start)} – ${formatDate(end)}`;
};
```
Poll types: `budget` (price ranges), `dates` (dynamic date ranges), `amenities` (hotel features).  
Each poll has `duration` (seconds) and `expiresAt` (ISO timestamp). Client shows countdown timers.

**Voting flow:**
1. Admin creates poll via `POST /api/social-cart/polls` with `pollType`
2. API auto-generates options, broadcasts `POLL_CREATED`
3. Members vote via `POST /api/social-cart/polls/vote` → broadcasts `POLL_UPDATED`
4. Admin closes via `POST /api/social-cart/polls/close` → broadcasts `POLL_CLOSED`

## Hotel Voting Flow
1. Admin shortlists hotels → `POST /api/social-cart/hotels/shortlist` creates hotels with empty `votes: {}`
2. Broadcasts `HOTELS_SHORTLISTED` with 5-minute timer (`hotelVotingExpiresAt`)
3. Members vote (👍 love / 👎 dislike) via `POST /api/social-cart/hotels/vote`  
   Votes stored as: `{ [memberId]: { vote: 'love' | 'dislike', comment?: string } }`
4. Admin closes via `POST /api/social-cart/hotels/close-voting`  
   Winner = most loves → broadcasts `HOTEL_VOTING_CLOSED` → UI auto-advances to `booking` step

## Developer Workflows

### Commands
```bash
npm install          # Install dependencies (including @vercel/kv)
npm run dev          # Dev server on :3000 (uses in-memory storage)
npm run build        # Production build
vercel --prod        # Deploy to Vercel (uses KV storage)
vercel logs          # View production logs
```

### Vercel Deployment Setup
1. Install KV package: `npm install @vercel/kv`
2. In Vercel dashboard: **Storage** → **Create Database** → **KV (Redis)**
3. Name it `mmt-social-cart-kv` → Vercel auto-injects env vars
4. Deploy: `git push` or `vercel --prod`
5. KV automatically activates in production (no code changes needed)

See `DEPLOYMENT_QUICKSTART.md` for detailed setup instructions.

### Debugging Real-Time Sync
1. **Browser console:** Look for `[useRealTimeSync]` logs showing event receipt
2. **Server logs:** Check Vercel logs with `vercel logs --follow`
3. **KV logs:** Look for `[KV-Adapter]` messages showing storage operations
4. **State inspector:** `http://localhost:3000/debug` (only shows local state)
5. **Multi-user testing:** Open 2+ browser windows/tabs to same trip URL
6. **Storage mode:** Check logs for `Initialized storage in KV mode` vs `LOCAL mode`

**Common failures:**
- **State not syncing?** API route forgot `broadcastToTrip()` call or missing `await`
- **"Module not found: @vercel/kv"?** Run `npm install @vercel/kv`
- **Works locally but not on Vercel?** Check KV database is connected in Vercel dashboard
- **Poll not appearing?** Check `status: 'active'` and `expiresAt` is future
- **Confetti breaks SSR?** Must dynamic import: `import('../confetti').then(({ triggerConfetti }) => ...)`

### Logging Convention
Use emoji prefixes for scannable logs:
- `🔵` - Storage/initialization
- `📊` - Poll events
- `✅` - Success
- `❌` - Errors
- `📡` - Network/SSE
- `🏨` - Hotel operations
- `👥` - Member updates

## Project-Specific Patterns

### Gamification (Canvas Confetti)
`lib/confetti.ts` exports two functions - MUST dynamic import to avoid SSR issues:
```typescript
// Multi-burst celebration (discount unlocks, poll closes)
import('../confetti').then(({ triggerConfetti }) => triggerConfetti());

// 3-second continuous rain (booking success)
import('../confetti').then(({ triggerSuccessConfetti }) => triggerSuccessConfetti());
```

### Storage Schema Updates (Dual-Edit Pattern)
When adding features:
1. Update server types in `app/api/social-cart/storage.ts` (interface Trip)
2. Update client types in `lib/store.ts` (interface TripState)
3. Add Zustand action if client needs to mutate
4. Create API route that calls `broadcastToTrip()`
5. **IMPORTANT:** Use `await trips.get()` and `await trips.set()` (async operations)
6. Add event handler in `lib/hooks/useRealTimeSync.ts` switch statement

### WhatsApp Sharing (No API)
Just deep links that pre-fill WhatsApp composer:
```typescript
const inviteLink = `${window.location.origin}/join/${tripId}`;
const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message + inviteLink)}`;
window.open(whatsappUrl, '_blank');
```

## Conventions
- **No React Context** - Zustand only
- **No CSS Modules** - TailwindCSS utility classes exclusively
- **No external APIs** - Everything mocked in Next.js API routes
- **All TypeScript** - `.tsx`/`.ts` files, strict mode
- **Mobile-first** - Chat-style bubbles, bottom sheets, touch-optimized

## Key File Map
- `lib/store.ts` - Zustand store (TripState interface, all actions)
- `app/api/social-cart/storage.ts` - Storage interface (exports `trips` and `connections`)
- `app/api/social-cart/kv-adapter.ts` - **KV storage adapter** (auto-detects environment)
- `app/api/social-cart/events/route.ts` - SSE endpoint (GET handler with ReadableStream)
- `lib/hooks/useRealTimeSync.ts` - SSE client (EventSource wrapper, 10+ event types)
- `app/page.tsx` - Main router (step-based rendering, no Next.js router)
- `lib/api.ts` - Client API wrappers (createTrip, joinTrip, getTripDetails)
- `components/GroupChatPolling.tsx` - Polling interface (1800+ lines, chat UX)
- `app/debug/page.tsx` - State inspector (shows Zustand state only)
- `DEPLOYMENT_QUICKSTART.md` - Vercel deployment guide with KV setup
