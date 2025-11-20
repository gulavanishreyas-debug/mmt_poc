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
  try {
    if (kv) {
      const trip = await kv.get(`trip:${tripId}`) as Trip | null;
      console.log(`📦 [KV-Adapter] GET trip:${tripId}`, trip ? 'found' : 'not found');
      return trip;
    }
    
    // Fallback to local storage
    const trip = localTrips.get(tripId) || null;
    console.log(`📦 [Local] GET trip:${tripId}`, trip ? 'found' : 'not found');
    return trip;
  } catch (error) {
    console.error(`❌ [KV-Adapter] Error getting trip ${tripId}:`, error);
    return localTrips.get(tripId) || null;
  }
}

/**
 * Set trip in KV or local storage
 */
export async function setTrip(tripId: string, trip: Trip): Promise<void> {
  try {
    if (kv) {
      // Store in KV with 24-hour expiry
      await kv.set(`trip:${tripId}`, trip, { ex: 86400 });
      console.log(`💾 [KV-Adapter] SET trip:${tripId}`);
      return;
    }
    
    // Fallback to local storage
    localTrips.set(tripId, trip);
    console.log(`💾 [Local] SET trip:${tripId}`);
  } catch (error) {
    console.error(`❌ [KV-Adapter] Error setting trip ${tripId}:`, error);
    // Always update local cache as fallback
    localTrips.set(tripId, trip);
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
