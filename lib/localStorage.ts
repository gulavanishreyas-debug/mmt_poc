// Local storage utilities for trip data persistence (POC only)

const TRIPS_KEY = 'mmt_social_cart_trips';

export interface StoredTrip {
  tripId: string;
  tripName: string;
  destination: string;
  purpose: string;
  requiredMembers: number;
  members: any[];
  createdAt: string;
}

export function saveTripToLocalStorage(trip: StoredTrip) {
  console.log('💾 [localStorage] saveTripToLocalStorage called with:', trip);
  
  if (typeof window === 'undefined') {
    console.warn('⚠️ [localStorage] Window is undefined, skipping save');
    return;
  }
  
  try {
    console.log('💾 [localStorage] Getting existing trips...');
    const trips = getAllTripsFromLocalStorage();
    console.log('💾 [localStorage] Existing trips:', Object.keys(trips));
    
    trips[trip.tripId] = trip;
    console.log('💾 [localStorage] Updated trips object:', Object.keys(trips));
    
    const jsonString = JSON.stringify(trips);
    console.log('💾 [localStorage] JSON string length:', jsonString.length);
    
    localStorage.setItem(TRIPS_KEY, jsonString);
    console.log('✅ [localStorage] Trip saved successfully:', trip.tripId);
    
    // Verify it was saved
    const verification = localStorage.getItem(TRIPS_KEY);
    console.log('✅ [localStorage] Verification - item exists:', !!verification);
  } catch (error: any) {
    console.error('❌ [localStorage] Failed to save trip:', error);
    console.error('❌ [localStorage] Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
}

export function getTripFromLocalStorage(tripId: string): StoredTrip | null {
  console.log('🔍 [localStorage] getTripFromLocalStorage called for:', tripId);
  
  if (typeof window === 'undefined') {
    console.warn('⚠️ [localStorage] Window is undefined');
    return null;
  }
  
  try {
    const trips = getAllTripsFromLocalStorage();
    console.log('🔍 [localStorage] All trips in storage:', Object.keys(trips));
    console.log('🔍 [localStorage] Looking for trip:', tripId);
    
    const trip = trips[tripId] || null;
    
    if (trip) {
      console.log('✅ [localStorage] Trip found:', trip);
    } else {
      console.warn('⚠️ [localStorage] Trip not found in localStorage');
    }
    
    return trip;
  } catch (error: any) {
    console.error('❌ [localStorage] Failed to get trip:', error);
    return null;
  }
}

export function getAllTripsFromLocalStorage(): { [key: string]: StoredTrip } {
  if (typeof window === 'undefined') return {};
  
  try {
    const data = localStorage.getItem(TRIPS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to parse trips from localStorage:', error);
    return {};
  }
}

export function updateTripMembersInLocalStorage(tripId: string, members: any[]) {
  if (typeof window === 'undefined') return;
  
  try {
    const trips = getAllTripsFromLocalStorage();
    if (trips[tripId]) {
      trips[tripId].members = members;
      localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
      console.log('💾 Trip members updated in localStorage:', tripId);
    }
  } catch (error) {
    console.error('Failed to update trip members in localStorage:', error);
  }
}

export function clearTripsFromLocalStorage() {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(TRIPS_KEY);
    console.log('🗑️ Trips cleared from localStorage');
  } catch (error) {
    console.error('Failed to clear trips from localStorage:', error);
  }
}
