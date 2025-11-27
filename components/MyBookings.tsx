'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Users, MapPin, IndianRupee, CheckCircle, XCircle, Clock, Share2, Download, RefreshCw, Filter } from 'lucide-react';
import { useTripStore, CompletedBooking } from '@/lib/store';

type FilterType = 'all' | 'upcoming' | 'past' | 'cancellable';

export default function MyBookings() {
  const { currentUserId, setStep, myBookings, loadMyBookings, tripId } = useTripStore();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (!currentUserId) return;

    setLoading(true);
    loadMyBookings(currentUserId).finally(() => setLoading(false));
  }, [currentUserId, loadMyBookings]);

  const filteredBookings = myBookings.filter(booking => {
    const checkInDate = new Date(booking.checkIn);
    const now = new Date();

    switch (filter) {
      case 'upcoming':
        return checkInDate > now && booking.status === 'Confirmed';
      case 'past':
        return checkInDate <= now;
      case 'cancellable':
        return booking.cancellable && booking.status === 'Confirmed';
      default:
        return true;
    }
  });

  const handleViewDetails = (booking: CompletedBooking) => {
    useTripStore.setState({ currentBooking: booking });
    setStep('booking-details');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 border-4 border-mmt-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading your bookings...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8 flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Bookings</h1>
            <p className="text-lg text-gray-600">View and manage your trip bookings</p>
          </div>
          {tripId && (
            <button
              onClick={() => setStep('poll')}
              className="bg-mmt-blue text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition shadow-lg flex items-center gap-2"
            >
              <Users className="w-5 h-5" />
              Back to Cart
            </button>
          )}
        </motion.div>

        {/* Filters */}
        <motion.div
          className="mb-6 flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-full font-semibold transition-all ${
              filter === 'all'
                ? 'bg-mmt-blue text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Filter className="w-4 h-4 inline mr-2" />
            All Bookings ({myBookings.length})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-6 py-2 rounded-full font-semibold transition-all ${
              filter === 'upcoming'
                ? 'bg-mmt-blue text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-6 py-2 rounded-full font-semibold transition-all ${
              filter === 'past'
                ? 'bg-mmt-blue text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Past
          </button>
          <button
            onClick={() => setFilter('cancellable')}
            className={`px-6 py-2 rounded-full font-semibold transition-all ${
              filter === 'cancellable'
                ? 'bg-mmt-blue text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <XCircle className="w-4 h-4 inline mr-2" />
            Cancellable
          </button>
        </motion.div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <motion.div
            className="bg-white rounded-2xl shadow-lg p-12 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? "You haven't made any bookings yet. Start planning your next trip!"
                : `No ${filter} bookings found. Try a different filter.`}
            </p>
            <button
              onClick={() => setStep('home')}
              className="bg-mmt-blue text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition"
            >
              Start Booking
            </button>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredBookings.map((booking, index) => (
                <motion.div
                  key={booking.bookingId}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleViewDetails(booking)}
                >
                  {/* Hotel Image */}
                  <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center overflow-hidden relative">
                    {booking.hotelImage && booking.hotelImage.startsWith('http') ? (
                      <img 
                        src={booking.hotelImage} 
                        alt={booking.hotelName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-6xl">{booking.hotelImage || '🏨'}</span>
                    )}
                  </div>

                  <div className="p-6">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          booking.status === 'Confirmed'
                            ? 'bg-green-100 text-green-700'
                            : booking.status === 'Cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {booking.status === 'Confirmed' ? (
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                        ) : (
                          <XCircle className="w-4 h-4 inline mr-1" />
                        )}
                        {booking.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        ID: {booking.bookingId}
                      </span>
                    </div>

                    {/* Hotel Name */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {booking.hotelName}
                    </h3>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-gray-600 mb-4">
                      <MapPin className="w-4 h-4" />
                      <span>{booking.destination}</span>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-2 text-gray-700 mb-3">
                      <Calendar className="w-4 h-4 text-mmt-blue" />
                      <span className="font-medium">
                        {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                      </span>
                    </div>

                    {/* Guests */}
                    <div className="flex items-center gap-2 text-gray-700 mb-4">
                      <Users className="w-4 h-4 text-mmt-blue" />
                      <span>
                        {booking.guests.adults} Adult{booking.guests.adults > 1 ? 's' : ''}
                        {booking.guests.children > 0 && `, ${booking.guests.children} Child${booking.guests.children > 1 ? 'ren' : ''}`}
                        {' • '}
                        {booking.guests.rooms} Room{booking.guests.rooms > 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-2xl font-bold text-mmt-blue">
                        <IndianRupee className="w-6 h-6" />
                        {booking.discounts
                          ? booking.discounts.finalTotal.toLocaleString('en-IN')
                          : booking.pricing.subtotal.toLocaleString('en-IN')}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Share functionality will be added
                          }}
                          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
                          title="Share itinerary"
                        >
                          <Share2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Download functionality will be added
                          }}
                          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
                          title="Download invoice"
                        >
                          <Download className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {/* Discount Badge */}
                    {booking.discounts && booking.discounts.amount > 0 && (
                      <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <p className="text-sm text-green-700 font-semibold">
                          💰 Saved ₹{booking.discounts.amount.toLocaleString('en-IN')}
                          {booking.discounts.percentage && ` (${booking.discounts.percentage}% off)`}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
