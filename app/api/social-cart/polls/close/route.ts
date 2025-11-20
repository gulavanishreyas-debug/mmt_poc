import { NextRequest, NextResponse } from 'next/server';
import { trips, broadcastToTrip } from '../../storage';

export async function POST(request: NextRequest) {
  try {
    const { tripId, pollId } = await request.json();

    console.log('✅ [API/polls/close/POST] Closing poll:', { tripId, pollId });

    if (!tripId || !pollId) {
      return NextResponse.json(
        { error: 'Trip ID and poll ID are required' },
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

    if (!trip.polls) {
      trip.polls = [];
    }

    // Find and close the poll
    const poll = trip.polls.find(p => p.id === pollId);
    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      );
    }

    poll.status = 'closed';
    await trips.set(tripId, trip);

    console.log('✅ [API/polls/close/POST] Poll closed successfully');

    // Broadcast to all connected clients
    broadcastToTrip(tripId, {
      type: 'POLL_CLOSED',
      data: { poll },
    });

    return NextResponse.json({
      success: true,
      poll,
    });
  } catch (error) {
    console.error('❌ [API/polls/close/POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
