'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Users, Heart, Music, Plane } from 'lucide-react';
import { useTripStore, TripPurpose } from '@/lib/store';
import { createTrip as createTripAPI } from '@/lib/api';
import { saveTripToLocalStorage } from '@/lib/localStorage';

const DESTINATIONS = [
  'Goa',
  'Bali',
  'Dubai',
  'Paris',
  'New York',
  'Maldives',
  'Singapore',
  'Istanbul',
  'Phuket',
  'Rome',
  'Lisbon',
  'Barcelona',
];

interface TripCreationProps {
  onClose?: () => void;
}

export default function TripCreation({ onClose }: TripCreationProps = {}) {
  const { setTripDetails, setStep, setCurrentUser } = useTripStore();
  
  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);
  const destinationWrapperRef = useRef<HTMLDivElement>(null);
  const [purpose, setPurpose] = useState<TripPurpose | null>(null);
  const [requiredMembers, setRequiredMembers] = useState(5);
  const [adminName, setAdminName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (destinationWrapperRef.current && !destinationWrapperRef.current.contains(event.target as Node)) {
        setIsDestinationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const purposes = [
    {
      id: 'wedding' as TripPurpose,
      icon: '💍',
      title: 'Wedding',
      description: 'Celebrate love with friends & family',
      color: 'from-pink-400 to-rose-400',
    },
    {
      id: 'concert' as TripPurpose,
      icon: '🎵',
      title: 'Concert/Event Trip',
      description: 'Experience live music together',
      color: 'from-purple-400 to-indigo-400',
    },
    {
      id: 'casual' as TripPurpose,
      icon: '🏖️',
      title: 'Casual Trip',
      description: 'Just friends having fun',
      color: 'from-blue-400 to-cyan-400',
    },
  ];

  const handleCreate = async () => {
    if (!tripName || !destination || !purpose || !adminName || isCreating) return;
    
    console.log('🚀 [TripCreation] Starting trip creation...');
    console.log('📝 [TripCreation] Data:', { tripName, destination, purpose, requiredMembers });
    
    setIsCreating(true);
    
    try {
      console.log('📡 [TripCreation] Calling API...');
      
      // Close panel if opened from floating button
      if (onClose) {
        onClose();
      }
      
      // Navigate to invitation screen
      setStep('invite');
      const response = await createTripAPI({
        tripName,
        destination,
        purpose,
        requiredMembers,
        adminName: adminName.trim(),
      });

      console.log('✅ [TripCreation] API Response:', response);
      console.log('✅ [TripCreation] Response structure check:', {
        hasSuccess: !!response.success,
        hasTripId: !!response.tripId,
        hasAdminId: !!response.adminId,
        hasTrip: !!response.trip,
        tripKeys: response.trip ? Object.keys(response.trip) : []
      });

      // Update local store with API response
      console.log('💾 [TripCreation] Updating Zustand store...');
      
      try {
        setTripDetails(tripName, destination, purpose, requiredMembers);
        useTripStore.setState({
          tripId: response.tripId,
          currentUserId: response.adminId,
          members: response.trip.members,
          currentStep: 'invite',
        });
        
        console.log('💾 [TripCreation] Store updated. Current state:', useTripStore.getState());
      } catch (storeError: any) {
        console.error('❌ [TripCreation] Error updating store:', storeError);
        throw storeError;
      }
      
      // Save to localStorage for cross-tab persistence
      console.log('💾 [TripCreation] Saving to localStorage...');
      
      try {
        const tripToSave = {
          tripId: response.tripId,
          tripName: response.trip.tripName,
          destination: response.trip.destination,
          purpose: response.trip.purpose,
          requiredMembers: response.trip.requiredMembers,
          members: response.trip.members,
          createdAt: new Date().toISOString(),
        };
        
        console.log('💾 [TripCreation] Trip object to save:', tripToSave);
        saveTripToLocalStorage(tripToSave);
        console.log('💾 [TripCreation] localStorage save completed');
      } catch (localStorageError: any) {
        console.error('❌ [TripCreation] Error saving to localStorage:', localStorageError);
        // Don't throw - localStorage is optional
      }
      
      console.log('✅ [TripCreation] Trip created successfully:', response.tripId);
    } catch (error: any) {
      console.error('❌ [TripCreation] Error creating trip:', error);
      console.error('❌ [TripCreation] Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
      });
      alert(`Failed to create trip: ${error.message || 'Unknown error'}`);
    } finally {
      setIsCreating(false);
      console.log('🏁 [TripCreation] Creation process finished');
    }
  };

  const isValid = tripName && destination && purpose && adminName && !isCreating;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => setStep('home')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Create Your Group Trip 🎉
          </h1>
          <p className="text-lg text-gray-600">
            Pick your vibe, we'll handle the details 🌈
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Purpose Selection */}
          <div className="card">
            <label className="block text-lg font-semibold text-gray-900 mb-4">
              What's the occasion? 🎊
            </label>
            <div className="grid md:grid-cols-3 gap-4">
              {purposes.map((p, index) => (
                <motion.button
                  key={p.id}
                  onClick={() => setPurpose(p.id)}
                  className={`relative p-6 rounded-xl border-2 transition-all ${
                    purpose === p.id
                      ? 'border-mmt-blue bg-blue-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="text-5xl mb-3">{p.icon}</div>
                  <h3 className="font-bold text-gray-900 mb-1">{p.title}</h3>
                  <p className="text-sm text-gray-600">{p.description}</p>
                  
                  {purpose === p.id && (
                    <motion.div
                      className="absolute top-3 right-3 w-6 h-6 bg-mmt-blue rounded-full flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <span className="text-white text-sm">✓</span>
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Trip Name */}
          <motion.div
            className="card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              Give your trip a fun name 🏷️
            </label>
            <input
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="e.g., Beach Buddies Getaway"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-mmt-blue focus:outline-none text-lg"
            />
          </motion.div>

          {/* Admin Name */}
          <motion.div
            className="card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              Your Name 👤
            </label>
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="e.g., John Doe"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-mmt-blue focus:outline-none text-lg"
            />
          </motion.div>

          {/* Destination */}
          <motion.div
            className="card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              Where are you headed? 📍
            </label>
            <div
              ref={destinationWrapperRef}
              className="relative"
            >
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={destinationSearch}
                onChange={(e) => {
                  setDestination('');
                  setDestinationSearch(e.target.value);
                  setIsDestinationOpen(true);
                }}
                onFocus={() => setIsDestinationOpen(true)}
                placeholder="Select or search a destination"
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-mmt-blue focus:outline-none text-lg"
              />
              {isDestinationOpen && (
                <div className="absolute left-0 right-0 z-10 mt-2 max-h-56 overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                  {DESTINATIONS.filter(dest => dest.toLowerCase().includes(destinationSearch.toLowerCase())).map((dest) => (
                    <button
                      key={dest}
                      type="button"
                      onClick={() => {
                        setDestination(dest);
                        setDestinationSearch(dest);
                        setIsDestinationOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left text-lg hover:bg-slate-50 focus:bg-slate-50"
                    >
                      {dest}
                    </button>
                  ))}
                  {!DESTINATIONS.filter(dest => dest.toLowerCase().includes(destinationSearch.toLowerCase())).length && (
                    <div className="px-4 py-3 text-sm text-gray-500">No destinations found.</div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Required Members */}
          <motion.div
            className="card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              How many friends to unlock discount? 👥
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="3"
                max="10"
                value={requiredMembers}
                onChange={(e) => setRequiredMembers(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #008CFF 0%, #008CFF ${((requiredMembers - 3) / 7) * 100}%, #e5e7eb ${((requiredMembers - 3) / 7) * 100}%, #e5e7eb 100%)`
                }}
              />
              <div className="w-16 h-16 bg-gradient-to-br from-mmt-blue to-mmt-purple rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{requiredMembers}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              💡 More members = Bigger discounts (up to 20% off!)
            </p>
          </motion.div>

          {/* Create Button */}
          <motion.button
            onClick={handleCreate}
            disabled={!isValid}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              isValid
                ? 'bg-gradient-to-r from-mmt-blue to-mmt-purple text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={isValid ? { scale: 1.02 } : {}}
            whileTap={isValid ? { scale: 0.98 } : {}}
          >
            {isCreating ? 'Creating Trip...' : 'Create Trip & Invite Friends 🚀'}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
