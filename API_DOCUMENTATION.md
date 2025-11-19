# Social Cart 2.0 - API Documentation

## 🔄 Real-Time Synchronization Architecture

This implementation uses **Server-Sent Events (SSE)** for real-time updates, ensuring instant synchronization between admin and guest views.

---

## 📡 API Endpoints

### 1. **POST /api/social-cart/create**
Creates a new trip and initializes the cart.

**Request Body:**
```json
{
  "tripName": "Beach Buddies Getaway",
  "destination": "Goa",
  "purpose": "casual",
  "requiredMembers": 5,
  "adminName": "You (Admin)"
}
```

**Response:**
```json
{
  "success": true,
  "tripId": "trip1234abcd",
  "adminId": "user5678efgh",
  "trip": {
    "tripId": "trip1234abcd",
    "tripName": "Beach Buddies Getaway",
    "destination": "Goa",
    "purpose": "casual",
    "requiredMembers": 5,
    "members": [
      {
        "id": "user5678efgh",
        "name": "You (Admin)",
        "avatar": "👤",
        "isAdmin": true,
        "joinedAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

### 2. **POST /api/social-cart/join**
Adds a guest to the trip (the critical endpoint for user synchronization).

**Request Body:**
```json
{
  "invitation_token": "trip1234abcd",
  "guest_name": "John Doe",
  "guest_mobile": "+91 98765 43210"
}
```

**Response:**
```json
{
  "success": true,
  "member": {
    "id": "user9012ijkl",
    "name": "John Doe",
    "avatar": "👨",
    "isAdmin": false,
    "mobile": "+91 98765 43210",
    "joinedAt": "2024-01-15T10:35:00.000Z"
  },
  "memberCount": 2,
  "isDiscountUnlocked": false,
  "message": "Successfully joined the trip!"
}
```

**What Happens Behind the Scenes:**
1. ✅ Validates invitation token
2. ✅ Creates member record in database
3. ✅ Atomically increments member count
4. ✅ **Broadcasts real-time event to all connected clients**
5. ✅ Returns updated trip state

---

### 3. **GET /api/social-cart/join?tripId={tripId}**
Retrieves trip details for the join page.

**Response:**
```json
{
  "success": true,
  "trip": {
    "tripId": "trip1234abcd",
    "tripName": "Beach Buddies Getaway",
    "destination": "Goa",
    "purpose": "casual",
    "requiredMembers": 5,
    "members": [...],
    "isDiscountUnlocked": false
  }
}
```

---

### 4. **GET /api/social-cart/events?tripId={tripId}**
**Server-Sent Events (SSE) endpoint** for real-time updates.

**Connection Type:** `text/event-stream`

**Event Types:**

#### CONNECTED
Sent immediately upon connection.
```json
{
  "type": "CONNECTED"
}
```

#### MEMBER_JOINED
Broadcast when a new member joins.
```json
{
  "type": "MEMBER_JOINED",
  "data": {
    "member": {
      "id": "user9012ijkl",
      "name": "John Doe",
      "avatar": "👨",
      "isAdmin": false,
      "mobile": "+91 98765 43210",
      "joinedAt": "2024-01-15T10:35:00.000Z"
    },
    "memberCount": 2,
    "isDiscountUnlocked": false,
    "requiredMembers": 5
  }
}
```

#### MEMBER_REMOVED
Broadcast when admin removes a member.
```json
{
  "type": "MEMBER_REMOVED",
  "data": {
    "memberId": "user9012ijkl",
    "memberCount": 1,
    "isDiscountUnlocked": false,
    "requiredMembers": 5
  }
}
```

---

### 5. **POST /api/social-cart/remove-member**
Removes a member from the trip (admin only).

**Request Body:**
```json
{
  "tripId": "trip1234abcd",
  "memberId": "user9012ijkl",
  "adminId": "user5678efgh"
}
```

**Response:**
```json
{
  "success": true,
  "memberCount": 1,
  "isDiscountUnlocked": false
}
```

**Security:**
- ✅ Validates admin privileges
- ✅ Prevents admin self-removal
- ✅ Broadcasts update to all clients

---

## 🔄 Real-Time Synchronization Flow

### Admin View (Trip Creator)
```
1. Admin creates trip → POST /api/social-cart/create
2. Admin opens Trip Hub → Connects to SSE /api/social-cart/events
3. Guest joins via link → Admin receives MEMBER_JOINED event
4. Admin's UI updates instantly with new member
5. Progress bar updates (e.g., 2/5 → 3/5)
6. Confetti triggers when discount unlocks
```

### Guest View (Joining User)
```
1. Guest clicks invitation link → GET /api/social-cart/join?tripId=...
2. Guest enters name & clicks "Count Me In" → POST /api/social-cart/join
3. Server validates & adds member to database
4. Server broadcasts MEMBER_JOINED to all connected clients
5. Guest sees success animation
6. Guest redirects to main app
```

### Real-Time Update Mechanism
```typescript
// Frontend Hook (useRealTimeSync.ts)
const eventSource = new EventSource(`/api/social-cart/events?tripId=${tripId}`);

eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'MEMBER_JOINED') {
    // Update local state
    addMember(message.data.member);
    
    // Show notification
    console.log(`🎉 ${message.data.member.name} joined!`);
    
    // Trigger confetti if discount unlocked
    if (message.data.isDiscountUnlocked) {
      triggerConfetti();
    }
  }
};
```

---

## 💾 Data Storage (POC Implementation)

**Current:** In-memory Map storage
```typescript
const trips = new Map<string, TripData>();
const connections = new Map<string, Set<Callback>>();
```

**Production Recommendations:**
- Replace with PostgreSQL/MongoDB
- Add Redis for pub/sub messaging
- Implement WebSocket for bidirectional communication
- Add authentication & authorization
- Implement rate limiting

---

## 🔐 Security Considerations

### Current POC
- ✅ Basic validation of required fields
- ✅ Admin privilege checks
- ✅ Duplicate member prevention

### Production Requirements
- 🔒 JWT authentication
- 🔒 CSRF protection
- 🔒 Rate limiting (prevent spam joins)
- 🔒 Input sanitization
- 🔒 Mobile number encryption
- 🔒 Invitation token expiry
- 🔒 HTTPS only

---

## 📊 Database Schema (Production)

### Social_Cart Table
```sql
CREATE TABLE social_cart (
  cart_id VARCHAR(50) PRIMARY KEY,
  trip_name VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  purpose ENUM('wedding', 'concert', 'casual') NOT NULL,
  required_members INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  status ENUM('active', 'completed', 'expired') DEFAULT 'active'
);
```

### Cart_Members Table
```sql
CREATE TABLE cart_members (
  member_id VARCHAR(50) PRIMARY KEY,
  cart_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  mobile VARCHAR(20),
  avatar VARCHAR(10),
  is_admin BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cart_id) REFERENCES social_cart(cart_id) ON DELETE CASCADE
);
```

### Indexes
```sql
CREATE INDEX idx_cart_members_cart_id ON cart_members(cart_id);
CREATE INDEX idx_social_cart_status ON social_cart(status);
```

---

## 🧪 Testing the API

### Test User Join Flow
```bash
# 1. Create a trip
curl -X POST http://localhost:3000/api/social-cart/create \
  -H "Content-Type: application/json" \
  -d '{
    "tripName": "Test Trip",
    "destination": "Goa",
    "purpose": "casual",
    "requiredMembers": 3
  }'

# 2. Join the trip (use tripId from response)
curl -X POST http://localhost:3000/api/social-cart/join \
  -H "Content-Type: application/json" \
  -d '{
    "invitation_token": "trip1234abcd",
    "guest_name": "Test User",
    "guest_mobile": "+91 98765 43210"
  }'

# 3. Get trip details
curl http://localhost:3000/api/social-cart/join?tripId=trip1234abcd
```

### Test Real-Time Events
```bash
# Open SSE connection (keep terminal open)
curl -N http://localhost:3000/api/social-cart/events?tripId=trip1234abcd

# In another terminal, join the trip
# You should see MEMBER_JOINED event in the first terminal
```

---

## 🚀 Deployment Checklist

- [ ] Replace in-memory storage with database
- [ ] Add Redis for real-time pub/sub
- [ ] Implement proper authentication
- [ ] Add rate limiting
- [ ] Set up monitoring & logging
- [ ] Configure CORS properly
- [ ] Add error tracking (Sentry)
- [ ] Set up CI/CD pipeline
- [ ] Add API documentation (Swagger)
- [ ] Implement backup strategy

---

## 📝 Notes

- **SSE vs WebSocket:** SSE is simpler for one-way server→client updates
- **Scalability:** For production, use Redis pub/sub to broadcast across multiple server instances
- **Fallback:** Implement polling fallback for browsers that don't support SSE
- **Connection Management:** Clean up SSE connections on unmount to prevent memory leaks

---

## 🎯 Key Features Implemented

✅ **Persistent Data Storage** - Members are stored on server
✅ **Real-Time Synchronization** - Instant updates via SSE
✅ **Admin Controls** - Remove members with privilege checks
✅ **Atomic Operations** - Thread-safe member count updates
✅ **Broadcast Events** - All connected clients receive updates
✅ **Error Handling** - Graceful failures with user feedback
✅ **Loading States** - UI feedback during API calls
✅ **Duplicate Prevention** - Can't join same trip twice

---

## 🔗 Frontend Integration

The frontend automatically connects to the real-time API when a trip is active:

```typescript
// app/page.tsx
const { isConnected } = useRealTimeSync(tripId);

// Automatically handles:
// - SSE connection establishment
// - Event listening & parsing
// - State updates via Zustand
// - Confetti triggers
// - Connection cleanup
```

All components use the centralized Zustand store, which is updated by both:
1. Direct API calls (user actions)
2. Real-time SSE events (other users' actions)

This ensures **perfect synchronization** across all connected clients! 🎉
