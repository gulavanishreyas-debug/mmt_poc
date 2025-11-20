// Vercel KV Adapter for production deployment
// Falls back to in-memory storage for local development

import type { Trip } from './storage';

// Environment detection
const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production';
const useKV = isVercel || (isProduction && process.env.KV_REST_API_URL);

// Lazy import KV to avoid errors in development
let kv: any = null;
if (useKV) {
  try {
    const kvModule = require('@vercel/kv');
    kv = kvModule.kv;
    console.log('✅ [KV-Adapter] Using Vercel KV for storage');
  } catch (error) {
    console.warn('⚠️ [KV-Adapter] @vercel/kv not found, falling back to in-memory storage');
  }
}

// Local in-memory storage for development
const localTrips = new Map<string, Trip>();

/**
 * Get trip from KV or local storage
 */
export async function getTrip(tripId: string): Promise<Trip | null> {
  console.log(`🔍 [KV-Adapter] GET request for trip:${tripId}`);
  console.log(`🔍 [KV-Adapter] Storage mode: ${kv ? 'KV' : 'LOCAL'}`);
  
  try {
    if (kv) {
      console.log(`📡 [KV-Adapter] Querying Vercel KV for trip:${tripId}`);
      const trip = await kv.get(`trip:${tripId}`) as Trip | null;
      console.log(`📦 [KV-Adapter] KV result:`, trip ? `found (${trip.tripName})` : 'not found');
      
      // If not found in KV, check local cache as fallback
      if (!trip) {
        console.log(`⚠️ [KV-Adapter] Trip not in KV, checking local cache...`);
        const localTrip = localTrips.get(tripId);
        if (localTrip) {
          console.log(`✅ [KV-Adapter] Found in local cache, syncing to KV...`);
          await kv.set(`trip:${tripId}`, localTrip, { ex: 86400 });
          return localTrip;
        }
      }
      
      return trip;
    }
    
    // Fallback to local storage
    const trip = localTrips.get(tripId) || null;
    console.log(`📦 [Local] GET trip:${tripId}`, trip ? `found (${trip.tripName})` : 'not found');
    return trip;
  } catch (error) {
    console.error(`❌ [KV-Adapter] Error getting trip ${tripId}:`, error);
    // Always try local cache on error
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
  console.log(`💾 [KV-Adapter] Storage mode: ${kv ? 'KV' : 'LOCAL'}`);
  
  try {
    // Always update local cache first
    localTrips.set(tripId, trip);
    console.log(`✅ [Local] Cached trip:${tripId}`);
    
    if (kv) {
      // Store in KV with 24-hour expiry
      console.log(`📡 [KV-Adapter] Saving to Vercel KV...`);
      await kv.set(`trip:${tripId}`, trip, { ex: 86400 });
      console.log(`✅ [KV-Adapter] Saved to KV: trip:${tripId}`);
      return;
    }
    
    console.log(`💾 [Local] Saved locally only (KV not available)`);
  } catch (error) {
    console.error(`❌ [KV-Adapter] Error setting trip ${tripId}:`, error);
    // Local cache already updated above, so we're safe
    console.log(`✅ [Fallback] Trip saved to local cache`);
  }
}

/**
 * Delete trip from KV or local storage
 */
export async function deleteTrip(tripId: string): Promise<void> {
  try {
    if (kv) {
      await kv.del(`trip:${tripId}`);
      console.log(`🗑️ [KV-Adapter] DELETE trip:${tripId}`);
      return;
    }
    
    localTrips.delete(tripId);
    console.log(`🗑️ [Local] DELETE trip:${tripId}`);
  } catch (error) {
    console.error(`❌ [KV-Adapter] Error deleting trip ${tripId}:`, error);
    localTrips.delete(tripId);
  }
}

/**
 * Check if trip exists
 */
export async function hasTrip(tripId: string): Promise<boolean> {
  try {
    if (kv) {
      const exists = await kv.exists(`trip:${tripId}`);
      return exists === 1;
    }
    
    return localTrips.has(tripId);
  } catch (error) {
    console.error(`❌ [KV-Adapter] Error checking trip ${tripId}:`, error);
    return localTrips.has(tripId);
  }
}

/**
 * Get all trip IDs (for debugging)
 */
export async function getAllTripIds(): Promise<string[]> {
  try {
    if (kv) {
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
export const storageMode = kv ? 'KV' : 'LOCAL';
