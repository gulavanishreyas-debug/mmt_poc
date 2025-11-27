# Shared Link Browsing Feature

## Overview
Enables anyone with a shared booking link to view hotel details without being a trip admin or member. This creates a "view-only" browsing experience that encourages link recipients to create their own trips.

## Problem Solved
Previously, shared booking links (`/r/[linkId]`) would redirect users to the hotels step, but they'd see "Waiting for Admin to shortlist hotels..." because:
- No trip existed (tripId = null)
- User wasn't admin
- HotelFlow required admin status to show HotelSelection

## Solution Architecture

### 1. Shared Link Detection
**HotelFlow.tsx** (Lines 108-142)
```typescript
const isSharedLinkMode = !tripId && prefillParams.fromLink && prefillParams.destination;
```

**Conditions:**
- `!tripId` - No active trip session
- `prefillParams.fromLink` - URL has fromLink=true (set by /r/[linkId] resolver)
- `prefillParams.destination` - Has destination data from shared link

### 2. Bypassing Admin Check
**Original code:**
```typescript
if (isAdmin && shortlistedHotels.length === 0 && !hasSharedShortlist) {
  return <HotelSelection ... />;
}
```

**Updated code:**
```typescript
if ((isAdmin && shortlistedHotels.length === 0 && !hasSharedShortlist) || isSharedLinkMode) {
  return <HotelSelection isSharedLinkMode={isSharedLinkMode} ... />;
}
```

Now shows hotels if EITHER:
- User is admin with no shortlist, OR
- In shared link browsing mode

### 3. UI Adaptations in HotelSelection

#### Props Interface (Line 906)
```typescript
interface HotelSelectionProps {
  destination: string;
  onShareShortlist: (hotels: Hotel[]) => void;
  prefillHotelId?: string;
  isSharedLinkMode?: boolean; // NEW
}
```

#### Hide "Share Shortlist" Button (Line 1198)
```typescript
{!isSharedLinkMode && (
  <button onClick={handleShareShortlist}>
    Share with Group ({selectedHotels.size}/5)
  </button>
)}
```

#### Special Banner Message (Line 928)
```typescript
useEffect(() => {
  if (isSharedLinkMode) {
    setBannerMessage('🔗 Viewing shared booking itinerary—Create your own trip to book!');
  }
  // ... existing prefill logic
}, [prefillHotelId, isSharedLinkMode]);
```

#### "Create Your Trip" CTA (Line 1255)
```typescript
{isSharedLinkMode && (
  <button
    onClick={() => setStep('home')}
    className="px-4 py-1.5 bg-gradient-to-r from-[#0071c2] to-purple-600 text-white text-sm font-semibold rounded-lg"
  >
    Create Your Trip
  </button>
)}
```

## User Flow

### Shared Link Journey
1. **User receives shared link:** `https://mmt.com/r/abc123`
2. **Redirect resolver:** `/r/[linkId]/page.tsx` → API validates → redirect to `/?step=hotels&destination=Goa&hotelId=h001&fromLink=true`
3. **Main page:** `app/page.tsx` detects URL params, navigates to hotels step
4. **HotelFlow:** Detects shared link mode, passes to HotelSelection
5. **HotelSelection:** Shows hotels with:
   - Banner: "🔗 Viewing shared booking itinerary—Create your own trip to book!"
   - "Create Your Trip" button
   - NO "Share Shortlist" button (hidden)
   - All filter/sort functionality works normally

### Admin/Member Journey (unchanged)
1. User creates trip → becomes admin
2. Shortlists hotels
3. Shares with group
4. Members vote
5. Admin closes voting → proceed to booking

## Technical Details

### State Management
- **Zustand Store:** Added `setStep` hook to HotelSelection for "Create Your Trip" button
- **No trip state required:** Shared link mode works standalone without tripId

### Console Logging
```typescript
// HotelFlow.tsx
console.log('🔗 [HotelFlow] Shared link mode detected - enabling standalone browsing');

// HotelSelection.tsx
console.log('🔗 [HotelSelection] Shared link mode active');
```

### Routing
- Uses step-based navigation (no Next.js router)
- `setStep('home')` navigates back to homepage for trip creation

## Files Modified

1. **components/HotelFlow.tsx**
   - Added `isSharedLinkMode` detection logic
   - Modified render condition to include shared link mode
   - Updated banner text: "Viewing shared itinerary" vs "Prefilled from shared link"
   - Pass `isSharedLinkMode` prop to HotelSelection

