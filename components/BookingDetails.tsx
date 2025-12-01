'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Users, IndianRupee, Share2, Download, RefreshCw, Phone, Mail, User } from 'lucide-react';
import { useTripStore } from '@/lib/store';
import { useState } from 'react';

export default function BookingDetails() {
  const { currentBooking, setStep } = useTripStore();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [generating, setGenerating] = useState(false);

  if (!currentBooking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">Booking not found</p>
          <button
            onClick={() => setStep('mybookings')}
            className="bg-mmt-blue text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition"
          >
            Back to My Bookings
          </button>
        </div>
      </div>
    );
  }

  const booking = currentBooking;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const calculateNights = () => {
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleShare = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/social-cart/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.bookingId,
          userId: booking.userId,
          expiryDays: 7,
          permissions: 'PUBLIC',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShareUrl(data.shareUrl);
        setShareModalOpen(true);
      } else {
        alert('Failed to generate share link');
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      alert('Failed to generate share link');
    } finally {
      setGenerating(false);
    }
  };

  const handleWhatsAppShare = () => {
    const message = `Check out this amazing hotel itinerary!\n\n🏨 ${booking.hotelName}\n📍 ${booking.destination}\n📅 ${formatDate(booking.checkIn)} to ${formatDate(booking.checkOut)}\n\nBook now: ${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <motion.button
          onClick={() => setStep('mybookings')}
          className="mb-6 flex items-center gap-2 text-mmt-blue hover:text-blue-700 font-semibold transition"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to My Bookings
        </motion.button>

        {/* Main Card */}
        <motion.div
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header with Hotel Image */}
          <div className="h-64 bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center relative overflow-hidden">
            {booking.hotelImage && booking.hotelImage.startsWith('http') ? (
              <img 
                src={booking.hotelImage} 
                alt={booking.hotelName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-8xl">{booking.hotelImage || '🏨'}</span>
            )}
            <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-full shadow-lg">
              <span className="text-sm font-bold text-mmt-blue">
                Booking ID: {booking.bookingId}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Hotel Name & Location */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {booking.hotelName}
            </h1>
            <div className="flex items-center gap-2 text-gray-600 mb-6">
              <MapPin className="w-5 h-5" />
              <span className="text-lg">{booking.destination}</span>
            </div>

            {/* Trip Type Badge */}
            <div className="inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded-full font-semibold mb-6">
              {booking.tripType === 'wedding' ? '💒 Wedding' : booking.tripType === 'concert' ? '🎵 Concert' : '✈️ Pilgrimage Trip'}
            </div>

            {/* Stay Details */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-mmt-blue rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Check-in</p>
                    <p className="font-bold text-gray-900">{formatDate(booking.checkIn)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-mmt-purple rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Check-out</p>
                    <p className="font-bold text-gray-900">{formatDate(booking.checkOut)}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Total stay</p>
                  <p className="text-lg font-bold text-mmt-blue">{calculateNights()} Night{calculateNights() > 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Guests</p>
                    <p className="font-bold text-gray-900">
                      {booking.guests.adults} Adult{booking.guests.adults > 1 ? 's' : ''}
                      {booking.guests.children > 0 && `, ${booking.guests.children} Child${booking.guests.children > 1 ? 'ren' : ''}`}
                    </p>
                  </div>
                </div>
                {booking.roomType && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Room Type</p>
                    <p className="font-bold text-gray-900">{booking.roomType}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Rooms Booked</p>
                  <p className="text-lg font-bold text-green-600">{booking.guests.rooms} Room{booking.guests.rooms > 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="bg-blue-50 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Breakdown</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Base Fare</span>
                  <span className="font-semibold">₹{booking.pricing.baseFare.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Taxes & Service Fee</span>
                  <span className="font-semibold">₹{(booking.pricing.taxes + booking.pricing.fees).toLocaleString('en-IN')}</span>
                </div>
                {booking.discounts && booking.discounts.amount > 0 && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Discount {booking.discounts.promoCode && `(${booking.discounts.promoCode})`}</span>
                    <span>- ₹{booking.discounts.amount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="pt-3 border-t-2 border-gray-300 flex justify-between text-xl font-bold text-mmt-blue">
                  <span>Total Paid</span>
                  <span className="flex items-center">
                    <IndianRupee className="w-6 h-6" />
                    {booking.discounts
                      ? booking.discounts.finalTotal.toLocaleString('en-IN')
                      : booking.pricing.subtotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Payment Status</span>
                  <span className="font-semibold text-green-600">{booking.paymentStatus}</span>
                </div>
                {booking.paymentRef && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Transaction Ref</span>
                    <span className="font-mono">{booking.paymentRef}</span>
                  </div>
                )}
                {booking.paymentMethod && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Payment Method</span>
                    <span className="font-semibold capitalize">{booking.paymentMethod}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Guest Information */}
            {(booking.guestName || booking.guestEmail || booking.guestPhone) && (
              <div className="bg-blue-50 rounded-xl p-6 mb-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Guest Information
                </h3>
                <div className="space-y-2 text-sm">
                  {booking.guestName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name</span>
                      <span className="font-semibold">{booking.guestName}</span>
                    </div>
                  )}
                  {booking.guestEmail && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email</span>
                      <span className="font-semibold">{booking.guestEmail}</span>
                    </div>
                  )}
                  {booking.guestPhone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone</span>
                      <span className="font-semibold">{booking.guestPhone}</span>
                    </div>
                  )}
                  {booking.specialRequests && (
                    <div className="pt-2 border-t border-blue-200">
                      <span className="text-gray-600 block mb-1">Special Requests</span>
                      <span className="font-semibold">{booking.specialRequests}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={handleShare}
                disabled={generating}
                className="flex items-center justify-center gap-2 bg-green-500 text-white px-6 py-4 rounded-xl font-semibold hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Share2 className="w-5 h-5" />
                {generating ? 'Generating Link...' : 'Share Itinerary'}
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 bg-mmt-blue text-white px-6 py-4 rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                <Download className="w-5 h-5" />
                Download Invoice
              </button>
              <button
                onClick={() => setStep('hotels')}
                className="flex items-center justify-center gap-2 bg-purple-500 text-white px-6 py-4 rounded-xl font-semibold hover:bg-purple-600 transition"
              >
                <RefreshCw className="w-5 h-5" />
                Rebook
              </button>
              <button
                className="flex items-center justify-center gap-2 bg-orange-500 text-white px-6 py-4 rounded-xl font-semibold hover:bg-orange-600 transition"
              >
                <Phone className="w-5 h-5" />
                Contact Support
              </button>
            </div>

            {/* Policies */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-3">Cancellation Policy</h3>
              <p className="text-sm text-gray-600 mb-2">
                {booking.cancellable
                  ? '✅ Free cancellation available up to 24 hours before check-in'
                  : '❌ Non-refundable booking'}
              </p>
              <p className="text-xs text-gray-500">
                Booked on {new Date(booking.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Share Modal */}
        {shareModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShareModalOpen(false)}>
            <motion.div
              className="bg-white rounded-2xl p-8 max-w-md w-full"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Share Your Itinerary</h3>
              <p className="text-gray-600 mb-6">Share this link with friends and family so they can easily book the same trip!</p>
              
              <div className="bg-gray-100 rounded-lg p-4 mb-6 break-all text-sm">
                {shareUrl}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  onClick={handleWhatsAppShare}
                  className="bg-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600 transition"
                >
                  WhatsApp
                </button>
                <button
                  onClick={handleCopyLink}
                  className="bg-mmt-blue text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
                >
                  Copy Link
                </button>
              </div>

              <button
                onClick={() => setShareModalOpen(false)}
                className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
