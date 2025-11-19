import { NextRequest, NextResponse } from 'next/server';
import { trips, broadcastToTrip } from '../../storage';

export async function POST(request: NextRequest) {
  try {
    const { tripId, hotelId, vote, comment, userId } = await request.json();

    console.log('🗳️ [API/hotels/vote/POST] Vote received:', { tripId, hotelId, vote, userId });

    if (!tripId || !hotelId || !vote || !userId) {
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

    // Check if user is still a member
    const isMember = trip.members.some((m: any) => m.id === userId);
    if (!isMember) {
      console.error('❌ [API/hotels/vote] User is not a member:', userId);
      return NextResponse.json(
        { error: 'You are not a member of this trip' },
        { status: 403 }
      );
    }

    // Get shortlisted hotels
    const shortlistedHotels = (trip as any).shortlistedHotels || [];
    const hotel = shortlistedHotels.find((h: any) => h.id === hotelId);
    
    if (!hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      );
    }

    // Update vote
    if (!hotel.votes) {
      hotel.votes = {};
    }
    hotel.votes[userId] = { vote, comment };

    // Update trip
    (trip as any).shortlistedHotels = shortlistedHotels;
    trips.set(tripId, trip);

    console.log('✅ [API/hotels/vote/POST] Vote recorded successfully');

    // Broadcast updated hotels to all connected clients
    broadcastToTrip(tripId, {
      type: 'HOTEL_VOTE_UPDATED',
      data: { hotels: shortlistedHotels },
    });

    return NextResponse.json({
      success: true,
      hotels: shortlistedHotels,
    });
  } catch (error) {
    console.error('❌ [API/hotels/vote/POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
