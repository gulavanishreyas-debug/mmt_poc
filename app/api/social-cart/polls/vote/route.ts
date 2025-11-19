import { NextRequest, NextResponse } from 'next/server';
import { trips, broadcastToTrip } from '../../storage';

export async function POST(request: NextRequest) {
  try {
    const { tripId, pollId, optionId, userId } = await request.json();

    console.log('🗳️ [API/polls/vote/POST] Vote received:', { tripId, pollId, optionId, userId });

    if (!tripId || !pollId || optionId === undefined || optionId === null || !userId) {
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
    const isMember = trip.members.some(m => m.id === userId);
    if (!isMember) {
      console.error('❌ [API/polls/vote] User is not a member:', userId);
      return NextResponse.json(
        { error: 'You are not a member of this trip' },
        { status: 403 }
      );
    }

    if (!trip.polls) {
      trip.polls = [];
    }

    // Find the poll
    const poll = trip.polls.find(p => p.id === pollId);
    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      );
    }

    // Normalize optionId to an array of IDs
    let optionIds: string[] = Array.isArray(optionId) ? optionId : [optionId];

    // For single-select polls (budget, dates), only keep the first choice
    if (poll.type !== 'amenities' && optionIds.length > 1) {
      optionIds = [optionIds[0]];
    }

    // Remove user's previous vote from all options
    poll.options.forEach(opt => {
      opt.votes = opt.votes.filter(id => id !== userId);
    });

    // Add vote to all selected options (multi-select supported for amenities)
    optionIds.forEach(id => {
      const selectedOption = poll.options.find(opt => opt.id === id);
      if (selectedOption) {
        selectedOption.votes.push(userId);
      }
    });

    trips.set(tripId, trip);

    console.log('✅ [API/polls/vote/POST] Vote recorded successfully');

    // Broadcast updated poll to all connected clients
    broadcastToTrip(tripId, {
      type: 'POLL_UPDATED',
      data: { poll },
    });

    return NextResponse.json({
      success: true,
      poll,
    });
  } catch (error) {
    console.error('❌ [API/polls/vote/POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
