// Vercel KV Adapter for production deployment
// Falls back to in-memory storage for local development

import type { Trip } from './storage';

// Try to import Vercel KV at the top level (better for production)
let kv: any = null;
try {
  // Use dynamic import for better compatibility
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
  console.log('✅ [KV-Adapter] Vercel KV module loaded successfully');
} catch (error) {
  console.warn('⚠️ [KV-Adapter] @vercel/kv not available, will use in-memory storage');
}

// Environment detection - check if we should use KV
const isVercel = process.env.VERCEL === '1';
const hasKVUrl = !!process.env.KV_REST_API_URL;
const useKV = kv && (isVercel || hasKVUrl);

console.log(`🔵 [KV-Adapter] Environment check:`, {
  isVercel,
  hasKVUrl,
  kvModuleLoaded: !!kv,
  willUseKV: useKV,
});

// Local in-memory storage for development (MUST be global to persist across requests)
declare global {
  var localTripsStore: Map<string, Trip> | undefined;
}

const localTrips = global.localTripsStore || new Map<string, Trip>();
if (!global.localTripsStore) {
  global.localTripsStore = localTrips;
  console.log('🔵 [KV-Adapter] Initialized global local trips store');
}

/**
 * Get trip from KV or local storage
 */
export async function getTrip(tripId: string): Promise<Trip | null> {
  console.log(`🔍 [KV-Adapter] GET request for trip:${tripId}`);
  console.log(`🔍 [KV-Adapter] Storage mode: ${useKV ? 'KV' : 'LOCAL'}`);
  console.log(`🔍 [KV-Adapter] KV module available: ${!!kv}`);
  
  try {
    if (useKV && kv) {
      console.log(`📡 [KV-Adapter] Querying Vercel KV for trip:${tripId}`);
      const trip = await kv.get(`trip:${tripId}`) as Trip | null;
      console.log(`📦 [KV-Adapter] KV result:`, trip ? `found (${trip.tripName})` : 'not found');
      
      // Don't fallback to local cache in production - this would cause inconsistency
      return trip;
    }
    
    // Fallback to local storage in development
    const trip = localTrips.get(tripId) || null;
    console.log(`📦 [Local] GET trip:${tripId}`, trip ? `found (${trip.tripName})` : 'not found');
    console.log(`📦 [Local] Total trips in store: ${localTrips.size}`);
    return trip;
  } catch (error) {
    console.error(`❌ [KV-Adapter] Error getting trip ${tripId}:`, error);
    // In production, don't fallback to local cache - throw the error
    if (useKV) {
      throw error;
    }
    // In development, try local cache
    const fallbackTrip = localTrips.get(tripId) || null;
    console.log(`🔄 [KV-Adapter] Fallback to local cache:`, fallbackTrip ? 'found' : 'not found');
    return fallbackTrip;
  }
}

/**
 * Set trip in KV or local storage
 */
export async function setTrip(tripId: string, trip: Trip): Promise<void> {
  console.log(`💾 [KV-Adapter] SET request for trip:${tripId} (${trip.tripName})`);
  console.log(`💾 [KV-Adapter] Storage mode: ${useKV ? 'KV' : 'LOCAL'}`);
  console.log(`💾 [KV-Adapter] KV module available: ${!!kv}`);
  
  try {
    if (useKV && kv) {
      // In production, store in KV with 24-hour expiry
      console.log(`📡 [KV-Adapter] Saving to Vercel KV...`);
      await kv.set(`trip:${tripId}`, trip, { ex: 86400 });
      console.log(`✅ [KV-Adapter] Saved to KV: trip:${tripId}`);
      return;
    }
    
    // In development, save to local storage
    localTrips.set(tripId, trip);
    console.log(`✅ [Local] Cached trip:${tripId}`);
    console.log(`📦 [Local] Total trips in store: ${localTrips.size}`);
  } catch (error) {
    console.error(`❌ [KV-Adapter] Error setting trip ${tripId}:`, error);
    // In production, throw the error so caller knows it failed
    if (useKV) {
      throw error;
    }
    // In development, fallback to local cache
    localTrips.set(tripId, trip);
    console.log(`✅ [Fallback] Trip saved to local cache`);
  }
}

/**
 * Delete trip from KV or local storage
 */
export async function deleteTrip(tripId: string): Promise<void> {
  try {
    if (useKV && kv) {
      await kv.del(`trip:${tripId}`);
      console.log(`🗑️ [KV-Adapter] DELETE trip:${tripId} from KV`);
      return;
    }
    
    localTrips.delete(tripId);
    console.log(`🗑️ [Local] DELETE trip:${tripId}`);
  } catch (error) {
    console.error(`❌ [KV-Adapter] Error deleting trip ${tripId}:`, error);
    if (useKV) {
      throw error;
    }
    localTrips.delete(tripId);
  }
}

/**
 * Check if trip exists
 */
export async function hasTrip(tripId: string): Promise<boolean> {
  try {
    if (useKV && kv) {
      const exists = await kv.exists(`trip:${tripId}`);
      return exists === 1;
    }
    
    return localTrips.has(tripId);
  } catch (error) {
    console.error(`❌ [KV-Adapter] Error checking trip ${tripId}:`, error);
    if (useKV) {
      return false;
    }
    return localTrips.has(tripId);
  }
}

/**
 * Get all trip IDs (for debugging)
 */
export async function getAllTripIds(): Promise<string[]> {
  try {
    if (useKV && kv) {
      // KV doesn't support listing all keys easily, would need scanning
      // For now, return empty array in production
      return [];
    }
    
    return Array.from(localTrips.keys());
  } catch (error) {
    console.error('❌ [KV-Adapter] Error listing trips:', error);
    return Array.from(localTrips.keys());
  }
}

// Export storage mode for logging
export const storageMode = useKV ? 'KV' : 'LOCAL';
