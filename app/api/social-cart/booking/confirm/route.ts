import { NextRequest, NextResponse } from 'next/server';
import { trips, broadcastToTrip } from '../../storage';
import { setBooking } from '../../kv-adapter';
import type { CompletedBooking } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const { tripId, bookingDetails, userId } = await request.json();

    console.log('📋 [API/booking/confirm/POST] Booking confirmation:', { tripId, userId });

    if (!bookingDetails || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let trip = null;
    if (tripId) {
      trip = await trips.get(tripId);
      if (!trip) {
        return NextResponse.json(
          { error: 'Trip not found' },
          { status: 404 }
        );
      }
    }

    // Generate booking ID
    const bookingId = `MMT${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const now = new Date().toISOString();
    
    // Create complete booking record
    const completedBooking: CompletedBooking = {
      bookingId,
      userId,
      tripId: tripId || undefined,
      tripType: (trip?.purpose || 'casual') as any,
      destination: bookingDetails.destination || trip?.destination || 'Unknown',
      hotelId: bookingDetails.hotelId || trip?.selectedHotel?.id || 'hotel1',
      hotelName: bookingDetails.hotelName || trip?.selectedHotel?.name || 'Unknown Hotel',
      hotelImage: bookingDetails.hotelImage || trip?.selectedHotel?.image,
      checkIn: bookingDetails.checkIn,
      checkOut: bookingDetails.checkOut,
      guests: {
        adults: bookingDetails.adults || bookingDetails.groupSize || 2,
        children: bookingDetails.children || 0,
        rooms: bookingDetails.rooms || 1,
      },
      roomType: bookingDetails.roomType,
      pricing: {
        baseFare: bookingDetails.baseFare || bookingDetails.finalPrice * 0.85,
        taxes: bookingDetails.taxes || bookingDetails.finalPrice * 0.12,
        fees: bookingDetails.fees || bookingDetails.finalPrice * 0.03,
        subtotal: bookingDetails.finalPrice || 10000,
      },
      discounts: bookingDetails.discount ? {
        promoCode: bookingDetails.promoCode,
        percentage: bookingDetails.discountPercentage,
        amount: bookingDetails.discount,
        finalTotal: bookingDetails.finalPrice,
      } : undefined,
      paymentStatus: 'Success',
      paymentRef: `PAY${Math.random().toString(36).substr(2, 12).toUpperCase()}`,
      paymentMethod: bookingDetails.paymentMethod,
      guestName: bookingDetails.guestName,
      guestEmail: bookingDetails.guestEmail,
      guestPhone: bookingDetails.guestPhone,
      specialRequests: bookingDetails.specialRequests,
      createdAt: now,
      updatedAt: now,
      metadata: {
        sourceChannel: 'web',
        deviceType: 'desktop',
      },
      status: 'Confirmed',
      cancellable: true,
    };

    // Save booking for ALL members of the trip (if trip exists)
    // Otherwise just save for the current user
    const membersToSave = trip ? trip.members : [{ id: userId }];
    const savePromises = membersToSave.map(member => {
      const memberBooking: CompletedBooking = {
        ...completedBooking,
        userId: member.id, // Save for each member
      };
      return setBooking(`${bookingId}_${member.id}`, memberBooking);
    });
    
    await Promise.all(savePromises);
    
    console.log(`✅ [API/booking/confirm/POST] Booking saved for ${membersToSave.length} member(s)`);
    
    // Also store in trip for backward compatibility (only if trip exists)
    if (trip) {
      (trip as any).booking = completedBooking;
      (trip as any).hotelBookingStatus = 'confirmed';
      (trip as any).bookingConfirmation = {
        bookingId,
        hotelName: completedBooking.hotelName,
        checkIn: completedBooking.checkIn,
        checkOut: completedBooking.checkOut,
        roomType: completedBooking.roomType,
        finalPrice: completedBooking.pricing.subtotal,
        groupSize: completedBooking.guests.adults + completedBooking.guests.children,
      };
      
      await trips.set(tripId!, trip);
    }

    console.log('✅ [API/booking/confirm/POST] Booking confirmed and saved:', bookingId);

    // Broadcast booking confirmation to all members (only if trip exists)
    if (tripId && trip) {
      broadcastToTrip(tripId, {
        type: 'BOOKING_CONFIRMED',
        data: {
          bookingId,
          hotelName: completedBooking.hotelName,
          checkIn: completedBooking.checkIn,
          checkOut: completedBooking.checkOut,
          roomType: completedBooking.roomType,
          finalPrice: completedBooking.pricing.subtotal,
          groupSize: completedBooking.guests.adults + completedBooking.guests.children,
        },
      });
    }

    return NextResponse.json({
      success: true,
      bookingId,
      booking: completedBooking,
    });
  } catch (error) {
    console.error('❌ [API/booking/confirm/POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
