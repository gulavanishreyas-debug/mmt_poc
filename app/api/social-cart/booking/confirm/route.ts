import { NextRequest, NextResponse } from 'next/server';
import { trips, broadcastToTrip } from '../../storage';

export async function POST(request: NextRequest) {
  try {
    const { tripId, bookingDetails } = await request.json();

    console.log('📋 [API/booking/confirm/POST] Booking confirmation:', { tripId });

    if (!tripId || !bookingDetails) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Generate booking ID
    const bookingId = `MMT${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Store booking details
    (trip as any).booking = {
      ...bookingDetails,
      bookingId,
      confirmedAt: new Date().toISOString(),
    };

    (trip as any).hotelBookingStatus = 'confirmed';
    (trip as any).bookingConfirmation = (trip as any).booking;
    
    await trips.set(tripId, trip);

    console.log('✅ [API/booking/confirm/POST] Booking confirmed:', bookingId);

    // Broadcast booking confirmation to all members
    broadcastToTrip(tripId, {
      type: 'BOOKING_CONFIRMED',
      data: {
        bookingId,
        hotelName: bookingDetails.hotelName,
        checkIn: bookingDetails.checkIn,
        checkOut: bookingDetails.checkOut,
        roomType: bookingDetails.roomType,
        finalPrice: bookingDetails.finalPrice,
        groupSize: bookingDetails.groupSize,
      },
    });

    return NextResponse.json({
      success: true,
      bookingId,
    });
  } catch (error) {
    console.error('❌ [API/booking/confirm/POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
