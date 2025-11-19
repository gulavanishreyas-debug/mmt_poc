'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Star, MapPin, Wifi, Coffee, Dumbbell, Waves, MessageSquare, X } from 'lucide-react';
import { useTripStore, Hotel, HotelVote } from '@/lib/store';
import { triggerConfetti } from '@/lib/confetti';

export default function HotelVoting() {
  const {
    shortlistedHotels,
    addHotel,
    voteHotel,
    selectHotel,
    currentUserId,
    members,
    consensusBudget,
    consensusAmenities,
  } = useTripStore();

  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    // Mock hotel data - Admin would have shortlisted these
    if (shortlistedHotels.length === 0) {
      const mockHotels: Hotel[] = [
        {
          id: 'hotel1',
          name: 'Taj Exotica Resort & Spa',
          image: '🏨',
          location: 'Calangute',
          price: 8500,
          rating: 4.8,
          amenities: ['pool', 'spa', 'beach', 'restaurant', 'wifi'],
          highlights: ['Near beach', 'Luxury spa', 'Pool views'],
          votes: {},
        },
        {
          id: 'hotel2',
          name: 'The Leela Goa',
          image: '🏖️',
          location: 'Bambolim Beach',
          price: 7200,
          rating: 4.6,
          amenities: ['pool', 'beach', 'gym', 'restaurant', 'wifi'],
          highlights: ['Private beach', 'Breakfast included', 'Peaceful retreat'],
          votes: {},
        },
        {
          id: 'hotel3',
          name: 'Alila Diwa Goa',
          image: '🌴',
          location: 'Majorda Beach',
          price: 9100,
          rating: 4.7,
          amenities: ['pool', 'spa', 'gym', 'restaurant', 'wifi'],
          highlights: ['Beachfront property', 'Award-winning spa', 'Fine dining'],
          votes: {},
        },
        {
          id: 'hotel4',
          name: 'Grand Hyatt Goa',
          image: '🏝️',
          location: 'Bambolim',
          price: 8800,
          rating: 4.5,
          amenities: ['pool', 'beach', 'spa', 'gym', 'wifi'],
          highlights: ['Multiple pools', 'Direct beach access', 'Kids club'],
          votes: {},
        },
        {
          id: 'hotel5',
          name: 'Park Hyatt Goa Resort',
          image: '🌊',
          location: 'Arossim Beach',
          price: 7800,
          rating: 4.9,
          amenities: ['pool', 'beach', 'spa', 'restaurant', 'wifi'],
          highlights: ['Serene beachfront', 'Portuguese architecture', 'World-class dining'],
          votes: {},
        },
      ];

      mockHotels.forEach(hotel => addHotel(hotel));
    }
  }, []);

  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedHotelForComment, setSelectedHotelForComment] = useState<{ id: string; vote: 'love' | 'dislike' } | null>(null);
  const [commentText, setCommentText] = useState('');

  const handleVoteClick = (hotelId: string, vote: 'love' | 'dislike') => {
    setSelectedHotelForComment({ id: hotelId, vote });
    setCommentModalOpen(true);
  };

  const handleSubmitVote = async () => {
    if (!selectedHotelForComment || !currentUserId) return;
    
    try {
      const { tripId } = useTripStore.getState();
      
      // Send vote to API
      const response = await fetch('/api/social-cart/hotels/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          hotelId: selectedHotelForComment.id,
          vote: selectedHotelForComment.vote,
          comment: commentText || undefined,
          userId: currentUserId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit vote');
      }

      console.log('✅ [HotelVoting] Vote submitted successfully');
      
      setCommentModalOpen(false);
      setSelectedHotelForComment(null);
      setCommentText('');
    } catch (error) {
      console.error('❌ [HotelVoting] Failed to submit vote:', error);
      alert('Failed to submit vote. Please try again.');
    }
  };

  const getVoteCount = (hotel: Hotel, voteType: 'love' | 'dislike') => {
    return Object.values(hotel.votes).filter((v: HotelVote) => v.vote === voteType).length;
  };

  const getMatchPercentage = (hotel: Hotel) => {
    let matches = 0;
    let total = 0;

    // Check budget match
    if (consensusBudget) {
      total++;
      const budgetRange = consensusBudget.split('-').map(b => parseInt(b.replace(/\D/g, '')));
      if (hotel.price >= budgetRange[0] * 1000 && hotel.price <= (budgetRange[1] || 100) * 1000) {
        matches++;
      }
    }

    // Check amenities match
    consensusAmenities.forEach(amenity => {
      total++;
      if (hotel.amenities.includes(amenity)) {
        matches++;
      }
    });

    return total > 0 ? Math.round((matches / total) * 100) : 0;
  };

  const handleProceedToBook = () => {
    // Find hotel with most love votes
    const topHotel = shortlistedHotels.reduce((prev, current) => {
      const prevLoves = getVoteCount(prev, 'love');
      const currentLoves = getVoteCount(current, 'love');
      return currentLoves > prevLoves ? current : prev;
    });

    triggerConfetti();
    selectHotel(topHotel.id);
  };

  const isAdmin = members.find(m => m.id === currentUserId)?.isAdmin;
  const currentUserVoted = shortlistedHotels.some(h => currentUserId && h.votes[currentUserId]);
  
  const getUserVote = (hotel: Hotel): HotelVote | undefined => {
    return currentUserId ? hotel.votes[currentUserId] : undefined;
  };

  const amenityIcons: { [key: string]: any } = {
    pool: Waves,
    spa: '💆',
    beach: '🏖️',
    gym: Dumbbell,
    restaurant: Coffee,
    wifi: Wifi,
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Vote for Your Favorite Hotel 🏨
          </h1>
          <p className="text-lg text-gray-600">
            React with 👍 or 👎 to help the group decide
          </p>
        </motion.div>

        {/* Consensus Summary */}
        <motion.div
          className="card mb-8 bg-gradient-to-r from-blue-50 to-purple-50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🎯</span>
            <h2 className="text-xl font-bold text-gray-900">Group Preferences</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {consensusBudget && (
              <span className="badge badge-info">
                💰 Budget: ₹{consensusBudget}
              </span>
            )}
            {consensusAmenities.map(amenity => (
              <span key={amenity} className="badge badge-success">
                {typeof amenityIcons[amenity] === 'string' ? amenityIcons[amenity] : '✓'} {amenity}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Hotels Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {shortlistedHotels.map((hotel, index) => {
            const loveCount = getVoteCount(hotel, 'love');
            const dislikeCount = getVoteCount(hotel, 'dislike');
            const matchPercentage = getMatchPercentage(hotel);
            const userVote = getUserVote(hotel);

            return (
              <motion.div
                key={hotel.id}
                className="card relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Match Badge */}
                {matchPercentage >= 70 && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold z-10">
                    {matchPercentage}% Match
                  </div>
                )}

                {/* Hotel Image */}
                <div className="w-full h-40 bg-gradient-to-br from-blue-400 to-purple-400 rounded-xl flex items-center justify-center text-6xl mb-4">
                  {hotel.image}
                </div>

                {/* Hotel Info */}
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {hotel.name}
                </h3>

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-gray-900">{hotel.rating}</span>
                  </div>
                  <span className="text-gray-400">•</span>
                  <span className="text-lg font-bold text-mmt-blue">
                    ₹{hotel.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-600">/night</span>
                </div>

                {/* Amenities */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {hotel.amenities.slice(0, 4).map(amenity => (
                    <span key={amenity} className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700">
                      {amenity}
                    </span>
                  ))}
                  {hotel.amenities.length > 4 && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700">
                      +{hotel.amenities.length - 4} more
                    </span>
                  )}
                </div>

                {/* Voting Buttons */}
                <div className="flex gap-3 mb-3">
                  <motion.button
                    onClick={() => handleVoteClick(hotel.id, 'love')}
                    className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                      userVote?.vote === 'love'
                        ? 'bg-green-500 text-white'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ThumbsUp className="w-5 h-5" />
                    <span>{loveCount}</span>
                  </motion.button>

                  <motion.button
                    onClick={() => handleVoteClick(hotel.id, 'dislike')}
                    className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                      userVote?.vote === 'dislike'
                        ? 'bg-red-500 text-white'
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ThumbsDown className="w-5 h-5" />
                    <span>{dislikeCount}</span>
                  </motion.button>
                </div>
                
                {/* User's Comment */}
                {userVote?.comment && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-blue-900 mb-1">Your comment:</p>
                        <p className="text-sm text-gray-700">{userVote.comment}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Vote Status */}
                {loveCount > 0 && (
                  <div className="text-sm text-center">
                    <span className="text-green-600 font-semibold">
                      🔥 {loveCount} {loveCount === 1 ? 'friend' : 'friends'} loved this!
                    </span>
                  </div>
                )}

                {/* Match Info */}
                {matchPercentage >= 70 && (
                  <div className="mt-3 p-2 bg-green-50 rounded-lg text-xs text-center text-green-700">
                    Matches {matchPercentage}% of your group's preferences
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Admin Actions */}
        {isAdmin && currentUserVoted && (
          <motion.div
            className="card bg-gradient-to-r from-mmt-blue to-mmt-purple text-white text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="text-xl font-bold mb-2">Ready to proceed?</h3>
            <p className="mb-4">The group has voted! Time to book the winning hotel.</p>
            <motion.button
              onClick={handleProceedToBook}
              className="bg-white text-mmt-blue px-8 py-3 rounded-full font-bold"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Proceed to Book →
            </motion.button>
          </motion.div>
        )}

        {/* Timer Warning */}
        <motion.div
          className="mt-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-orange-700 font-semibold">
            ⏰ Vote within the next 24 hours to keep the group discount active!
          </p>
        </motion.div>
      </div>
      
      {/* Comment Modal */}
      <AnimatePresence>
        {commentModalOpen && selectedHotelForComment && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCommentModalOpen(false)}
            />
            
            {/* Modal */}
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedHotelForComment.vote === 'love' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {selectedHotelForComment.vote === 'love' ? (
                        <ThumbsUp className="w-6 h-6 text-green-600" />
                      ) : (
                        <ThumbsDown className="w-6 h-6 text-red-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {selectedHotelForComment.vote === 'love' ? 'Love this hotel!' : 'Not a fan?'}
                      </h3>
                      <p className="text-sm text-gray-600">Tell your friends why</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCommentModalOpen(false)}
                    className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                
                {/* Comment Input */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Add a comment (optional)
                  </label>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={selectedHotelForComment.vote === 'love' 
                      ? "E.g., 'Close to the beach and within our budget!'" 
                      : "E.g., 'Too expensive for what it offers'"}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#0071c2] focus:outline-none resize-none"
                    rows={4}
                    maxLength={200}
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {commentText.length}/200 characters
                  </p>
                </div>
                
                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setCommentModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitVote}
                    className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-all ${
                      selectedHotelForComment.vote === 'love'
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    Submit Vote
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