2. **components/HotelSelection.tsx**
   - Updated `HotelSelectionProps` interface with `isSharedLinkMode?: boolean`
   - Added `setStep` hook from Zustand store
   - Conditionally hide "Share Shortlist" button when `isSharedLinkMode === true`
   - Updated `useEffect` to set special banner message for shared links
   - Added "Create Your Trip" CTA button in banner for shared link mode

## Testing

### Local Testing
```bash
npm run dev
```

1. **Create booking with shared link:**
   - Create trip → shortlist hotels → vote → book
   - Copy share link from My Bookings

2. **Test shared link (incognito):**
   - Open shared link in new incognito window
   - Should see hotels immediately (no "Waiting for Admin" message)
   - Verify banner shows "🔗 Viewing shared booking itinerary..."
   - Verify "Create Your Trip" button appears
   - Verify "Share Shortlist" button is hidden
   - Click "Create Your Trip" → should navigate to homepage

3. **Verify filters work:**
   - Test price range, amenities, dates
   - Test sorting (popular, price, rating)
   - All should work normally in shared link mode

### Production Testing
1. Deploy to Vercel
2. Share booking link via WhatsApp/Email
3. Have non-trip-member open link
4. Verify standalone browsing experience

## Benefits

1. **Viral Growth:** Anyone can view shared bookings without signup
2. **Conversion Funnel:** "Create Your Trip" CTA encourages new users
3. **Social Proof:** Recipients see what friends booked → trust signal
4. **Zero Friction:** No login/signup required to browse
5. **Maintains Security:** Can't modify bookings, only view

## Future Enhancements

### Potential Improvements
- [ ] Show original booking details (who booked, when, price paid)
- [ ] Add "Book This Hotel" quick action for shared link viewers
- [ ] Track conversion rate: shared link views → trip creations
- [ ] Add social sharing buttons in shared link mode (Twitter, Facebook)
- [ ] Show "Similar trips" section for inspiration
- [ ] Email capture: "Get notified of price drops" before viewing

### Analytics to Track
- Shared link open rate
- Time spent browsing hotels
- "Create Your Trip" button click rate
- Hotels clicked in shared link mode
- Conversion: shared link → new trip created

## Edge Cases Handled

1. **Prefilled hotel unavailable:** Shows fallback message
2. **Invalid shared link:** 404 page (handled by /r/[linkId] resolver)
3. **Expired shared link:** API returns error (handled by resolver)
4. **Multiple shared link opens:** Each gets independent browsing session
5. **Mixed mode:** If user has active trip AND opens shared link, prefill takes priority

## Security Considerations

- Shared links are read-only (no booking modifications)
- No trip data exposed (only hotel search results)
- Link expiry controlled by backend (`maxUses`, `expiresAt`)
- No authentication required (public browsing)
- Original booking details protected (not shown in shared link mode)

## Deployment Checklist

- [x] Code changes completed
- [x] TypeScript compilation clean
- [x] No console errors
- [x] Shared link detection working
- [x] UI adaptations applied
- [ ] Local multi-browser testing
- [ ] Vercel deployment
- [ ] Production shared link testing
- [ ] Mobile responsiveness check
- [ ] WhatsApp deep link compatibility verified

## Support & Debugging

### Common Issues

**"Waiting for Admin" still showing:**
- Check browser console for "🔗 [HotelFlow] Shared link mode detected" log
- Verify URL has `fromLink=true` parameter
- Verify `destination` parameter present
- Check `isSharedLinkMode` value in React DevTools

**"Create Your Trip" button not showing:**
- Verify `isSharedLinkMode` prop passed to HotelSelection
- Check banner message is set in useEffect
- Verify `setStep` hook imported from store

**Hotels not loading:**
- Check AVAILABLE_HOTELS mock data
- Verify destination matches mock data destinations
- Check browser console for errors

### Debug Commands
```typescript
// In browser console
localStorage.debug = 'true'; // Enable debug logging
window.location.href = '/?step=hotels&destination=Goa&fromLink=true&hotelId=h001'; // Test shared link
```

## Documentation References

- **API_DOCUMENTATION.md** - Shared link API endpoints
- **DEPLOYMENT_QUICKSTART.md** - Vercel deployment guide
- **DEBUG_GUIDE.md** - Debugging real-time sync issues
- **COPILOT_INSTRUCTIONS.md** - Project architecture overview
