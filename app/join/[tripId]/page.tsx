'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { Check, MapPin, Users, Calendar } from 'lucide-react';
import { useTripStore } from '@/lib/store';
import { joinTrip, getTripDetails } from '@/lib/api';
import { getTripFromLocalStorage } from '@/lib/localStorage';

export default function JoinTripPage() {
  const params = useParams();
  const router = useRouter();
  const { setStep } = useTripStore();
  
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [joined, setJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [tripData, setTripData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const tripId = params.tripId as string;

  // Fetch trip details on mount
  useEffect(() => {
    const fetchTrip = async () => {
      console.log('🔍 [JoinPage] Fetching trip:', tripId);
      
      try {
        const response = await getTripDetails(tripId);
        console.log('✅ [JoinPage] Trip fetched from API:', response.trip);
        setTripData(response.trip);
        
        // Update local store with trip data
        useTripStore.setState({
          tripId: response.trip.tripId,
          tripName: response.trip.tripName,
          destination: response.trip.destination,
          purpose: response.trip.purpose,
          requiredMembers: response.trip.requiredMembers,
          members: response.trip.members,
        });
      } catch (error) {
        console.error('❌ [JoinPage] Failed to fetch trip from API:', error);
        
        // Fallback 1: Check if trip exists in local store (same session)
        const localTrip = useTripStore.getState();
        console.log('🔍 [JoinPage] Checking Zustand store. Current tripId:', localTrip.tripId);
        
        if (localTrip.tripId === tripId) {
          console.log('✅ [JoinPage] Trip found in Zustand store');
          setTripData({
            tripId: localTrip.tripId,
            tripName: localTrip.tripName,
            destination: localTrip.destination,
            purpose: localTrip.purpose,
            requiredMembers: localTrip.requiredMembers,
            members: localTrip.members,
          });
        } else {
          // Fallback 2: Check localStorage (cross-tab/same browser)
          console.log('🔍 [JoinPage] Checking localStorage for trip:', tripId);
          const storedTrip = getTripFromLocalStorage(tripId);
          
          if (storedTrip) {
            console.log('✅ [JoinPage] Trip found in localStorage:', storedTrip);
            setTripData(storedTrip);
            
            // Update store with localStorage data
            useTripStore.setState({
              tripId: storedTrip.tripId,
              tripName: storedTrip.tripName,
              destination: storedTrip.destination,
              purpose: storedTrip.purpose as any,
              requiredMembers: storedTrip.requiredMembers,
              members: storedTrip.members,
            });
          } else {
            console.error('❌ [JoinPage] Trip not found in any storage');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    if (tripId) {
      fetchTrip();
    }
  }, [tripId]);

  const handleJoin = async () => {
    if (!name || isJoining) return;

    // Skip OTP for POC - just join directly
    setIsJoining(true);

    try {
      // Call API to join trip (mobile optional, no OTP)
      const response = await joinTrip({
        invitation_token: tripId,
        guest_name: name,
        guest_mobile: mobile || undefined,
      });

      console.log('✅ [JoinPage] Successfully joined trip:', response);
      console.log('✅ [JoinPage] Member info:', response.member);
      console.log('✅ [JoinPage] Trip data:', response.trip);
      console.log('✅ [JoinPage] Discount unlocked:', response.isDiscountUnlocked);
      
      setJoined(true);

      // Update store with trip data and member info
      const storeUpdate = {
        tripId: tripId,
        tripName: response.trip?.tripName || tripData?.tripName || '',
        destination: response.trip?.destination || tripData?.destination || '',
        purpose: (response.trip?.purpose || tripData?.purpose) as any,
        requiredMembers: response.trip?.requiredMembers || tripData?.requiredMembers || 5,
        members: response.trip?.members || [],
        currentUserId: response.member?.id || '',
        isDiscountUnlocked: response.isDiscountUnlocked || false,
      };
      
      console.log('✅ [JoinPage] Updating store with:', storeUpdate);
      useTripStore.setState(storeUpdate);

      // Redirect to main app after 2 seconds
      setTimeout(() => {
        console.log('🔄 [JoinPage] Redirecting to main app...');
        router.push('/');
        
        // If all members joined, go to polling, otherwise hub
        if (response.isDiscountUnlocked) {
          console.log('🎉 [JoinPage] All members joined! Going to polling screen');
          setStep('poll');
        } else {
          console.log('⏳ [JoinPage] Waiting for more members. Going to hub');
          setStep('hub');
        }
      }, 2000);
    } catch (error: any) {
      console.error('Failed to join trip:', error);
      alert(error.message || 'Failed to join trip. Please try again.');
      setIsJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading trip details...</p>
        </div>
      </div>
    );
  }

  // Show error if trip not found
  if (!loading && !tripData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-red-50 to-orange-50">
        <motion.div
          className="max-w-md w-full text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-8xl mb-6">😕</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Trip Not Found
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            This trip link may be invalid or expired. Please ask the trip organizer for a new invitation link.
          </p>
          <motion.button
            onClick={() => router.push('/')}
            className="btn-primary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Go to Homepage
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-green-50 to-blue-50">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="text-8xl mb-6"
            animate={{ rotate: [0, 10, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
          >
            🎉
          </motion.div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to the Trip!
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            You've successfully joined {tripData?.tripName}
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-mmt-blue rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-mmt-blue rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 bg-mmt-blue rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <motion.div
        className="max-w-md w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            className="text-6xl mb-4"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🎊
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            You're Invited!
          </h1>
          <p className="text-lg text-gray-600">
            Join the group trip to make it happen
          </p>
        </div>

        {/* Trip Info Card */}
        <motion.div
          className="card mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-center mb-4">
            <div className="text-4xl mb-3">
              {tripData?.purpose === 'wedding' ? '💍' : tripData?.purpose === 'concert' ? '🎵' : '🏖️'}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {tripData?.tripName || 'Group Trip'}
            </h2>
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{tripData?.destination || 'Amazing Destination'}</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Current Members</span>
              <span className="font-bold text-mmt-blue">{tripData?.members?.length || 0}</span>
            </div>
            <p className="text-sm text-gray-600">
              More members = Bigger group discounts! 💰
            </p>
          </div>
        </motion.div>

        {/* Join Form */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Join the Adventure
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-mmt-blue focus:outline-none"
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number (Optional)
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-mmt-blue focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                No OTP needed - just for record keeping! 🎉
              </p>
            </div>
          </div>

          <motion.button
            onClick={handleJoin}
            disabled={!name || isJoining}
            className={`w-full mt-6 py-4 rounded-xl font-bold text-lg transition-all ${
              name && !isJoining
                ? 'bg-gradient-to-r from-mmt-blue to-mmt-purple text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            whileHover={name && !isJoining ? { scale: 1.02 } : {}}
            whileTap={name && !isJoining ? { scale: 0.98 } : {}}
          >
            <span className="flex items-center justify-center gap-2">
              {!isJoining && <Check className="w-5 h-5" />}
              {isJoining ? 'Joining...' : '✅ Count Me In'}
            </span>
          </motion.button>
        </motion.div>

        {/* Benefits */}
        <motion.div
          className="mt-6 grid grid-cols-3 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-center">
            <div className="text-3xl mb-2">💰</div>
            <p className="text-xs text-gray-600">Group Discounts</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🗳️</div>
            <p className="text-xs text-gray-600">Vote Together</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-xs text-gray-600">Fun Experience</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
