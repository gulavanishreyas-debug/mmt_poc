'use client';

import { useState } from 'react';
import { useTripStore, Hotel } from '@/lib/store';
import HotelSelection from './HotelSelection';
import HotelVoting from './HotelVoting';
import { motion } from 'framer-motion';

export default function HotelFlow() {
  const { tripId, members, currentUserId, destination, shortlistedHotels, addHotel } = useTripStore();
  const [hasSharedShortlist, setHasSharedShortlist] = useState(false);

  const currentUser = members.find(m => m.id === currentUserId);
  const isAdmin = currentUser?.isAdmin || false;

  const handleShareShortlist = async (hotels: Hotel[]) => {
    try {
      console.log('🏨 [HotelFlow] Sharing shortlist:', hotels.length, 'hotels');
      
      // Send to API to broadcast via SSE
      const response = await fetch('/api/social-cart/hotels/shortlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          hotels,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to share shortlist');
      }

      // Add hotels to local store
      hotels.forEach(hotel => addHotel(hotel));
      setHasSharedShortlist(true);
      
      console.log('✅ [HotelFlow] Shortlist shared successfully');
    } catch (error) {
      console.error('❌ [HotelFlow] Failed to share shortlist:', error);
      alert('Failed to share shortlist. Please try again.');
    }
  };

  // Admin sees hotel selection first
  if (isAdmin && shortlistedHotels.length === 0 && !hasSharedShortlist) {
    return <HotelSelection destination={destination} onShareShortlist={handleShareShortlist} />;
  }

  // Non-admin waits for shortlist
  if (!isAdmin && shortlistedHotels.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-[#0071c2] to-purple-600 rounded-full flex items-center justify-center text-5xl animate-pulse">
            🏨
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Waiting for Admin...
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            The admin is shortlisting hotels for the group.
            <br />
            You'll be notified once the selection is ready!
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-[#0071c2] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-[#0071c2] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-[#0071c2] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Everyone sees voting once shortlist is shared
  return <HotelVoting />;
}
