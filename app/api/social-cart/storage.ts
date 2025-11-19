// Shared in-memory storage for POC
// In production, replace with actual database

export interface Member {
  id: string;
  name: string;
  avatar: string;
  isAdmin: boolean;
  mobile?: string;
  joinedAt: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // member IDs
}

export interface Poll {
  id: string;
  question: string;
  type: 'budget' | 'dates' | 'amenities';
  options: PollOption[];
  status: 'active' | 'closed';
  createdAt: string;
  createdBy: string;
  duration?: number; // Duration in seconds
  expiresAt?: string; // ISO timestamp when poll expires
}

export interface ChatMessage {
  id: string;
  tripId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  message: string;
  timestamp: string;
}

export interface Trip {
  tripId: string;
  tripName: string;
  destination: string;
  purpose: string;
  requiredMembers: number;
  members: Member[];
  polls?: Poll[];
  chatMessages?: ChatMessage[];
  linkExpiresAt?: string; // ISO timestamp when link expires
  linkValidityMinutes?: number; // Minutes until link expires (default 5)
  isLinkActive?: boolean; // Manual override to disable link
  hotelVotingStatus?: 'active' | 'closed';
  hotelVotingExpiresAt?: string; // ISO timestamp when voting expires
  selectedHotel?: any; // The winning hotel after voting
}

// Use global to persist across HMR (Hot Module Replacement)
// This prevents data loss during development when Next.js recompiles
declare global {
  var tripsStore: Map<string, Trip> | undefined;
  var connectionsStore: Map<string, Set<(data: any) => void>> | undefined;
}

// In-memory storage (persists across HMR in dev mode)
export const trips = global.tripsStore || new Map<string, Trip>();
if (!global.tripsStore) {
  global.tripsStore = trips;
  console.log('🔵 [Storage] Initialized new trips store');
} else {
  console.log('🔵 [Storage] Reusing existing trips store. Current trips:', trips.size);
}

// Store for Server-Sent Events connections
export const connections = global.connectionsStore || new Map<string, Set<(data: any) => void>>();
if (!global.connectionsStore) {
  global.connectionsStore = connections;
}

// Helper function to broadcast messages to all clients connected to a trip
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
  } else {
    console.log(`⚠️ [Storage] No connections found for trip ${tripId}`);
  }
}
