import { NextRequest, NextResponse } from 'next/server';
import { trips, broadcastToTrip, ChatMessage } from '../storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tripId, senderId, senderName, senderAvatar, message } = body;
    console.log(' [API/chat] POST - Sending message:', { tripId, senderId, message });

    if (!tripId || !senderId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const trip = trips.get(tripId);
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Check if sender is still a member
    const isMember = trip.members.some(m => m.id === senderId);
    if (!isMember) {
      console.error(' [API/chat] User is not a member:', senderId);
      return NextResponse.json({ error: 'You are not a member of this trip' }, { status: 403 });
    }

    const chatMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tripId,
      senderId,
      senderName,
      senderAvatar,
      message,
      timestamp: new Date().toISOString(),
    };

    if (!trip.chatMessages) {
      trip.chatMessages = [];
    }
    trip.chatMessages.push(chatMessage);
    trips.set(tripId, trip);

    console.log('✅ [API/chat] Message saved:', chatMessage.id);

    broadcastToTrip(tripId, {
      type: 'CHAT_MESSAGE',
      data: { message: chatMessage },
    });

    return NextResponse.json({ success: true, message: chatMessage });
  } catch (error) {
    console.error('❌ [API/chat] POST error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tripId = searchParams.get('tripId');

    if (!tripId) {
      return NextResponse.json({ error: 'Missing tripId' }, { status: 400 });
    }

    const trip = trips.get(tripId);
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    console.log('💬 [API/chat] GET - Returning', trip.chatMessages?.length || 0, 'messages');
    return NextResponse.json({ success: true, messages: trip.chatMessages || [] });
  } catch (error) {
    console.error('❌ [API/chat] GET error:', error);
    return NextResponse.json({ error: 'Failed to get messages' }, { status: 500 });
  }
}