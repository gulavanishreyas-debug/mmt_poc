import { NextRequest, NextResponse } from 'next/server';
import { trips } from '../storage';

export async function POST(request: NextRequest) {
  console.log('🔵 [API/create] POST request received');
  
  try {
    const body = await request.json();
    console.log('🔵 [API/create] Request body:', body);
    
    const { tripName, destination, purpose, requiredMembers, adminName, linkValidityMinutes = 5 } = body;

    // Validate input
    if (!tripName || !destination || !purpose || !requiredMembers) {
      console.error('❌ [API/create] Validation failed:', { tripName, destination, purpose, requiredMembers });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate unique trip ID
    const tripId = `trip${Math.random().toString(36).substr(2, 9)}`;
    const adminId = `user${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🔵 [API/create] Generated IDs:', { tripId, adminId });

    // Calculate link expiration time (5 minutes)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + linkValidityMinutes * 60 * 1000);

    // Create trip object
    const trip = {
      tripId,
      tripName,
      destination,
      purpose,
      requiredMembers,
      members: [
        {
          id: adminId,
          name: adminName || 'You (Admin)',
          avatar: '👤',
          isAdmin: true,
          joinedAt: new Date().toISOString(),
        },
      ],
      linkExpiresAt: expiresAt.toISOString(),
      linkValidityMinutes,
      isLinkActive: true,
    };

    console.log('🔵 [API/create] Trip object created:', trip);

    // Store trip in memory
    trips.set(tripId, trip);
    console.log('🔵 [API/create] Trip stored in memory. Total trips:', trips.size);

    // Return success response
    const response = {
      success: true,
      tripId,
      adminId,
      trip,
    };
    
    console.log('✅ [API/create] Sending success response:', response);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ [API/create] Error creating trip:', error);
    console.error('❌ [API/create] Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
