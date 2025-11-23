import { NextRequest, NextResponse } from 'next/server';
import { trips, connections } from '../storage';

export async function POST(request: NextRequest) {
  console.log('🗑️ [API/remove-member] POST request received');
  
  try {
    const body = await request.json();
    const { tripId, memberId, adminId } = body;
    
    console.log('🗑️ [API/remove-member] Request payload:', { tripId, memberId, adminId });

    // Validate input
    if (!tripId || !memberId || !adminId) {
      console.error('❌ [API/remove-member] Missing required fields');
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

    // Verify admin privileges
    const admin = trip.members.find(m => m.id === adminId);
    if (!admin || !admin.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required' },
        { status: 403 }
      );
    }

    // Find member to remove
    console.log('🔍 [API/remove-member] Detailed member lookup:', {
      searchingFor: memberId,
      memberIdType: typeof memberId,
      memberIdLength: memberId.length,
      allMemberIds: trip.members.map(m => ({
        id: m.id,
        name: m.name,
        idType: typeof m.id,
        idLength: m.id.length,
        matches: m.id === memberId,
        exactMatch: m.id === memberId,
        trimmedMatch: m.id.trim() === memberId.trim()
      }))
    });
    
    const memberToRemove = trip.members.find(m => m.id === memberId);
    console.log('🔍 [API/remove-member] Member lookup result:', {
      found: !!memberToRemove,
      memberToRemove: memberToRemove ? { id: memberToRemove.id, name: memberToRemove.name } : null
    });
    
    if (!memberToRemove) {
      console.error('❌ [API/remove-member] Member not found in trip');
      return NextResponse.json(
        { error: 'Member not found in this trip' },
        { status: 404 }
      );
    }
    
    // Prevent removing admin
    if (memberToRemove.isAdmin) {
      console.error('❌ [API/remove-member] Attempted to remove admin');
      return NextResponse.json(
        { error: 'Cannot remove admin' },
        { status: 400 }
      );
    }

    // Get member name before removing
    const removedMemberName = memberToRemove.name;

    // Remove member
    const memberCountBefore = trip.members.length;
    trip.members = trip.members.filter(m => m.id !== memberId);
    const memberCountAfter = trip.members.length;
    
    console.log('✅ [API/remove-member] Member removed:', {
      removedMemberName,
      memberCountBefore,
      memberCountAfter,
      remainingMembers: trip.members.map(m => m.name)
    });
    
    await trips.set(tripId, trip);

    // Add system notification about removal
    const systemMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tripId,
      senderId: 'system',
      senderName: 'System',
      senderAvatar: '#6366f1',
      message: `${admin.name} removed ${removedMemberName} from the trip`,
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
        memberName: removedMemberName,
        memberCount: trip.members.length,
        isDiscountUnlocked,
        requiredMembers: trip.requiredMembers,
      },
    });

    console.log('✅ [API/remove-member] Success response sent');
    
    return NextResponse.json({
      success: true,
      memberCount: trip.members.length,
      isDiscountUnlocked,
      removedMember: removedMemberName,
    });
  } catch (error) {
    console.error('Error removing member:', error);
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
