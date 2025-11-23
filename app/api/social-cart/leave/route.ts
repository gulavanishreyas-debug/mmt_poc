import { NextRequest, NextResponse } from 'next/server';
import { trips, connections } from '../storage';

export async function POST(request: NextRequest) {
  console.log('👋 [API/leave] POST request received');
  
  try {
    const body = await request.json();
    const { tripId, memberId } = body;
    
    console.log('👋 [API/leave] Request payload:', { tripId, memberId });

    // Validate input
    if (!tripId || !memberId) {
      console.error('❌ [API/leave] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the trip
    const trip = await trips.get(tripId);
    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Find member
    const member = trip.members.find(m => m.id === memberId);
    if (!member) {
      return NextResponse.json(
        { error: 'Member not found in this trip' },
        { status: 404 }
      );
    }
    
    // Prevent admin from leaving
    if (member.isAdmin) {
      return NextResponse.json(
        { error: 'Admin cannot leave the trip' },
        { status: 400 }
      );
    }

    // Get member name before removing
    const memberName = member.name;

    // Remove member
    const memberCountBefore = trip.members.length;
    trip.members = trip.members.filter(m => m.id !== memberId);
    const memberCountAfter = trip.members.length;
    
    console.log('✅ [API/leave] Member left:', {
      memberName,
      memberCountBefore,
      memberCountAfter,
      remainingMembers: trip.members.map(m => m.name)
    });
    
    await trips.set(tripId, trip);

    // Add system notification about member leaving
    const systemMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tripId,
      senderId: 'system',
      senderName: 'System',
      senderAvatar: '#6366f1',
      message: `${memberName} left the trip`,
      timestamp: new Date().toISOString(),
      isSystemMessage: true,
    };

    if (!trip.chatMessages) {
      trip.chatMessages = [];
    }
    trip.chatMessages.push(systemMessage);
    await trips.set(tripId, trip);

    // Calculate if discount is still unlocked
    const isDiscountUnlocked = trip.members.length >= trip.requiredMembers;

    // Broadcast system message
    broadcastToTrip(tripId, {
      type: 'CHAT_MESSAGE',
      data: { message: systemMessage },
    });

    // Broadcast member removal
    broadcastToTrip(tripId, {
      type: 'MEMBER_REMOVED',
      data: {
        memberId,
        memberName,
        memberCount: trip.members.length,
        isDiscountUnlocked,
        requiredMembers: trip.requiredMembers,
      },
    });

    console.log('✅ [API/leave] Success response sent');
    
    return NextResponse.json({
      success: true,
      memberCount: trip.members.length,
      isDiscountUnlocked,
    });
  } catch (error) {
    console.error('Error processing leave request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function broadcastToTrip(tripId: string, message: any) {
  const tripConnections = connections.get(tripId);
  if (tripConnections) {
    tripConnections.forEach(callback => {
      callback(message);
    });
  }
}
