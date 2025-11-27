import { NextRequest, NextResponse } from 'next/server';
import { getUserBookings } from '../kv-adapter';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    console.log('📋 [API/bookings/GET] Fetching bookings for user:', userId);

    const bookings = await getUserBookings(userId);

    console.log(`✅ [API/bookings/GET] Found ${bookings.length} bookings`);

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('❌ [API/bookings/GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
