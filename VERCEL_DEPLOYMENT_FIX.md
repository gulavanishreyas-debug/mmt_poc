# Vercel Deployment Fix - Multi-User Synchronization Issue

## Problem Identified
The application uses in-memory storage (`global.tripsStore`) which works locally but **fails on Vercel** because:
- Vercel serverless functions are **stateless** and isolated
- Each API request can be handled by a different function instance
- `global` variables don't persist across different serverless invocations
- Result: User 1, 2, and 3 store data in different memory spaces that can't see each other

## Solution: Vercel KV (Redis)

### Step 1: Set Up Vercel KV
1. Go to your Vercel project dashboard
2. Navigate to **Storage** → **Create Database** → **KV (Redis)**
3. Name it: `mmt-social-cart-kv`
4. Click **Create & Continue**
5. Vercel will automatically inject these environment variables:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

### Step 2: Install Vercel KV SDK
```bash
npm install @vercel/kv
```

### Step 3: Update Storage Implementation

Replace `app/api/social-cart/storage.ts` with the KV-based version below.

### Step 4: Deploy
```bash
vercel --prod
```

## Code Changes Required

### 1. Update `storage.ts`

```typescript
import { kv } from '@vercel/kv';

// Type definitions (keep existing interfaces)
export interface Member { /* ... */ }
export interface Trip { /* ... */ }

// Environment detection
const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production';
const useKV = isVercel || isProduction;

// ===== KV-BASED STORAGE (Production) =====
async function getTrip(tripId: string): Promise<Trip | null> {
  if (useKV) {
    return await kv.get<Trip>(`trip:${tripId}`);
  }
  return localTrips.get(tripId) || null;
}

async function setTrip(tripId: string, trip: Trip): Promise<void> {
  if (useKV) {
    await kv.set(`trip:${tripId}`, trip, { ex: 86400 }); // 24 hour expiry
  } else {
    localTrips.set(tripId, trip);
  }
}

async function deleteTrip(tripId: string): Promise<void> {
  if (useKV) {
    await kv.del(`trip:${tripId}`);
  } else {
    localTrips.delete(tripId);
  }
}

// ===== LOCAL STORAGE (Development) =====
const localTrips = new Map<string, Trip>();
const localConnections = new Map<string, Set<(data: any) => void>>();

// ===== SSE CONNECTIONS =====
// Note: SSE connections still use in-memory Maps since they're per-instance
export const connections = localConnections;

export function broadcastToTrip(tripId: string, message: any) {
  const tripConnections = connections.get(tripId);
  if (tripConnections) {
    console.log(`📡 [Storage] Broadcasting to ${tripConnections.size} clients for trip ${tripId}:`, message.type);
    tripConnections.forEach(sendMessage => {
      try {
        sendMessage(message);
      } catch (error) {
        console.error('❌ [Storage] Error broadcasting message:', error);
      }
    });
  }
}

// Export unified API
export const trips = {
  get: getTrip,
  set: setTrip,
  delete: deleteTrip,
  has: async (tripId: string) => (await getTrip(tripId)) !== null,
};
```

### 2. Update All API Routes

Change from synchronous to async operations:

**Before:**
```typescript
const trip = trips.get(tripId);
trip.members.push(newMember);
trips.set(tripId, trip);
```

**After:**
```typescript
const trip = await trips.get(tripId);
if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

trip.members.push(newMember);
await trips.set(tripId, trip);
```

Apply this pattern to:
- `app/api/social-cart/create/route.ts`
- `app/api/social-cart/join/route.ts`
- `app/api/social-cart/polls/route.ts`
- `app/api/social-cart/polls/vote/route.ts`
- `app/api/social-cart/polls/close/route.ts`
- `app/api/social-cart/hotels/shortlist/route.ts`
- `app/api/social-cart/hotels/vote/route.ts`
- `app/api/social-cart/hotels/close-voting/route.ts`
- All other routes that access `trips`

## Alternative: Quick Fix Without KV

If you can't set up KV immediately, use **Vercel Postgres** or an external Redis/MongoDB instance:

### Option A: Upstash Redis (Free Tier)
1. Create account at https://upstash.com
2. Create Redis database
3. Copy REST URL and TOKEN
4. Add to Vercel environment variables:
   - `KV_REST_API_URL=https://...`
   - `KV_REST_API_TOKEN=...`
5. Install: `npm install @upstash/redis`

### Option B: Supabase (Free PostgreSQL)
1. Create project at https://supabase.com
2. Use Supabase client for database operations
3. More complex but more scalable

## Testing the Fix

After deployment:
1. Create a trip (User 1)
2. Open invite link in incognito window (User 2)
3. Open invite link in different browser (User 3)
4. All users should see each other in real-time
5. Check Vercel function logs for confirmation

## SSE Limitations on Vercel

**Important:** Server-Sent Events (SSE) have limitations on Vercel:
- Maximum 60-second duration per connection
- Each connection to a different instance won't share memory

### Recommended SSE Alternative for Production:
1. **Polling approach:** Client polls `/api/social-cart/join?tripId=X` every 2-3 seconds
2. **WebSockets via Pusher/Ably:** Managed real-time service
3. **Vercel Edge Functions + Durable Objects:** Advanced Cloudflare Workers alternative

For POC, implement polling in `useRealTimeSync.ts`:

```typescript
// Replace EventSource with polling
useEffect(() => {
  if (!tripId) return;
  
  const pollInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/social-cart/join?tripId=${tripId}`);
      const data = await response.json();
      
      // Update local state with server state
      if (data.trip) {
        useTripStore.setState({
          members: data.trip.members,
          isDiscountUnlocked: data.trip.members.length >= data.trip.requiredMembers,
          // ... other fields
        });
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 3000); // Poll every 3 seconds
  
  return () => clearInterval(pollInterval);
}, [tripId]);
```

## Priority Action Items

1. ✅ **Immediate:** Set up Vercel KV in project dashboard
2. ✅ **Quick:** Install `@vercel/kv` package
3. ✅ **Critical:** Update `storage.ts` to async KV operations
4. ✅ **Required:** Update all API routes to use async/await
5. ⚠️ **Optional:** Replace SSE with polling for reliable real-time sync
6. 🚀 **Deploy:** Push changes and test with multiple users

## Environment Variables to Add

If using Upstash or external Redis:
```env
KV_REST_API_URL=your_redis_url
KV_REST_API_TOKEN=your_redis_token
NODE_ENV=production
```

Vercel KV sets these automatically when you create the database through their dashboard.
