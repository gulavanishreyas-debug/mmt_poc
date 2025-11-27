'use client';

import { useState, useEffect } from 'react';
import { useTripStore, Hotel } from '@/lib/store';
import HotelSelection from './HotelSelection';
import HotelVoting from './HotelVoting';
import { motion } from 'framer-motion';
import Header from './Header';

export default function HotelFlow() {
  const { tripId, members, currentUserId, destination, shortlistedHotels, addHotel, setStep, hotelVotingStatus } = useTripStore();
  const [hasSharedShortlist, setHasSharedShortlist] = useState(false);
  const [prefillParams, setPrefillParams] = useState<{
    destination?: string;
    hotelId?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    children?: string;
    rooms?: string;
    fromLink?: string;
  }>({});
  const [showPrefillBanner, setShowPrefillBanner] = useState(false);

  const currentUser = members.find(m => m.id === currentUserId);
  const isAdmin = currentUser?.isAdmin || false;

  // Check for URL prefill parameters on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const prefill = {
        destination: params.get('destination') || undefined,
        hotelId: params.get('hotelId') || undefined,
        checkIn: params.get('checkIn') || undefined,
        checkOut: params.get('checkOut') || undefined,
        adults: params.get('adults') || undefined,
        children: params.get('children') || undefined,
        rooms: params.get('rooms') || undefined,
        fromLink: params.get('fromLink') || undefined,
      };

      // Only show banner if we have prefill data
      if (prefill.destination || prefill.hotelId) {
        setPrefillParams(prefill);
        setShowPrefillBanner(true);
        console.log('🔗 [HotelFlow] Detected prefill parameters:', prefill);
        
        // If viewing from shared link (no tripId), treat as standalone browsing
        if (!tripId && prefill.fromLink) {
          console.log('🔗 [HotelFlow] Shared link mode - enabling standalone browsing');
        }
      }
    }
  }, [tripId]);

  const handleResetHotelSelection = () => {
    if (hotelVotingStatus === 'closed') {
      alert('Hotel voting is already closed. Please continue with booking.');
      return;
    }
    if (!confirm('Are you sure you want to reset hotel selection? This will clear the current shortlist.')) return;
    
    // Reset hotel-related state
    useTripStore.setState({ 
      shortlistedHotels: [],
      hotelVotingStatus: null,
      hotelVotingExpiresAt: null,
    });
    setHasSharedShortlist(false);
    
    console.log('🔄 [HotelFlow] Hotel selection reset by admin');
  };

  const handleLeaveHotelStep = () => {
    if (!confirm('Are you sure you want to go back? Your votes will be saved.')) return;
    
    // Go back to polling step
    setStep('poll');
    
    console.log('👋 [HotelFlow] User left hotel step');
  };

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

  // Shared link mode - Show hotels in browsing mode (no trip needed)
  const isSharedLinkMode = Boolean(!tripId && prefillParams.fromLink && prefillParams.destination);

  // Admin sees hotel selection first, OR shared link mode
  if ((isAdmin && shortlistedHotels.length === 0 && !hasSharedShortlist) || isSharedLinkMode) {
    return (
      <>
        {showPrefillBanner && prefillParams.destination && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-100 border-l-4 border-blue-500 p-4 mb-4"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔗</span>
              <div>
                <p className="font-semibold text-blue-900">
                  {isSharedLinkMode ? 'Viewing shared itinerary' : 'Prefilled from shared link'}
                </p>
                <p className="text-sm text-blue-700">
                  Showing hotels for {prefillParams.destination}
                  {prefillParams.checkIn && ` • ${new Date(prefillParams.checkIn).toLocaleDateString()} to ${new Date(prefillParams.checkOut!).toLocaleDateString()}`}
                </p>
              </div>
              <button
                onClick={() => setShowPrefillBanner(false)}
                className="ml-auto text-blue-500 hover:text-blue-700 font-bold"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
        <HotelSelection 
          destination={prefillParams.destination || destination} 
          onShareShortlist={handleShareShortlist}
          prefillHotelId={prefillParams.hotelId}
          isSharedLinkMode={isSharedLinkMode}
        />
      </>
    );
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
  return (
    <>
      <Header />
      <div className="pt-16">
      <HotelVoting />
      
      {/* Admin: Review/Reset Hotel Selection Button */}
      {isAdmin && hotelVotingStatus !== 'closed' && (
        <div className="fixed top-20 right-6 z-50">
          <button
            onClick={handleResetHotelSelection}
            className="bg-white text-orange-600 border-2 border-orange-600 px-4 py-2 rounded-lg font-semibold shadow-lg hover:bg-orange-50 transition-all"
          >
            🔄 Review Hotel Selection
          </button>
        </div>
      )}
      
      {/* Non-Admin: Leave Hotel Step Button */}
      {!isAdmin && (
        <div className="fixed top-20 right-6 z-50">
          <button
            onClick={handleLeaveHotelStep}
            className="bg-white text-gray-700 border-2 border-gray-300 px-4 py-2 rounded-lg font-semibold shadow-lg hover:bg-gray-50 transition-all"
          >
            ← Back to Polls
          </button>
        </div>
      )}
    </div>
    </>
  );
}
