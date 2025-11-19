'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Users, Calendar, Home, Share2, Sparkles } from 'lucide-react';
import { useTripStore } from '@/lib/store';
import { calculateDiscount } from '@/lib/utils';
import { triggerSuccessConfetti } from '@/lib/confetti';

export default function BookingScreen() {
  const {
    selectedHotel,
    members,
    tripName,
    destination,
    requiredMembers,
    tripId,
  } = useTripStore();

  const [bookingComplete, setBookingComplete] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [bookingId, setBookingId] = useState<string>('');

  const roomTypes = [
    {
      id: 'deluxe',
      name: 'Deluxe Seaview Room',
      icon: '🌅',
      description: 'Ocean view with private balcony',
      extraCost: 0,
    },
    {
      id: 'suite',
      name: 'Premium Suite',
      icon: '👑',
      description: 'Spacious suite with living area',
      extraCost: 2000,
    },
    {
      id: 'villa',
      name: 'Private Villa',
      icon: '🏡',
      description: 'Exclusive villa with private pool',
      extraCost: 5000,
    },
  ];

  if (!selectedHotel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">No hotel selected</p>
      </div>
    );
  }

  const basePrice = selectedHotel.price;
  const discount = calculateDiscount(basePrice, members.length);
  const finalPrice = basePrice - discount;

  const handleBooking = async () => {
    try {
      // Get check-in/check-out dates (7 days from now for 3 nights)
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 7);
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + 3);

      const bookingDetails = {
        hotelName: selectedHotel.name,
        checkIn: checkInDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        checkOut: checkOutDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        roomType: roomTypes.find(r => r.id === selectedRoom)?.name,
        finalPrice,
        groupSize: members.length,
      };

      const response = await fetch('/api/social-cart/booking/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          bookingDetails,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm booking');
      }

      const data = await response.json();
      setBookingId(data.bookingId);
      
      triggerSuccessConfetti();
      setBookingComplete(true);
    } catch (error) {
      console.error('Failed to confirm booking:', error);
      alert('Failed to confirm booking. Please try again.');
    }
  };

  const handleShare = () => {
    const message = `🎉 We just booked ${selectedHotel.name} for our ${tripName} trip!\n\nSaved ₹${discount.toLocaleString()} with group booking! 💰`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Trip Booking Success',
        text: message,
      });
    } else {
      navigator.clipboard.writeText(message);
      alert('Itinerary copied to clipboard!');
    }
  };

  if (bookingComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-green-50 to-blue-50">
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
              animate={{
                rotate: [0, 10, -10, 10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 0.5 }}
            >
              🎊
            </motion.div>
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Booking Confirmed!
            </h1>
            <p className="text-xl text-gray-600">
              Get ready for an amazing trip! 🚀
            </p>
          </motion.div>

          {/* Discount Banner */}
          <motion.div
            className="card bg-gradient-to-r from-green-400 to-green-500 text-white text-center mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-5xl mb-3">💸</div>
            <h2 className="text-3xl font-bold mb-2">
              Group Discount Unlocked!
            </h2>
            <p className="text-2xl font-bold">
              You saved ₹{discount.toLocaleString()}!
            </p>
            <p className="text-green-100 mt-2">
              Thanks to {members.length} amazing friends joining the trip
            </p>
          </motion.div>

          {/* Booking Summary */}
          <motion.div
            className="card mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Check className="w-6 h-6 text-green-500" />
              Booking Summary
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="text-5xl">{selectedHotel.image}</div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-gray-900">
                    {selectedHotel.name}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{selectedHotel.rating} Rating</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                {bookingId && (
                  <div className="flex justify-between bg-blue-50 -mx-4 px-4 py-2 mb-2">
                    <span className="text-gray-600 font-semibold">Booking ID:</span>
                    <span className="font-bold text-[#0071c2]">{bookingId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Trip Name:</span>
                  <span className="font-semibold">{tripName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Destination:</span>
                  <span className="font-semibold">{destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Group Size:</span>
                  <span className="font-semibold">{members.length} members</span>
                </div>
                {selectedRoom && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Room Type:</span>
                    <span className="font-semibold">
                      {roomTypes.find(r => r.id === selectedRoom)?.name}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Base Price:</span>
                  <span>₹{basePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>Group Discount:</span>
                  <span>- ₹{discount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                  <span>Final Price:</span>
                  <span>₹{finalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Trip Members */}
          <motion.div
            className="card mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-mmt-blue" />
              Your Travel Squad ({members.length})
            </h3>
            <div className="flex flex-wrap gap-3">
              {members.map((member, index) => (
                <motion.div
                  key={member.id}
                  className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-full"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-mmt-blue to-mmt-purple rounded-full flex items-center justify-center text-white text-sm">
                    {member.avatar}
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {member.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Achievement Badge */}
          <motion.div
            className="card bg-gradient-to-r from-purple-400 to-pink-400 text-white text-center mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="text-5xl mb-3">🏆</div>
            <h3 className="text-xl font-bold mb-2">Achievement Unlocked!</h3>
            <p className="text-purple-100">
              Master Trip Planner - Organized a successful group trip
            </p>
          </motion.div>

          {/* Share Button */}
          <motion.button
            onClick={handleShare}
            className="w-full btn-primary text-lg flex items-center justify-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Share2 className="w-5 h-5" />
            📢 Share Itinerary with Friends
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">Top Pick by Your Group</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Almost There! 🎯
          </h1>
          <p className="text-lg text-gray-600">
            Complete your booking to secure the group discount
          </p>
        </motion.div>

        {/* Hotel Card */}
        <motion.div
          className="card mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-start gap-6 mb-6">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-400 rounded-xl flex items-center justify-center text-6xl flex-shrink-0">
              {selectedHotel.image}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedHotel.name}
              </h2>
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-gray-900">{selectedHotel.rating}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">{destination}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedHotel.amenities.map(amenity => (
                  <span key={amenity} className="badge badge-info text-xs">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
            <h3 className="font-bold text-gray-900 mb-4">Price Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Base Price (per night):</span>
                <span className="font-semibold">₹{basePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-green-600 font-semibold">
                <span>Group Discount ({members.length} members):</span>
                <span>- ₹{discount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-2xl font-bold text-gray-900 pt-3 border-t-2">
                <span>You Pay:</span>
                <span className="text-mmt-blue">₹{finalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Room Selection */}
        <motion.div
          className="card mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Home className="w-6 h-6 text-mmt-blue" />
            Select Your Room Type
          </h3>
          <div className="space-y-3">
            {roomTypes.map((room, index) => (
              <motion.button
                key={room.id}
                onClick={() => setSelectedRoom(room.id)}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  selectedRoom === room.id
                    ? 'border-mmt-blue bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{room.icon}</div>
                    <div>
                      <div className="font-bold text-gray-900">{room.name}</div>
                      <div className="text-sm text-gray-600">{room.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {room.extraCost > 0 ? (
                      <div className="font-semibold text-gray-900">
                        +₹{room.extraCost.toLocaleString()}
                      </div>
                    ) : (
                      <div className="text-green-600 font-semibold">Included</div>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Booking Actions */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={handleBooking}
            disabled={!selectedRoom}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              selectedRoom
                ? 'bg-gradient-to-r from-mmt-blue to-mmt-purple text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Proceed to Book →
          </button>

          <button className="w-full btn-secondary">
            Reopen Voting
          </button>
        </motion.div>

        {/* Room Transparency Message */}
        {selectedRoom && (
          <motion.div
            className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-blue-700 text-center">
              <span className="font-semibold">Admin selected:</span>{' '}
              {roomTypes.find(r => r.id === selectedRoom)?.name} {roomTypes.find(r => r.id === selectedRoom)?.icon}
            </p>
            <p className="text-blue-600 text-sm text-center mt-1">
              This selection will be shared with all trip members
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
