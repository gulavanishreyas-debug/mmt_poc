'use client';

import { useEffect } from 'react';
import { useTripStore } from '@/lib/store';
import { useRealTimeSync } from '@/lib/hooks/useRealTimeSync';
import Homepage from '@/components/Homepage';
import TripCreation from '@/components/TripCreation';
import InvitationScreen from '@/components/InvitationScreen';
import TripHub from '@/components/TripHub';
import GroupChatPolling from '@/components/GroupChatPolling';
import HotelFlow from '@/components/HotelFlow';
import BookingScreen from '@/components/BookingScreen';
import FloatingWidget from '@/components/FloatingWidget';

export default function Home() {
  const { currentStep, tripId, isDiscountUnlocked } = useTripStore();
  
  // Enable real-time synchronization
  const { isConnected } = useRealTimeSync(tripId);

  useEffect(() => {
    if (isConnected) {
      console.log('🔄 [MainPage] Real-time sync active for trip:', tripId);
    }
  }, [isConnected]);

  // Watch for discount unlock and redirect to polling
  useEffect(() => {
    console.log('🔍 [MainPage] State check:', {
      currentStep,
      isDiscountUnlocked,
      tripId,
    });
    
    if (isDiscountUnlocked && currentStep === 'hub') {
      console.log('🎉 [MainPage] Discount unlocked! Redirecting from hub to poll');
      useTripStore.setState({ currentStep: 'poll' });
    }
  }, [isDiscountUnlocked, currentStep, tripId]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Floating Widget - Shows after trip creation but not on poll screen */}
      {tripId && currentStep !== 'poll' && <FloatingWidget />}
      
      {/* Main Content - Renders based on current step */}
      {currentStep === 'home' && <Homepage />}
      {currentStep === 'create' && <TripCreation />}
      {currentStep === 'invite' && <InvitationScreen />}
      {currentStep === 'hub' && <TripHub />}
      {currentStep === 'poll' && <GroupChatPolling />}
      {currentStep === 'hotels' && <HotelFlow />}
      {currentStep === 'booking' && <BookingScreen />}
    </main>
  );
}
