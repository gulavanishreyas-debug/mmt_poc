# Troubleshooting Guide

## ❌ Issue: "Trip not found" Error

### Problem
When you copy the invitation link and open it in a new tab/window, you see an error: **"Trip not found"**

### Why This Happens
The POC uses **in-memory storage** (JavaScript Map) on the server. When you:
1. Create a trip → Stored in server memory
2. Copy the link and open in new tab → Server tries to fetch trip
3. **Problem:** Trip might not exist in memory due to:
   - Server restart (hot reload in development)
   - Different server instance
   - Memory cleared

### ✅ Solution Implemented

We've added **three-layer fallback system**:

```
1. Server API (Primary)
   ↓ (if fails)
2. Zustand Store (Same session)
   ↓ (if fails)
3. localStorage (Same browser)
   ↓ (if fails)
4. Show "Trip Not Found" error page
```

### How It Works Now

#### Layer 1: Server API
```typescript
// Try to fetch from server first
const response = await getTripDetails(tripId);
```

#### Layer 2: Zustand Store (Same Tab)
```typescript
// If API fails, check if trip exists in current session
const localTrip = useTripStore.getState();
if (localTrip.tripId === tripId) {
  // Use data from current session
}
```

#### Layer 3: localStorage (Cross-Tab)
```typescript
// If not in store, check localStorage (persists across tabs)
const storedTrip = getTripFromLocalStorage(tripId);
if (storedTrip) {
  // Use data from localStorage
}
```

#### Layer 4: Error Page
```typescript
// If all fail, show friendly error page
if (!tripData) {
  return <TripNotFoundPage />;
}
```

---

## 🧪 Testing the Fix

### Test 1: Same Tab (Should Work)
```
1. Create a trip
2. Copy invitation link
3. Paste in same tab
✅ Works via Zustand store
```

### Test 2: New Tab (Should Work Now)
```
1. Create a trip
2. Copy invitation link
3. Open in NEW tab
✅ Works via localStorage fallback
```

### Test 3: Different Browser (Won't Work - Expected)
```
1. Create trip in Chrome
2. Copy link
3. Open in Firefox
❌ Shows "Trip Not Found" (expected - no shared storage)
```

---

## 🔧 How to Fix Permanently

For **production**, replace in-memory storage with a real database:

### Option 1: PostgreSQL
```typescript
// app/api/social-cart/join/route.ts
import { db } from '@/lib/database';

const trip = await db.query(
  'SELECT * FROM social_cart WHERE trip_id = $1',
  [tripId]
);
```

### Option 2: MongoDB
```typescript
import { Trip } from '@/models/Trip';

const trip = await Trip.findOne({ tripId });
```

### Option 3: Supabase (Easiest)
```typescript
import { supabase } from '@/lib/supabase';

const { data: trip } = await supabase
  .from('trips')
  .select('*')
  .eq('trip_id', tripId)
  .single();
```

---

## 🚀 Quick Production Setup (Supabase)

### 1. Install Supabase
```bash
npm install @supabase/supabase-js
```

### 2. Create Tables
```sql
-- Run in Supabase SQL Editor
CREATE TABLE trips (
  trip_id TEXT PRIMARY KEY,
  trip_name TEXT NOT NULL,
  destination TEXT NOT NULL,
  purpose TEXT NOT NULL,
  required_members INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trip_members (
  member_id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(trip_id),
  name TEXT NOT NULL,
  avatar TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  mobile TEXT,
  joined_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Update API Routes
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// app/api/social-cart/join/route.ts
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const { invitation_token, guest_name, guest_mobile } = await request.json();
  
  // Insert member
  const { data, error } = await supabase
    .from('trip_members')
    .insert({
      trip_id: invitation_token,
      name: guest_name,
      mobile: guest_mobile,
      avatar: getAvatarEmoji(0),
      is_admin: false,
    })
    .select()
    .single();
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  return NextResponse.json({ success: true, member: data });
}
```

---

## 📝 Current Limitations (POC)

### ✅ What Works
- Same browser, same tab ✅
- Same browser, different tabs ✅ (via localStorage)
- Real-time updates within same browser ✅

### ❌ What Doesn't Work
- Different browsers ❌ (no shared storage)
- Server restart ❌ (memory cleared)
- Multiple users on different devices ❌ (no database)

### 🎯 Production Requirements
- ✅ Database (PostgreSQL/MongoDB/Supabase)
- ✅ Redis for real-time pub/sub
- ✅ WebSocket for bidirectional sync
- ✅ Authentication (JWT)
- ✅ API rate limiting

---

## 🐛 Other Common Issues

### Issue: Real-time updates not working
**Solution:** Check if SSE connection is established
```typescript
// Check browser console
// Should see: "✅ Real-time connection established"
```

### Issue: Member count not updating
**Solution:** Ensure `useRealTimeSync` hook is active
```typescript
// app/page.tsx
const { isConnected } = useRealTimeSync(tripId);
console.log('Connected:', isConnected); // Should be true
```

### Issue: Confetti not triggering
**Solution:** Check if discount is actually unlocked
```typescript
const isDiscountUnlocked = members.length >= requiredMembers;
console.log('Discount unlocked:', isDiscountUnlocked);
```

---

## 💡 Development Tips

### Clear localStorage
```javascript
// Run in browser console
localStorage.clear();
```

### View stored trips
```javascript
// Run in browser console
JSON.parse(localStorage.getItem('mmt_social_cart_trips'));
```

### Monitor SSE connection
```bash
# Terminal
curl -N http://localhost:3000/api/social-cart/events?tripId=YOUR_TRIP_ID
```

### Test API directly
```bash
# Create trip
curl -X POST http://localhost:3000/api/social-cart/create \
  -H "Content-Type: application/json" \
  -d '{"tripName":"Test","destination":"Goa","purpose":"casual","requiredMembers":3}'

# Join trip
curl -X POST http://localhost:3000/api/social-cart/join \
  -H "Content-Type: application/json" \
  -d '{"invitation_token":"TRIP_ID","guest_name":"John"}'
```

---

## 🎯 Summary

The "Trip not found" error is now handled gracefully with:
1. ✅ localStorage fallback for same-browser persistence
2. ✅ Friendly error page with "Go to Homepage" button
3. ✅ Three-layer fallback system
4. ✅ Clear error messages

For production, migrate to a real database (Supabase recommended for fastest setup).
