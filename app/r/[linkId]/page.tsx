'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clock, AlertCircle, RefreshCw } from 'lucide-react';

export default function DeepLinkResolver() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'expired' | 'invalid' | 'error'>('loading');
  const [linkData, setLinkData] = useState<any>(null);

  useEffect(() => {
    const linkId = params.linkId as string;
    if (!linkId) {
      setStatus('invalid');
      return;
    }

    // Validate and resolve link
    fetch(`/api/social-cart/share/resolve?linkId=${linkId}`)
      .then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          if (error.code === 'EXPIRED') {
            setStatus('expired');
            setLinkData(error.data);
          } else if (error.code === 'INVALID') {
            setStatus('invalid');
          } else {
            setStatus('error');
          }
          return;
        }

        const data = await res.json();
        setLinkData(data);

        // Redirect to hotel selection with prefilled data
        const params = new URLSearchParams({
          destination: data.destination,
          hotelId: data.hotelId,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          adults: data.guests.adults.toString(),
          children: data.guests.children.toString(),
          rooms: data.guests.rooms.toString(),
          fromLink: linkId,
        });

        router.push(`/hotels?${params.toString()}`);
      })
      .catch(() => {
        setStatus('error');
      });
  }, [params.linkId, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-16 h-16 border-4 border-mmt-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading your itinerary...</p>
        </motion.div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
        <motion.div
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-10 h-10 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1>
          <p className="text-gray-600 mb-6">
            This itinerary link has expired. The creator can generate a new one for you.
          </p>
          {linkData && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-700">
                <strong>Destination:</strong> {linkData.destination}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Hotel:</strong> {linkData.hotelName}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Dates:</strong> {linkData.checkIn} to {linkData.checkOut}
              </p>
            </div>
          )}
          <button
            onClick={() => router.push('/')}
            className="w-full bg-mmt-blue text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition"
          >
            Go to Homepage
          </button>
        </motion.div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 p-4">
        <motion.div
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600 mb-6">
            This link is not valid or has been removed. Please check the link and try again.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-mmt-blue text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition"
          >
            Go to Homepage
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <motion.div
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something Went Wrong</h1>
        <p className="text-gray-600 mb-6">
          We couldn't load this itinerary. Please try again later.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-mmt-blue text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition mb-3"
        >
          Try Again
        </button>
        <button
          onClick={() => router.push('/')}
          className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-full font-semibold hover:bg-gray-300 transition"
        >
          Go to Homepage
        </button>
      </motion.div>
    </div>
  );
}
