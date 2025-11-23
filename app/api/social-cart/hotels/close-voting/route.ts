import { NextRequest, NextResponse } from 'next/server';
import { trips, broadcastToTrip } from '../../storage';

export async function POST(request: NextRequest) {
  try {
    const { tripId } = await request.json();

    console.log('🔒 [API/hotels/close-voting/POST] Closing hotel voting:', { tripId });

    if (!tripId) {
      return NextResponse.json(
        { error: 'Missing tripId' },
        { status: 400 }
      );
    }

    const trip = await trips.get(tripId);
    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Close voting
    (trip as any).hotelVotingStatus = 'closed';
    
    // Calculate winner
    const shortlistedHotels = (trip as any).shortlistedHotels || [];
    let winningHotel = null;
    let maxVotes = 0;

    shortlistedHotels.forEach((hotel: any) => {
      const loveVotes = Object.values(hotel.votes || {}).filter((v: any) => v.vote === 'love').length;
      if (loveVotes > maxVotes) {
        maxVotes = loveVotes;
        winningHotel = hotel;
      }
    });

    // Store selected hotel & booking status
    (trip as any).selectedHotel = winningHotel;
    (trip as any).hotelBookingStatus = 'pending';
    
    await trips.set(tripId, trip);

    console.log('✅ [API/hotels/close-voting/POST] Voting closed, winner:', (winningHotel as any)?.name);

    // Broadcast to all connected clients
    broadcastToTrip(tripId, {
      type: 'HOTEL_VOTING_CLOSED',
      data: { 
        votingStatus: 'closed',
        selectedHotel: winningHotel,
        hotelBookingStatus: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      selectedHotel: winningHotel,
    });
  } catch (error) {
    console.error('❌ [API/hotels/close-voting/POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
