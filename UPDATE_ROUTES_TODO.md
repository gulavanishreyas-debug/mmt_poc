# API Routes Update Script
# Run this command to update all remaining API routes to use async storage

## Routes that need updating:
- app/api/social-cart/toggle-link/route.ts
- app/api/social-cart/remove-member/route.ts
- app/api/social-cart/polls/vote/route.ts
- app/api/social-cart/polls/close/route.ts
- app/api/social-cart/leave/route.ts
- app/api/social-cart/hotels/vote/route.ts
- app/api/social-cart/hotels/shortlist/route.ts
- app/api/social-cart/hotels/close-voting/route.ts
- app/api/social-cart/chat/route.ts
- app/api/social-cart/booking/confirm/route.ts

## Pattern to replace:

### Before:
```typescript
const trip = trips.get(tripId);
// ... mutations ...
trips.set(tripId, trip);
```

### After:
```typescript
const trip = await trips.get(tripId);
// ... mutations ...
await trips.set(tripId, trip);
```

## Instructions:
1. For each route, find `trips.get()` and add `await`
2. For each route, find `trips.set()` and add `await`
3. Ensure the function is marked as `async`
4. Remove any `trips.size` or `Array.from(trips.keys())` calls
