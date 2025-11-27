import { NextRequest, NextResponse } from 'next/server';
import { getBooking, setLink } from '../../kv-adapter';
import type { ShareableLink } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const { bookingId, userId, expiryDays = 7, permissions = 'PUBLIC', maxUses } = await request.json();

    console.log('🔗 [API/share/create/POST] Creating shareable link:', { bookingId, userId });

    if (!bookingId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Bookings are stored with format: bookingId_userId
    const bookingKey = bookingId.includes('_') ? bookingId : `${bookingId}_${userId}`;
    const booking = await getBooking(bookingKey);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (booking.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Generate short link ID
    const linkId = Math.random().toString(36).substr(2, 8).toUpperCase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

    const shareableLink: ShareableLink = {
      linkId,
      bookingId,
      creatorUserId: userId,
      destination: booking.destination,
      hotelId: booking.hotelId,
      hotelName: booking.hotelName,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: booking.guests,
      discountSummary: booking.discounts ? {
        percentage: booking.discounts.percentage,
        amount: booking.discounts.amount,
        promoCode: booking.discounts.promoCode,
      } : undefined,
      permissions,
      maxUses,
      currentUses: 0,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isActive: true,
    };

    await setLink(linkId, shareableLink);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/r/${linkId}`;

    console.log('✅ [API/share/create/POST] Link created:', shareUrl);

    return NextResponse.json({
      success: true,
      linkId,
      shareUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('❌ [API/share/create/POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
