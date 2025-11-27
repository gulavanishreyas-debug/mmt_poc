'use client';

import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, Star, Wifi, Coffee, Dumbbell, Waves, MessageSquare } from 'lucide-react';
import { useTripStore, Hotel, HotelVote } from '@/lib/store';
import { triggerConfetti } from '@/lib/confetti';

export default function HotelVoting() {
  const {
    shortlistedHotels,
    addHotel,
    currentUserId,
    members,
    consensusBudget,
    consensusAmenities,
    hotelVotingStatus,
    selectedHotel,
    setStep,
    tripId,
    hotelBookingStatus,
    bookingConfirmation,
  } = useTripStore();

  // Declare isAdmin here so it's available for all render logic
  const isAdmin = members.find(m => m.id === currentUserId)?.isAdmin;

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

  const canVote = hotelVotingStatus !== 'closed';

  const hotelConsensus = useMemo(() => {
    const entries = shortlistedHotels.map((hotel) => {
      const votes = Object.values(hotel.votes || {}).length;
      return { hotel, count: votes };
    });

    const totalVotes = entries.reduce((sum, entry) => sum + entry.count, 0);
    const withPercentages = entries
      .map((entry) => ({
        ...entry,
        percentage: totalVotes ? Math.round((entry.count / totalVotes) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const maxCount = withPercentages.length ? withPercentages[0].count : 0;
    const topHotels = maxCount > 0 ? withPercentages.filter((entry) => entry.count === maxCount).map((entry) => entry.hotel) : [];

    return { entries: withPercentages, totalVotes, topHotels };
  }, [shortlistedHotels]);

  useEffect(() => {
    console.log('📊 [HotelVoting] Consensus snapshot', {
      totalVotes: hotelConsensus.totalVotes,
      topHotels: hotelConsensus.topHotels.map((hotel) => hotel.name),
      isVotingOpen: canVote,
    });
  }, [hotelConsensus, canVote]);

  const getUserVote = (hotel?: Hotel): HotelVote | undefined => {
    if (!currentUserId || !hotel) return undefined;
    return hotel.votes[currentUserId];
  };

  const handleVoteClick = async (hotelId: string) => {
    if (!canVote || !currentUserId) {
      return;
    }

    const targetHotel = shortlistedHotels.find((hotel) => hotel.id === hotelId);
    const existingVote = getUserVote(targetHotel);
    const vote: 'love' | 'dislike' = existingVote?.vote === 'love' ? 'dislike' : 'love';

    try {
      const { tripId } = useTripStore.getState();
      
      // Send vote to API
      const response = await fetch('/api/social-cart/hotels/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          hotelId,
          vote,
          userId: currentUserId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit vote');
      }

      console.log('✅ [HotelVoting] Vote submitted successfully');
    } catch (error) {
      console.error('❌ [HotelVoting] Failed to submit vote:', error);
      alert('Failed to submit vote. Please try again.');
    }
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

  const handleProceedToBook = async () => {
    if (!tripId || !isAdmin) return;

    // If voting already closed, just navigate admin back to guest payment
    if (hotelVotingStatus === 'closed') {
      setStep('room-selection');
      return;
    }

    try {
      console.log('📋 [HotelVoting] Admin closing voting and proceeding to guest payment...');

      const response = await fetch('/api/social-cart/hotels/close-voting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId }),
      });

      if (!response.ok) {
        throw new Error('Failed to close voting');
      }

      const { selectedHotel: winner } = await response.json();
      console.log('✅ [HotelVoting] Voting closed, winner:', winner?.name);

      useTripStore.setState({
        selectedHotel: winner,
        hotelVotingStatus: 'closed',
        hotelBookingStatus: 'pending',
      });

      triggerConfetti();
      setStep('room-selection');
    } catch (error) {
      console.error('❌ [HotelVoting] Failed to close voting:', error);
      alert('Failed to proceed to room selection. Please try again.');
    }
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

        {hotelVotingStatus === 'closed' && selectedHotel && (
          <motion.div
            className="card mb-8 border border-green-200 bg-green-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="text-xl font-bold text-green-800 mb-2">Voting Closed</h3>
            <p className="text-green-700">
              {selectedHotel.name} is the final pick for your stay. {isAdmin ? 'You can now continue to the booking page.' : 'The admin is wrapping up the booking for everyone.'}
            </p>
          </motion.div>
        )}

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

        {/* Hotel Consensus Panel */}
        <motion.div
          className="card mb-8 border border-mmt-blue/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-mmt-blue font-semibold uppercase tracking-wide">
                {canVote ? 'Live consensus' : 'Final consensus'}
              </p>
              <h3 className="text-2xl font-bold text-gray-900">
                {hotelConsensus.totalVotes > 0
                  ? `${hotelConsensus.totalVotes} vote${hotelConsensus.totalVotes === 1 ? '' : 's'} collected`
                  : 'No votes submitted yet'}
              </h3>
            </div>
            {canVote && (
              <span className="text-xs text-gray-500">updates in real-time</span>
            )}
          </div>

          {hotelConsensus.totalVotes === 0 ? (
            <p className="text-sm text-gray-600">
              Ask your crew to react so we can surface the front-runners here.
            </p>
          ) : (
            <div className="space-y-4">
              {hotelConsensus.entries.map(({ hotel, percentage }, index) => (
                <div key={hotel.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium text-gray-800">
                    <span>
                      {index + 1}. {hotel.name}
                    </span>
                    <span>{percentage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full ${
                        index === 0 ? 'bg-mmt-blue' : 'bg-mmt-purple'
                      } transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Hotels Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {shortlistedHotels.map((hotel, index) => {
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

                {/* Like toggle */}
                <div className="mb-3">
                  <motion.button
                    onClick={() => handleVoteClick(hotel.id)}
                    disabled={!canVote}
                    className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                      userVote?.vote === 'love'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } ${!canVote ? 'cursor-not-allowed opacity-50' : ''}`}
                    whileHover={{ scale: canVote ? 1.03 : 1 }}
                    whileTap={{ scale: canVote ? 0.97 : 1 }}
                  >
                    <ThumbsUp className="w-5 h-5" />
                    <span>{userVote?.vote === 'love' ? 'You liked this' : 'Like'}</span>
                  </motion.button>
                  {!canVote && (
                    <p className="text-xs text-center text-gray-500 mt-2">Voting has ended</p>
                  )}
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
        {isAdmin && shortlistedHotels.length > 0 && (
          <motion.div
            className="card bg-gradient-to-r from-mmt-blue to-mmt-purple text-white text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="text-xl font-bold mb-2">
              {hotelVotingStatus === 'closed' ? 'Ready to finalize booking?' : 'Ready to proceed?'}
            </h3>
            <p className="mb-6">
              {hotelVotingStatus === 'closed'
                ? 'Only you (the admin) will move to the booking screen. Everyone else will stay here until you finish.'
                : 'Lock the winning hotel and move to the booking screen just for you.'}
            </p>
            <button
              onClick={handleProceedToBook}
              className="inline-block bg-white text-[#0071c2] px-12 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-all duration-200 cursor-pointer"
            >
              {hotelVotingStatus === 'closed' ? '📖 Open Booking Page' : '🔒 Close Voting & Proceed'}
            </button>
          </motion.div>
        )}

        {/* Booking status for members */}
        {hotelBookingStatus === 'pending' && (
          <motion.div
            className="card bg-yellow-50 border border-yellow-200 text-yellow-800 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p>
              {isAdmin
                ? 'Continue the booking flow to lock the rooms. Your group will be notified once you finish.'
                : 'The admin is booking the rooms for everyone. Sit tight—we will notify you once it is confirmed!'}
            </p>
          </motion.div>
        )}

        {hotelBookingStatus === 'confirmed' && bookingConfirmation && (
          <motion.div
            className="card bg-green-50 border border-green-200 text-green-800"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="text-xl font-bold mb-2">🎉 Booking Confirmed</h3>
            <p>
              {bookingConfirmation.hotelName} has been booked (ID: {bookingConfirmation.bookingId}). Check-in on {bookingConfirmation.checkIn} — get ready!
            </p>
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
      
    </div>
  );
}
