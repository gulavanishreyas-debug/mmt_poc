'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Share2, MessageCircle, Mail, Link as LinkIcon } from 'lucide-react';
import { useTripStore } from '@/lib/store';
import { generateShareLink } from '@/lib/utils';

export default function InvitationScreen() {
  const { tripId, tripName, destination, members, requiredMembers, isDiscountUnlocked, setStep } = useTripStore();
  const [copied, setCopied] = useState(false);
  const [linkExpiresAt, setLinkExpiresAt] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  const shareLink = tripId ? generateShareLink(tripId) : '';
  const remaining = Math.max(0, requiredMembers - members.length);

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback: Create a temporary input element
      const input = document.createElement('input');
      input.value = shareLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    const message = `Hey! Join me for ${tripName} to ${destination}! 🎉\n\nClick here to join: ${shareLink}\n\nWe need ${remaining} more friends to unlock group discounts! 💸`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleContinue = () => {
    // If all members joined, go to polling, otherwise go to hub
    if (isDiscountUnlocked) {
      setStep('poll');
    } else {
      setStep('hub');
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 flex items-center justify-center">
      <motion.div
        className="max-w-2xl w-full"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {/* Success Animation */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="inline-block text-8xl mb-4"
            animate={{ rotate: [0, 10, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
          >
            🎉
          </motion.div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Trip Created Successfully!
          </h1>
          <p className="text-xl text-gray-600">
            {tripName} to {destination}
          </p>
        </motion.div>

        {/* Countdown Timer */}
        {linkExpiresAt && timeRemaining && timeRemaining !== 'Expired' && (
          <motion.div
            className="card mb-6 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-orange-700">⏱️ Link Expires In:</h3>
                <p className="text-sm text-orange-600">Share the link before time runs out!</p>
              </div>
              <div className="text-4xl font-bold text-red-600">{timeRemaining}</div>
            </div>
          </motion.div>
        )}

        {/* Status Card */}
        <motion.div
          className="card mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-center">
            {!isDiscountUnlocked ? (
              <>
                <div className="text-5xl mb-4">⏳</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Almost There!
                </h2>
                <p className="text-lg text-gray-600 mb-4">
                  Hey there, we're waiting on <span className="font-bold text-mmt-blue">{remaining} more friends</span> to join before the discount unlocks! 💸
                </p>
                <div className="bg-gray-100 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">Progress</span>
                    <span className="text-sm font-bold text-mmt-blue">
                      {members.length}/{requiredMembers}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-mmt-blue to-mmt-purple rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(members.length / requiredMembers) * 100}%` }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-5xl mb-4">🎊</div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">
                  All Set! The group discount is unlocked! 🎉
                </h2>
                <p className="text-lg text-gray-600">
                  You've reached {requiredMembers} members!
                </p>
              </>
            )}
          </div>
        </motion.div>

        {/* Share Link Card */}
        <motion.div
          className="card mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-mmt-blue" />
            Share Your Trip Link
          </h3>
          
          <div className="flex gap-2 mb-4">
            <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700 truncate">{shareLink}</span>
            </div>
            <motion.button
              onClick={handleCopy}
              className="px-6 py-3 bg-mmt-blue text-white rounded-lg font-semibold flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy
                </>
              )}
            </motion.button>
          </div>

          {/* Share Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MessageCircle className="w-5 h-5" />
              Share via WhatsApp
            </motion.button>
            
            <motion.button
              className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-800 text-white py-3 rounded-lg font-semibold transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Mail className="w-5 h-5" />
              Share via Email
            </motion.button>
          </div>
        </motion.div>

        {/* Current Members */}
        <motion.div
          className="card mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Current Members ({members.length})
          </h3>
          <div className="space-y-2">
            {members.map((member, index) => (
              <motion.div
                key={member.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-mmt-blue to-mmt-purple rounded-full flex items-center justify-center text-white font-bold">
                  {member.avatar}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{member.name}</div>
                  {member.isAdmin && (
                    <span className="text-xs bg-mmt-blue text-white px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Continue Button */}
        <motion.button
          onClick={handleContinue}
          className="w-full btn-primary text-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Continue to Trip Hub →
        </motion.button>
      </motion.div>
    </div>
  );
}
