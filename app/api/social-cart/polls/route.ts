import { NextRequest, NextResponse } from 'next/server';
import { trips, broadcastToTrip } from '../storage';

export async function POST(request: NextRequest) {
  try {
    const { tripId, poll, pollType, duration } = await request.json();

    console.log('📊 [API/polls/POST] Creating poll for trip:', tripId);
    console.log('📊 [API/polls/POST] Poll payload:', { poll, pollType, duration });

    if (!tripId) {
      return NextResponse.json(
        { error: 'Trip ID is required' },
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

    // Initialize polls array if it doesn't exist
    if (!trip.polls) {
      trip.polls = [];
    }

    const now = new Date();
    let pollData: any;

    const buildOptions = (rawOptions: any[]) =>
      rawOptions.map((opt, idx) => {
        if (typeof opt === 'string') {
          return { id: `opt${idx}`, text: opt, votes: [] };
        }
        return {
          id: opt.id || `opt${idx}`,
          text: opt.text,
          votes: opt.votes || [],
        };
      });

    if (poll) {
      const pollDuration = poll.duration || duration || 300;
      const expiresAt = new Date(now.getTime() + pollDuration * 1000).toISOString();

      pollData = {
        id: poll.id || `${poll.type}-${Date.now()}`,
        type: poll.type,
        question: poll.question,
        options: buildOptions(poll.options || []),
        createdBy: poll.createdBy || 'admin',
        createdAt: poll.createdAt || now.toISOString(),
        status: poll.status || 'active',
        duration: pollDuration,
        expiresAt,
      };
    } else if (pollType) {
      const pollDuration = duration || 300; // Default 5 minutes
      const expiresAt = new Date(now.getTime() + pollDuration * 1000);

      const formatDate = (date: Date) =>
        date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

      const makeRange = (startOffsetDays: number, endOffsetDays: number) => {
        const start = new Date(now.getTime() + startOffsetDays * 24 * 60 * 60 * 1000);
        const end = new Date(now.getTime() + endOffsetDays * 24 * 60 * 60 * 1000);
        return `${formatDate(start)} – ${formatDate(end)}`;
      };

      const dynamicDateOptions = [
        makeRange(3, 5),
        makeRange(7, 9),
        makeRange(14, 16),
      ];

      const pollTemplates: any = {
        budget: {
          question: "What's your budget range for this trip?",
          options: [
            { id: 'opt0', text: '₹5,000 - ₹7,000', votes: [] },
            { id: 'opt1', text: '₹7,000 - ₹12,000', votes: [] },
            { id: 'opt2', text: '₹12,000 - ₹18,000', votes: [] },
            { id: 'opt3', text: '₹18,000+', votes: [] },
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
        id: `${pollType}-${Date.now()}`,
        type: pollType,
        ...pollTemplates[pollType],
        createdBy: 'admin',
        createdAt: now.toISOString(),
        status: 'active',
        duration: pollDuration,
        expiresAt: expiresAt.toISOString(),
      };
    } else {
      return NextResponse.json(
        { error: 'Poll data or type is required' },
        { status: 400 }
      );
    }

    trip.polls.push(pollData);
    await trips.set(tripId, trip);

    console.log('✅ [API/polls/POST] Poll created successfully');

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
