// Shared storage for trips
// Uses Vercel KV (Redis) in production, in-memory Map in development
// Import KV adapter for database operations
import { getTrip, setTrip, deleteTrip, hasTrip, getAllTripIds, storageMode } from './kv-adapter';

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
  shortlistedHotels?: any[];
  linkExpiresAt?: string; // ISO timestamp when link expires
  linkValidityMinutes?: number; // Minutes until link expires (default 5)
  isLinkActive?: boolean; // Manual override to disable link
  hotelVotingStatus?: 'active' | 'closed';
  hotelVotingExpiresAt?: string; // ISO timestamp when voting expires
  selectedHotel?: any; // The winning hotel after voting
  hotelBookingStatus?: 'pending' | 'confirmed' | null;
  bookingConfirmation?: any;
}

// Store for Server-Sent Events connections (always in-memory per instance)
declare global {
  var connectionsStore: Map<string, Set<(data: any) => void>> | undefined;
}

export const connections = global.connectionsStore || new Map<string, Set<(data: any) => void>>();
if (!global.connectionsStore) {
  global.connectionsStore = connections;
}

console.log(`🔵 [Storage] Initialized storage in ${storageMode} mode`);

// Export unified trips interface compatible with existing code
export const trips = {
  get: getTrip,
  set: setTrip,
  delete: deleteTrip,
  has: hasTrip,
  keys: getAllTripIds,
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
