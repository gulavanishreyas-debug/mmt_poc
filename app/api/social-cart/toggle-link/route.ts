import { NextRequest, NextResponse } from 'next/server';
import { trips, broadcastToTrip } from '../storage';

export async function POST(request: NextRequest) {
  console.log('🔗 [API/toggle-link] POST request received');
  
  try {
    const body = await request.json();
    const { tripId, adminId, isActive } = body;
    console.log('🔗 [API/toggle-link] Request:', { tripId, adminId, isActive });

    // Validate input
    if (!tripId || !adminId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the trip
    const trip = trips.get(tripId);
    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Verify admin privileges
    const admin = trip.members.find(m => m.id === adminId);
    if (!admin || !admin.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required' },
        { status: 403 }
      );
    }

    // Toggle link status
    trip.isLinkActive = isActive;
    trips.set(tripId, trip);

    console.log('✅ [API/toggle-link] Link status updated:', isActive);

    // Broadcast update
    broadcastToTrip(tripId, {
      type: 'LINK_STATUS_CHANGED',
      data: {
        isLinkActive: isActive,
      },
    });

    return NextResponse.json({
      success: true,
      isLinkActive: isActive,
    });
  } catch (error) {
    console.error('❌ [API/toggle-link] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
