import { NextRequest } from 'next/server';
import { connections } from '../storage';

// Server-Sent Events endpoint for real-time updates
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tripId = searchParams.get('tripId');

  if (!tripId) {
    return new Response('Trip ID is required', { status: 400 });
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`)
      );

      // Create callback function for this connection
      const callback = (data: any) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch (error) {
          console.error('Error sending SSE:', error);
        }
      };

      // Register this connection
      if (!connections.has(tripId)) {
        connections.set(tripId, new Set());
      }
      connections.get(tripId)!.add(callback);

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        const tripConnections = connections.get(tripId);
        if (tripConnections) {
          tripConnections.delete(callback);
          if (tripConnections.size === 0) {
            connections.delete(tripId);
          }
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
