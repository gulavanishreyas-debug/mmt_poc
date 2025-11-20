import { NextRequest, NextResponse } from 'next/server';
import { trips, connections } from '../storage';

export async function POST(request: NextRequest) {
  console.log('🟢 [API/join] POST request received');
  
  try {
    const body = await request.json();
    console.log('🟢 [API/join] Request body:', body);
    
    const { invitation_token, guest_name, guest_mobile } = body;

    // Validate input
    if (!invitation_token || !guest_name) {
      console.error('❌ [API/join] Validation failed:', { invitation_token, guest_name });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the trip
    console.log('🟢 [API/join] Looking for trip:', invitation_token);
    console.log('🟢 [API/join] Process env VERCEL:', process.env.VERCEL);
    console.log('🟢 [API/join] Process env NODE_ENV:', process.env.NODE_ENV);
    
    const trip = await trips.get(invitation_token);
    
    if (!trip) {
      console.error('❌ [API/join] Trip not found:', invitation_token);
      console.error('❌ [API/join] This could mean:');
      console.error('  1. KV database not set up in Vercel');
      console.error('  2. Trip was created in different instance');
      console.error('  3. Trip expired (24h TTL)');
      
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }
    
    console.log('🟢 [API/join] Trip found:', trip);

    // Check if link has expired (time-based)
    if (trip.linkExpiresAt) {
      const now = new Date();
      const expiresAt = new Date(trip.linkExpiresAt);
      if (now > expiresAt) {
        console.error('❌ [API/join] Link expired:', { now, expiresAt });
        return NextResponse.json(
          { error: 'This invitation link has expired' },
          { status: 410 } // 410 Gone
        );
      }
    }

    // Check if link is manually disabled
    if (trip.isLinkActive === false) {
      console.error('❌ [API/join] Link disabled by admin');
      return NextResponse.json(
        { error: 'This invitation link has been disabled by the admin' },
        { status: 403 }
      );
    }

    // Check if group is full (headcount met)
    if (trip.members.length >= trip.requiredMembers) {
      console.error('❌ [API/join] Group is full:', { current: trip.members.length, required: trip.requiredMembers });
      return NextResponse.json(
        { error: 'This group is already full' },
        { status: 409 }
      );
    }

    // Check if user already joined (only by mobile if provided)
    if (guest_mobile) {
      const existingMember = trip.members.find(m => m.mobile === guest_mobile);
      if (existingMember) {
        return NextResponse.json(
          { error: 'You have already joined this trip' },
          { status: 409 }
        );
      }
    }

    // Create new member
    const newMember = {
      id: `user${Math.random().toString(36).substr(2, 9)}`,
      name: guest_name,
      avatar: getAvatarEmoji(trip.members.length),
      isAdmin: false,
      mobile: guest_mobile,
      joinedAt: new Date().toISOString(),
    };

    // Add member to trip (atomic operation)
    trip.members.push(newMember);
    await trips.set(invitation_token, trip);

    // Calculate if discount is unlocked
    const isDiscountUnlocked = trip.members.length >= trip.requiredMembers;

    // Broadcast real-time update to all connected clients for this trip
    broadcastToTrip(invitation_token, {
      type: 'MEMBER_JOINED',
      data: {
        member: newMember,
        memberCount: trip.members.length,
        isDiscountUnlocked,
        requiredMembers: trip.requiredMembers,
      },
    });

    // If all members joined, broadcast special event
    if (isDiscountUnlocked) {
      console.log('🎉 [API/join/POST] All members joined! Broadcasting ALL_MEMBERS_JOINED');
      broadcastToTrip(invitation_token, {
        type: 'ALL_MEMBERS_JOINED',
        data: {
          memberCount: trip.members.length,
          requiredMembers: trip.requiredMembers,
        },
      });
    }

    // Return success response with full trip data
    return NextResponse.json({
      success: true,
      member: newMember,
      trip: {
        tripId: trip.tripId,
        tripName: trip.tripName,
        destination: trip.destination,
        purpose: trip.purpose,
        requiredMembers: trip.requiredMembers,
        members: trip.members,
      },
      memberCount: trip.members.length,
      isDiscountUnlocked,
      message: 'Successfully joined the trip!',
    });
  } catch (error) {
    console.error('Error joining trip:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve trip details
export async function GET(request: NextRequest) {
  console.log(' [API/join/GET] Request received');
  
  const { searchParams } = new URL(request.url);
  const tripId = searchParams.get('tripId');
  
  console.log(' [API/join/GET] Looking for tripId:', tripId);

  if (!tripId) {
    console.error(' [API/join/GET] No tripId provided');
    return NextResponse.json(
      { error: 'Trip ID is required' },
      { status: 400 }
    );
  }

  const trip = await trips.get(tripId);
  if (!trip) {
    console.error(' [API/join/GET] Trip not found:', tripId);
    return NextResponse.json(
      { error: 'Trip not found' },
      { status: 404 }
    );
  }

  console.log(' [API/join/GET] Trip found:', trip);
  return NextResponse.json({
    success: true,
    trip,
  });
}

// Helper function to broadcast updates to all connected clients
function broadcastToTrip(tripId: string, message: any) {
  const tripConnections = connections.get(tripId);
  if (tripConnections) {
    tripConnections.forEach(callback => {
      callback(message);
    });
  }
}

// Helper function to get avatar emoji
function getAvatarEmoji(index: number): string {
  const emojis = ['👤', '👨', '👩', '🧑', '👱', '👨‍🦱', '👩‍🦱', '👨‍🦰', '👩‍🦰', '👨‍🦳'];
  return emojis[index % emojis.length];
}
