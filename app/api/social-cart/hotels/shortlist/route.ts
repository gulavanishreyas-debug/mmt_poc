import { NextRequest, NextResponse } from 'next/server';
import { trips, broadcastToTrip } from '../../storage';

export async function POST(request: NextRequest) {
  try {
    const { tripId, hotels } = await request.json();

    console.log('🏨 [API/hotels/shortlist/POST] Shortlist received:', { tripId, hotelCount: hotels?.length });

    if (!tripId || !hotels || !Array.isArray(hotels)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const trip = trips.get(tripId);
    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Store shortlisted hotels in trip
    (trip as any).shortlistedHotels = hotels;
    
    // Start voting timer (5 minutes)
    const votingDuration = 300; // 5 minutes in seconds
    const expiresAt = new Date(Date.now() + votingDuration * 1000).toISOString();
    (trip as any).hotelVotingStatus = 'active';
    (trip as any).hotelVotingExpiresAt = expiresAt;
    
    trips.set(tripId, trip);

    console.log('✅ [API/hotels/shortlist/POST] Hotels shortlisted successfully with voting timer');

    // Broadcast to all connected clients
    broadcastToTrip(tripId, {
      type: 'HOTELS_SHORTLISTED',
      data: { 
        hotels,
        votingStatus: 'active',
        votingExpiresAt: expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      hotels,
    });
  } catch (error) {
    console.error('❌ [API/hotels/shortlist/POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
