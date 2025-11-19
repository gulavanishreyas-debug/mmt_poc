'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, UserMinus, Users, Sparkles, Clock } from 'lucide-react';
import { useTripStore } from '@/lib/store';
import { triggerConfetti } from '@/lib/confetti';
import { removeMember as removeMemberAPI } from '@/lib/api';

export default function TripHubModal() {
  const {
    toggleTripHub,
    members,
    requiredMembers,
    isDiscountUnlocked,
    tripName,
    destination,
    removeMember,
    startPoll,
    currentUserId,
    tripId,
  } = useTripStore();

  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const isAdmin = members.find(m => m.id === currentUserId)?.isAdmin;
  const remaining = Math.max(0, requiredMembers - members.length);

  const handleStartPoll = () => {
    triggerConfetti();
    startPoll();
    toggleTripHub();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!tripId || !currentUserId || removingMemberId) return;

    setRemovingMemberId(memberId);

    try {
      await removeMemberAPI({
        tripId,
        memberId,
        adminId: currentUserId,
      });

      // Local state will be updated via real-time sync
      console.log('✅ Member removed successfully');
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member. Please try again.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={toggleTripHub}
    >
      <motion.div
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-mmt-blue to-mmt-purple p-6 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">{tripName}</h2>
              <p className="text-blue-100">📍 {destination}</p>
            </div>
            <button
              onClick={toggleTripHub}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Status Banner */}
          <motion.div
            className={`rounded-xl p-4 ${
              isDiscountUnlocked
                ? 'bg-green-400/20 border-2 border-green-300'
                : 'bg-white/20 border-2 border-white/30'
            }`}
            animate={isDiscountUnlocked ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">
                {isDiscountUnlocked ? '🎉' : '⏳'}
              </div>
              <div className="flex-1">
                {isDiscountUnlocked ? (
                  <p className="font-semibold">
                    All set! The group discount is unlocked! 🎉
                  </p>
                ) : (
                  <p className="font-semibold">
                    Hey there, we're waiting on <span className="font-bold">{remaining} more friends</span> to join before the discount unlocks! 💸
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
          {/* Member Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">
                Member Progress
              </span>
              <span className="text-sm font-bold text-mmt-blue">
                {members.length}/{requiredMembers}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-mmt-blue to-mmt-purple rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(members.length / requiredMembers) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Members List */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-mmt-blue" />
              Trip Members ({members.length})
            </h3>
            <div className="space-y-2">
              {members.map((member, index) => (
                <motion.div
                  key={member.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-mmt-blue to-mmt-purple rounded-full flex items-center justify-center text-white text-xl">
                    {member.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {member.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                  {member.isAdmin && (
                    <span className="badge badge-info text-xs">
                      Admin
                    </span>
                  )}
                  {isAdmin && !member.isAdmin && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingMemberId === member.id}
                      className={`p-2 rounded-lg transition-colors ${
                        removingMemberId === member.id
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-red-500 hover:bg-red-50'
                      }`}
                      title="Remove member"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          {isAdmin && (
            <div className="space-y-3">
              <motion.button
                onClick={handleStartPoll}
                disabled={!isDiscountUnlocked}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                  isDiscountUnlocked
                    ? 'bg-gradient-to-r from-mmt-blue to-mmt-purple text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                whileHover={isDiscountUnlocked ? { scale: 1.02 } : {}}
                whileTap={isDiscountUnlocked ? { scale: 0.98 } : {}}
              >
                <Sparkles className="w-5 h-5" />
                Start Poll
              </motion.button>

              {!isDiscountUnlocked && (
                <p className="text-sm text-center text-gray-500">
                  💡 Reach {requiredMembers} members to start polling
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
