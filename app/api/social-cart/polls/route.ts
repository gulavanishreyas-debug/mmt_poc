import { NextRequest, NextResponse } from 'next/server';
import { trips, broadcastToTrip } from '../storage';

export async function POST(request: NextRequest) {
  try {
    const { tripId, poll, pollType, duration } = await request.json();

    console.log('📊 [API/polls/POST] Creating poll for trip:', tripId);
    console.log('📊 [API/polls/POST] Poll data:', { poll, pollType, duration });

    if (!tripId) {
      return NextResponse.json(
        { error: 'Trip ID is required' },
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

    // Initialize polls array if it doesn't exist
    if (!trip.polls) {
      trip.polls = [];
    }

    // If pollType is provided, create the poll automatically
    let pollData = poll;
    if (pollType) {
      const pollId = Date.now().toString();
      const now = new Date();
      const pollDuration = duration || 300; // Default 5 minutes
      const expiresAt = new Date(now.getTime() + pollDuration * 1000);

      // Helper to format a single date (e.g. 20–22 Nov 2025)
      const formatDate = (date: Date) =>
        date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

      // Helper to build a range starting N days from today
      const makeRange = (startOffsetDays: number, endOffsetDays: number) => {
        const start = new Date(now.getTime() + startOffsetDays * 24 * 60 * 60 * 1000);
        const end = new Date(now.getTime() + endOffsetDays * 24 * 60 * 60 * 1000);
        return `${formatDate(start)} – ${formatDate(end)}`;
      };

      // Build dynamic date ranges relative to today
      const dynamicDateOptions = [
        makeRange(3, 5),   // ~Coming weekend / next few days
        makeRange(7, 9),   // Following week
        makeRange(14, 16), // Two weeks out
      ];

      // Create poll based on type
      const pollTemplates: any = {
        budget: {
          question: "What's your budget range for this trip?",
          options: [
            { id: 'opt0', text: '₹10,000 - ₹20,000', votes: [] },
            { id: 'opt1', text: '₹20,000 - ₹30,000', votes: [] },
            { id: 'opt2', text: '₹30,000 - ₹50,000', votes: [] },
            { id: 'opt3', text: '₹50,000+', votes: [] },
          ],
        },
        dates: {
          question: 'When should we go?',
          options: [
            { id: 'opt0', text: dynamicDateOptions[0], votes: [] },
            { id: 'opt1', text: dynamicDateOptions[1], votes: [] },
            { id: 'opt2', text: dynamicDateOptions[2], votes: [] },
            { id: 'opt3', text: "I'm flexible with dates", votes: [] },
          ],
        },
        amenities: {
          question: 'What amenities are important?',
          options: [
            { id: 'opt0', text: 'Swimming Pool', votes: [] },
            { id: 'opt1', text: 'Beach Access', votes: [] },
            { id: 'opt2', text: 'Spa & Wellness', votes: [] },
            { id: 'opt3', text: 'Restaurant', votes: [] },
          ],
        },
      };

      pollData = {
        id: pollId,
        type: pollType,
        ...pollTemplates[pollType],
        createdBy: 'admin',
        createdAt: now.toISOString(),
        status: 'active',
        duration: pollDuration,
        expiresAt: expiresAt.toISOString(),
      };
    }

    // Add poll to trip
    trip.polls.push(pollData);
    trips.set(tripId, trip);

    console.log('✅ [API/polls/POST] Poll created successfully');

    // Broadcast to all connected clients
    broadcastToTrip(tripId, {
      type: 'POLL_CREATED',
      data: { poll: pollData },
    });

    return NextResponse.json({
      success: true,
      poll: pollData,
    });
  } catch (error) {
    console.error('❌ [API/polls/POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
