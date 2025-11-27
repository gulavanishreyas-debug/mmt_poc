'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTripStore } from '@/lib/store';
import { useRealTimeSync } from '@/lib/hooks/useRealTimeSync';
import Homepage from '@/components/Homepage';
import TripCreation from '@/components/TripCreation';
import InvitationScreen from '@/components/InvitationScreen';
import TripHub from '@/components/TripHub';
import GroupChatPolling from '@/components/GroupChatPolling';
import HotelFlow from '@/components/HotelFlow';
import RoomSelection from '@/components/RoomSelection';
import GuestPaymentScreen from '@/components/GuestPaymentScreen';
import MyBookings from '@/components/MyBookings';
import BookingDetails from '@/components/BookingDetails';
import FloatingWidget from '@/components/FloatingWidget';

export default function Home() {
  const { currentStep, tripId, isDiscountUnlocked } = useTripStore();
  const searchParams = useSearchParams();
  
  // Enable real-time synchronization
  const { isConnected } = useRealTimeSync(tripId);

  // Handle URL parameters for shared links
  useEffect(() => {
    const step = searchParams.get('step');
    const hotelId = searchParams.get('hotelId');
    
    if (step === 'hotels' && hotelId) {
      useTripStore.setState({ currentStep: 'hotels' });
    } else if (step === 'room-selection' && hotelId) {
      useTripStore.setState({ currentStep: 'room-selection' });
    }
  }, [searchParams]);

  useEffect(() => {
    if (isConnected && tripId) {
      console.log('🔄 [MainPage] Real-time sync active for trip:', tripId);
    }
  }, [isConnected, tripId]);

  // Watch for discount unlock and redirect to polling
  useEffect(() => {
    if (isDiscountUnlocked && currentStep === 'hub') {
      console.log('🎉 [MainPage] Discount unlocked! Redirecting from hub to poll');
      useTripStore.setState({ currentStep: 'poll' });
    }
  }, [isDiscountUnlocked, currentStep]);

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
    {currentStep === 'room-selection' && <RoomSelection />}
    {currentStep === 'guest-payment' && <GuestPaymentScreen />}
    {currentStep === 'mybookings' && <MyBookings />}
    {currentStep === 'booking-details' && <BookingDetails />}
    </main>
  );
}
