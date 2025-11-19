'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Users, X } from 'lucide-react';
import { useTripStore } from '@/lib/store';
import TripHubModal from './TripHubModal';

export default function FloatingWidget() {
  const { showTripHub, toggleTripHub, members, requiredMembers, isDiscountUnlocked } = useTripStore();
  
  const memberCount = members.length;
  const remaining = Math.max(0, requiredMembers - memberCount);

  return (
    <>
      <motion.button
        className="floating-widget"
        onClick={toggleTripHub}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Users className="w-5 h-5" />
        <span>Plan with Friends</span>
        
        {/* Member Count Badge */}
        <div className="relative">
          <motion.div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              isDiscountUnlocked ? 'bg-green-400' : 'bg-white text-mmt-blue'
            }`}
            animate={isDiscountUnlocked ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5 }}
          >
            {memberCount}
          </motion.div>
          
          {!isDiscountUnlocked && remaining > 0 && (
            <motion.div
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              +{remaining}
            </motion.div>
          )}
        </div>
      </motion.button>

      {/* Trip Hub Modal */}
      <AnimatePresence>
        {showTripHub && <TripHubModal />}
      </AnimatePresence>
    </>
  );
}
