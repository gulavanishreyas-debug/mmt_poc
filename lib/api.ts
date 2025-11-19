// API client functions for Social Cart

export interface CreateTripRequest {
  tripName: string;
  destination: string;
  purpose: 'wedding' | 'concert' | 'casual';
  requiredMembers: number;
  adminName?: string;
}

export interface JoinTripRequest {
  invitation_token: string;
  guest_name: string;
  guest_mobile?: string;
}

export interface RemoveMemberRequest {
  tripId: string;
  memberId: string;
  adminId: string;
}

export async function createTrip(data: CreateTripRequest) {
  console.log('📡 [API] createTrip called with:', data);
  
  try {
    const response = await fetch('/api/social-cart/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    console.log('📡 [API] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error response:', errorText);
      
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { error: errorText || 'Failed to create trip' };
      }
      
      throw new Error(error.error || 'Failed to create trip');
    }

    const result = await response.json();
    console.log('✅ [API] Success response:', result);
    return result;
  } catch (error: any) {
    console.error('❌ [API] Fetch error:', error);
    throw error;
  }
}

export async function joinTrip(data: JoinTripRequest) {
  const response = await fetch('/api/social-cart/join', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to join trip');
  }

  return response.json();
}

export async function getTripDetails(tripId: string) {
  console.log('📡 [API] getTripDetails called for:', tripId);
  
  const response = await fetch(`/api/social-cart/join?tripId=${tripId}`);
  console.log('📡 [API] getTripDetails response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ [API] getTripDetails error:', errorText);
    
    let error;
    try {
      error = JSON.parse(errorText);
    } catch {
      error = { error: errorText || 'Failed to fetch trip details' };
    }
    
    throw new Error(error.error || 'Failed to fetch trip details');
  }

  const result = await response.json();
  console.log('✅ [API] getTripDetails success:', result);
  return result;
}

export async function removeMember(data: RemoveMemberRequest) {
  const response = await fetch('/api/social-cart/remove-member', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove member');
  }

  return response.json();
}
