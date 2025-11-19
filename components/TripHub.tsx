'use client';

import { motion } from 'framer-motion';
import { useTripStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import { Users, Clock } from 'lucide-react';

export default function TripHub() {
  const { tripId, tripName, members, requiredMembers, isDiscountUnlocked } = useTripStore();
  const [linkExpiresAt, setLinkExpiresAt] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  // Load link expiration time
  useEffect(() => {
    const loadTripMetadata = async () => {
      if (!tripId) return;
      try {
        const response = await fetch(`/api/social-cart/join?tripId=${tripId}`);
        if (response.ok) {
          const data = await response.json();
          setLinkExpiresAt(data.trip.linkExpiresAt || null);
        }
      } catch (error) {
        console.error('Failed to load trip metadata:', error);
      }
    };
    loadTripMetadata();
  }, [tripId]);

  // Countdown timer
  useEffect(() => {
    if (!linkExpiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(linkExpiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [linkExpiresAt]);

  useEffect(() => {
    console.log('🏠 [TripHub] Component mounted');
    console.log('🏠 [TripHub] State:', {
      tripName,
      members: members.length,
      requiredMembers,
      isDiscountUnlocked,
    });
  }, []);

  useEffect(() => {
    console.log('🏠 [TripHub] State updated:', {
      members: members.length,
      requiredMembers,
      isDiscountUnlocked,
    });
  }, [members, requiredMembers, isDiscountUnlocked]);

  const remaining = Math.max(0, requiredMembers - members.length);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
      >
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-mmt-blue to-mmt-purple rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{tripName || 'Trip Planning'}</h1>
          
          {isDiscountUnlocked ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <p className="font-semibold">All members joined!</p>
              </div>
              <p className="text-gray-600">Redirecting to polling...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Countdown Timer */}
              {linkExpiresAt && timeRemaining && timeRemaining !== 'Expired' && (
                <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-orange-700">⏱️ Link Expires In:</span>
                    <span className="text-xl font-bold text-red-600">{timeRemaining}</span>
                  </div>
                  <p className="text-xs text-orange-600 mt-1">Share the link before time runs out!</p>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-orange-600">
                <Clock className="w-5 h-5" />
                <p className="font-semibold">Waiting for members</p>
              </div>
              
              <div className="bg-gray-100 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-2">
                  {members.length} of {requiredMembers} members joined
                </p>
                <div className="w-full bg-gray-300 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-mmt-blue to-mmt-purple h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(members.length / requiredMembers) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {remaining} more {remaining === 1 ? 'member' : 'members'} needed
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Members:</p>
                <div className="space-y-1">
                  {members.map((member, index) => (
                    <div key={member.id} className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{member.name}</span>
                      {member.isAdmin && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Admin</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
