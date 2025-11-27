import { NextRequest, NextResponse } from 'next/server';
import { getLink, incrementLinkUses } from '../../kv-adapter';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('linkId');

    if (!linkId) {
      return NextResponse.json(
        { error: 'Missing linkId parameter' },
        { status: 400 }
      );
    }

    console.log('🔗 [API/share/resolve/GET] Resolving link:', linkId);

    const link = await getLink(linkId);
    
    if (!link) {
      return NextResponse.json(
        { error: 'Link not found', code: 'INVALID' },
        { status: 404 }
      );
    }

    // Check if link is active
    if (!link.isActive) {
      return NextResponse.json(
        { error: 'Link is no longer active', code: 'INVALID' },
        { status: 410 }
      );
    }

    // Check if link has expired
    const now = new Date();
    const expiresAt = new Date(link.expiresAt);
    if (now > expiresAt) {
      return NextResponse.json(
        {
          error: 'Link has expired',
          code: 'EXPIRED',
          data: {
            destination: link.destination,
            hotelName: link.hotelName,
            checkIn: link.checkIn,
            checkOut: link.checkOut,
          },
        },
        { status: 410 }
      );
    }

    // Check max uses
    if (link.maxUses && link.currentUses >= link.maxUses) {
      return NextResponse.json(
        { error: 'Link has reached maximum uses', code: 'MAX_USES' },
        { status: 410 }
      );
    }

    // Increment usage counter
    await incrementLinkUses(linkId);

    console.log('✅ [API/share/resolve/GET] Link resolved successfully');

    return NextResponse.json({
      linkId: link.linkId,
      destination: link.destination,
      hotelId: link.hotelId,
      hotelName: link.hotelName,
      checkIn: link.checkIn,
      checkOut: link.checkOut,
      guests: link.guests,
      discountSummary: link.discountSummary,
    });
  } catch (error) {
    console.error('❌ [API/share/resolve/GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
