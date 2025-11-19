# Copilot Instructions for MakeMyTrip Social Cart 2.0

## Project Overview
**Purpose:** Collaborative, gamified group travel booking with real-time chat, polling, and hotel voting.  
**Tech Stack:** Next.js 13.5.6 (React 18), TypeScript, TailwindCSS, Zustand, Framer Motion, Canvas Confetti.  
**POC Mode:** No database; uses in-memory storage (`app/api/social-cart/storage.ts`) that persists across HMR via global variables.

## Architecture & Data Flow

### Dual State Management (Critical Understanding)
This app maintains state in **TWO places** that must stay synchronized:
1. **Client State:** `lib/store.ts` (Zustand) - UI state, current user view
2. **Server State:** `app/api/social-cart/storage.ts` - Source of truth for multi-user data

**Real-time sync via Server-Sent Events (SSE):**
- `app/api/social-cart/events/route.ts` - SSE endpoint that maintains persistent connections
- `lib/hooks/useRealTimeSync.ts` - Client hook that subscribes to SSE, updates Zustand on events
- `storage.ts` exports `broadcastToTrip()` - API routes call this to push events to all connected clients

**Example flow:**
1. User votes on poll → API route updates `storage.ts` → calls `broadcastToTrip(tripId, { type: 'POLL_UPDATED', data })`
2. All clients receive SSE event → `useRealTimeSync` catches it → updates local Zustand store
3. UI re-renders with new data

### Step-Based Navigation
`app/page.tsx` renders components based on `currentStep` state:
- `home` → `Homepage.tsx`
- `create` → `TripCreation.tsx`
- `invite` → `InvitationScreen.tsx`
- `hub` → `TripHub.tsx` (member management)
- `poll` → `GroupChatPolling.tsx` (chat-style polling interface)
- `hotels` → `HotelFlow.tsx` (voting on shortlisted hotels)
- `booking` → `BookingScreen.tsx`

`FloatingWidget.tsx` persists across steps (except during polling) for quick access to trip hub.

### Poll System Architecture
**Two poll types coexist:**
1. **Legacy single poll** (`isPollActive`, `votes[]`, `consensusBudget`) - mostly unused
2. **New multi-poll system** (`polls[]`, `activePoll`) - current implementation

**Poll creation flow:**
- API route `app/api/social-cart/polls/route.ts` auto-generates poll options based on `pollType` ('budget', 'dates', 'amenities')
- Date ranges are **dynamically calculated** relative to current date (e.g., "3-5 days from now")
- Each poll has `duration` (seconds) and `expiresAt` (ISO timestamp)
- Polls are broadcast via SSE (`POLL_CREATED` event)

### Hotel Voting Flow
1. Admin shortlists hotels → API creates them in storage with empty `votes: {}` objects
2. `broadcastToTrip()` sends `HOTELS_SHORTLISTED` event with voting timer
3. Members vote (👍 love / 👎 dislike) → votes stored as `{ [memberId]: { vote, comment? } }`
4. Admin closes voting → API calculates winner (most loves) → broadcasts `HOTEL_VOTING_CLOSED`
5. UI auto-advances to booking screen

## Developer Workflows

### Commands
```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run lint     # ESLint check
```

### Debugging Real-Time Sync Issues
1. Check browser console for SSE logs: `[useRealTimeSync]` prefix
2. Check API logs for broadcasts: `[Storage] Broadcasting to X clients`
3. Open `http://localhost:3000/debug` to inspect Zustand state
4. Verify `storage.ts` has data: logs show trip count on initialization
5. Test with multiple browser windows/tabs to simulate multi-user

### Common Pitfalls
- **State not syncing?** Check if API route calls `broadcastToTrip()` after mutations
- **HMR wiped data?** Normal - storage persists via `global.tripsStore` but client state resets
- **Poll not appearing?** Verify poll has `status: 'active'` and `expiresAt` is future timestamp
- **Confetti not triggering?** Import dynamically: `import('../confetti').then(({ triggerConfetti }) => ...)`

## Project-Specific Patterns

### API Route Pattern
All routes in `app/api/social-cart/*` follow this structure:
```typescript
import { trips, broadcastToTrip } from '../storage';

export async function POST(request: NextRequest) {
  const { tripId, ...data } = await request.json();
  const trip = trips.get(tripId);
  
  // Mutate trip data
  trip.someField = data.value;
  trips.set(tripId, trip);
  
  // Broadcast to all clients
  broadcastToTrip(tripId, { type: 'EVENT_NAME', data: { ...} });
  
  return NextResponse.json({ success: true });
}
```

### Gamification Triggers
`lib/confetti.ts` exports:
- `triggerConfetti()` - Multi-burst celebration (use when discount unlocks, polls close)
- `triggerSuccessConfetti()` - Heart-shaped confetti for booking success

Call dynamically to avoid SSR issues:
```typescript
import('../confetti').then(({ triggerConfetti }) => triggerConfetti());
```

### WhatsApp Integration
`InvitationScreen.tsx` generates shareable links:
```typescript
const inviteLink = `${window.location.origin}/join/${tripId}`;
const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message + inviteLink)}`;
```
No WhatsApp API - just deep links that open WhatsApp with pre-filled message.

## Conventions
- **No React Context** - all shared state via Zustand
- **No CSS Modules** - TailwindCSS utility classes only
- **No external API calls** - everything mocked in Next.js API routes
- **TypeScript strict mode** - all files `.tsx` or `.ts`
- **Logging prefixes** - Use emoji prefixes for visibility: `🔵`, `📊`, `✅`, `❌`, `📡`

## Key Files Reference
- `lib/store.ts` - Zustand store (TripState interface, all actions)
- `app/api/social-cart/storage.ts` - In-memory data store + SSE broadcast helper
- `app/api/social-cart/events/route.ts` - SSE endpoint for real-time updates
- `lib/hooks/useRealTimeSync.ts` - Client SSE subscriber (handles all event types)
- `app/page.tsx` - Main router (step-based component rendering)
- `lib/api.ts` - Client API wrappers (createTrip, joinTrip, getTripDetails)
- `components/GroupChatPolling.tsx` - Main polling interface with chat UX
- `app/debug/page.tsx` - State inspector (shows full Zustand + storage state)

## For AI Agents
- **When adding features:** Check if storage schema (`storage.ts`) needs updates, then update corresponding Zustand types (`lib/store.ts`)
- **When modifying flows:** Update `currentStep` transitions in `app/page.tsx` and relevant components
- **When adding API routes:** Always call `broadcastToTrip()` for real-time sync
- **When debugging:** Use existing log patterns (emoji prefixes) and check both client console + server terminal
- **When styling:** Follow existing mobile-first, chat-style patterns from `GroupChatPolling.tsx` and `PollScreen.tsx`
