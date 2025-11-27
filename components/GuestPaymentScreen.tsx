'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, User, Mail, Phone, CreditCard, Smartphone, Building2, CheckCircle, AlertCircle, Users, Calendar, Home, IndianRupee } from 'lucide-react';
import { useTripStore } from '@/lib/store';
import { calculateDiscount } from '@/lib/utils';
import Header from './Header';

type Step = 'guest-info' | 'payment' | 'confirmation';
type PaymentMethod = 'card' | 'upi' | 'netbanking';

interface GuestInfo {
  fullName: string;
  email: string;
  phone: string;
  specialRequests?: string;
}

interface PaymentInfo {
  method: PaymentMethod;
  cardNumber?: string;
  cardName?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvv?: string;
  upiId?: string;
}

interface RoomTypeInfo {
  id: string;
  name: string;
  basePrice: number;
}

const ROOM_TYPES: RoomTypeInfo[] = [
  { id: 'standard', name: 'Standard Room', basePrice: 0 },
  { id: 'deluxe', name: 'Deluxe Room', basePrice: 1500 },
  { id: 'suite', name: 'Executive Suite', basePrice: 3500 },
];

export default function GuestPaymentScreen() {
  const {
    selectedHotel,
    members,
    destination,
    tripId,
    currentUserId,
    setStep,
  } = useTripStore();

  const [currentStep, setCurrentStep] = useState<Step>('guest-info');
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({
    fullName: '',
    email: '',
    phone: '',
    specialRequests: '',
  });
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    method: 'card',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [bookingId, setBookingId] = useState('');
  
  // Read URL parameters for room selection
  const [urlParams, setUrlParams] = useState({
    roomType: 'standard',
    checkIn: '',
    checkOut: '',
    adults: 2,
    children: 0,
    rooms: 1,
    destination: '',
  });
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const checkInParam = params.get('checkIn');
      const checkOutParam = params.get('checkOut');
      
      // Convert ISO dates to yyyy-MM-dd format if needed
      const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          return date.toISOString().split('T')[0];
        } catch {
          return dateStr;
        }
      };
      
      setUrlParams({
        roomType: params.get('roomType') || 'standard',
        checkIn: formatDate(checkInParam || ''),
        checkOut: formatDate(checkOutParam || ''),
        adults: parseInt(params.get('adults') || '2'),
        children: parseInt(params.get('children') || '0'),
        rooms: parseInt(params.get('rooms') || '1'),
        destination: params.get('destination') || '',
      });
    }
  }, []);

  if (!selectedHotel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">No hotel selected</p>
      </div>
    );
  }

  // Calculate pricing from URL parameters
  const selectedRoomType = ROOM_TYPES.find(r => r.id === urlParams.roomType) || ROOM_TYPES[0];
  const totalGuests = urlParams.adults + urlParams.children;
  const totalRooms = urlParams.rooms;
  const pricePerNight = selectedHotel.price;
  
  // Calculate nights from check-in/check-out dates
  const nights = urlParams.checkIn && urlParams.checkOut
    ? Math.ceil((new Date(urlParams.checkOut).getTime() - new Date(urlParams.checkIn).getTime()) / (1000 * 60 * 60 * 24))
    : 3;
  
  // Calculate room upgrade cost
  const roomUpgradeCost = selectedRoomType.basePrice * nights * totalRooms;
  
  // Base price calculation
  const basePrice = (totalRooms * pricePerNight * nights) + roomUpgradeCost;
  const discount = tripId && members.length > 0 ? calculateDiscount(basePrice, members.length) : 0;
  const taxRate = 0.12; // 12% tax
  const taxes = (basePrice - discount) * taxRate;
  const finalPrice = basePrice - discount + taxes;

  // Get check-in/check-out dates from URL or defaults
  const checkInDate = urlParams.checkIn ? new Date(urlParams.checkIn) : (() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  })();
  
  const checkOutDate = urlParams.checkOut ? new Date(urlParams.checkOut) : (() => {
    const date = new Date(checkInDate);
    date.setDate(date.getDate() + nights);
    return date;
  })();

  const validateGuestInfo = () => {
    const newErrors: Record<string, string> = {};

    if (!guestInfo.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!guestInfo.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestInfo.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!guestInfo.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(guestInfo.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePaymentInfo = () => {
    const newErrors: Record<string, string> = {};

    if (paymentInfo.method === 'card') {
      if (!paymentInfo.cardNumber || paymentInfo.cardNumber.replace(/\s/g, '').length !== 16) {
        newErrors.cardNumber = 'Card number must be 16 digits';
      }
      if (!paymentInfo.cardName?.trim()) {
        newErrors.cardName = 'Cardholder name is required';
      }
      if (!paymentInfo.expiryMonth || !paymentInfo.expiryYear) {
        newErrors.expiry = 'Expiry date is required';
      }
      if (!paymentInfo.cvv || paymentInfo.cvv.length !== 3) {
        newErrors.cvv = 'CVV must be 3 digits';
      }
    } else if (paymentInfo.method === 'upi') {
      if (!paymentInfo.upiId?.trim()) {
        newErrors.upiId = 'UPI ID is required';
      } else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(paymentInfo.upiId)) {
        newErrors.upiId = 'Invalid UPI ID format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (currentStep === 'guest-info') {
      if (validateGuestInfo()) {
        setCurrentStep('payment');
      }
    } else if (currentStep === 'payment') {
      if (validatePaymentInfo()) {
        handlePayment();
      }
    }
  };

  const handlePayment = async () => {
    setProcessing(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Confirm booking
      const response = await fetch('/api/social-cart/booking/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: tripId || null,
          userId: currentUserId || `guest_${Date.now()}`,
          bookingDetails: {
            destination: destination || urlParams.destination || 'Unknown',
            hotelId: selectedHotel.id,
            hotelName: selectedHotel.name,
            hotelImage: selectedHotel.image,
            checkIn: urlParams.checkIn || checkInDate.toISOString().split('T')[0],
            checkOut: urlParams.checkOut || checkOutDate.toISOString().split('T')[0],
            adults: urlParams.adults,
            children: urlParams.children,
            rooms: urlParams.rooms,
            roomType: urlParams.roomType ? ROOM_TYPES.find(r => r.id === urlParams.roomType)?.name : undefined,
            groupSize: totalGuests,
            finalPrice: Math.round(finalPrice),
            baseFare: basePrice,
            taxes,
            fees: 0,
            discount,
            discountPercentage: discount > 0 ? Math.round((discount / basePrice) * 100) : 0,
            guestName: guestInfo.fullName,
            guestEmail: guestInfo.email,
            guestPhone: guestInfo.phone,
            specialRequests: guestInfo.specialRequests,
            paymentMethod: paymentInfo.method,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm booking');
      }

      const data = await response.json();
      setBookingId(data.bookingId);

      // Save to store
      if (data.booking) {
        useTripStore.getState().addBooking(data.booking);
      }

      useTripStore.setState({
        hotelBookingStatus: 'confirmed',
        bookingConfirmation: {
          bookingId: data.bookingId,
          hotelName: selectedHotel.name,
          checkIn: checkInDate.toLocaleDateString('en-IN'),
          checkOut: checkOutDate.toLocaleDateString('en-IN'),
          finalPrice,
          groupSize: totalGuests,
        },
      });

      // Show confirmation
      setCurrentStep('confirmation');

      // Trigger confetti
      import('../lib/confetti').then(({ triggerSuccessConfetti }) => triggerSuccessConfetti());
    } catch (error) {
      console.error('Failed to process payment:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    return value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pt-20 pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {['guest-info', 'payment', 'confirmation'].map((step, index) => (
                <div key={step} className="flex items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                      currentStep === step
                        ? 'bg-mmt-blue text-white scale-110'
                        : index < ['guest-info', 'payment', 'confirmation'].indexOf(currentStep)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {index < ['guest-info', 'payment', 'confirmation'].indexOf(currentStep) ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < 2 && (
                    <div
                      className={`flex-1 h-1 mx-2 transition-all ${
                        index < ['guest-info', 'payment', 'confirmation'].indexOf(currentStep)
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span className={currentStep === 'guest-info' ? 'text-mmt-blue' : 'text-gray-600'}>Guest Info</span>
              <span className={currentStep === 'payment' ? 'text-mmt-blue' : 'text-gray-600'}>Payment</span>
              <span className={currentStep === 'confirmation' ? 'text-mmt-blue' : 'text-gray-600'}>Confirmation</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Guest Information Step */}
            {currentStep === 'guest-info' && (
              <motion.div
                key="guest-info"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl shadow-xl p-8"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Guest Information</h2>

                {/* Booking Summary */}
                <div className="bg-blue-50 rounded-xl p-6 mb-6">
                  <h3 className="font-bold text-gray-900 mb-4">Booking Summary</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-mmt-blue" />
                      <span><strong>Hotel:</strong> {selectedHotel.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-mmt-blue" />
                      <span><strong>Check-in:</strong> {checkInDate.toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-mmt-blue" />
                      <span><strong>Check-out:</strong> {checkOutDate.toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-mmt-blue" />
                      <span><strong>Guests:</strong> {urlParams.adults} adult{urlParams.adults > 1 ? 's' : ''}{urlParams.children > 0 ? `, ${urlParams.children} child${urlParams.children > 1 ? 'ren' : ''}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-mmt-blue" />
                      <span><strong>Rooms:</strong> {totalRooms} × {selectedRoomType.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-green-600" />
                      <span className="font-bold text-green-600">Total: ₹{Math.round(finalPrice).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={guestInfo.fullName}
                      onChange={(e) => setGuestInfo({ ...guestInfo, fullName: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border ${
                        errors.fullName ? 'border-red-500' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-mmt-blue`}
                      placeholder="Enter full name"
                    />
                    {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={guestInfo.email}
                      onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-mmt-blue`}
                      placeholder="your.email@example.com"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={guestInfo.phone}
                      onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      className={`w-full px-4 py-3 rounded-xl border ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-mmt-blue`}
                      placeholder="10-digit mobile number"
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special Requests (Optional)
                    </label>
                    <textarea
                      value={guestInfo.specialRequests}
                      onChange={(e) => setGuestInfo({ ...guestInfo, specialRequests: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-mmt-blue"
                      rows={3}
                      placeholder="e.g., Early check-in, extra pillows, etc."
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button
                    onClick={() => setStep('room-selection')}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-4 rounded-xl font-semibold hover:bg-gray-300 transition flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                  </button>
                  <button
                    onClick={handleNextStep}
                    className="flex-1 bg-mmt-blue text-white px-6 py-4 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    Next: Payment
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Payment Step */}
            {currentStep === 'payment' && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl shadow-xl p-8"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Details</h2>

                {/* Price Breakdown */}
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h3 className="font-bold text-gray-900 mb-4">Price Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Room ({totalRooms} × {selectedRoomType.name})</span>
                      <span>₹{(totalRooms * pricePerNight * nights).toLocaleString('en-IN')}</span>
                    </div>
                    {selectedRoomType.basePrice > 0 && (
                      <div className="flex justify-between text-blue-600">
                        <span>Room Upgrade ({nights} night{nights > 1 ? 's' : ''})</span>
                        <span>+ ₹{roomUpgradeCost.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {discount > 0 && (
                      <div className="flex justify-between text-green-600 font-semibold">
                        <span>Group Discount</span>
                        <span>- ₹{discount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Taxes & Fees (12%)</span>
                      <span>₹{Math.round(taxes).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="pt-2 border-t-2 border-gray-300 flex justify-between text-lg font-bold text-mmt-blue">
                      <span>Total Payable</span>
                      <span>₹{Math.round(finalPrice).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Select Payment Method</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setPaymentInfo({ ...paymentInfo, method: 'card' })}
                      className={`p-4 rounded-xl border-2 transition ${
                        paymentInfo.method === 'card'
                          ? 'border-mmt-blue bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <CreditCard className="w-6 h-6 mx-auto mb-2" />
                      <span className="text-sm font-medium">Card</span>
                    </button>
                    <button
                      onClick={() => setPaymentInfo({ ...paymentInfo, method: 'upi' })}
                      className={`p-4 rounded-xl border-2 transition ${
                        paymentInfo.method === 'upi'
                          ? 'border-mmt-blue bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <Smartphone className="w-6 h-6 mx-auto mb-2" />
                      <span className="text-sm font-medium">UPI</span>
                    </button>
                    <button
                      onClick={() => setPaymentInfo({ ...paymentInfo, method: 'netbanking' })}
                      className={`p-4 rounded-xl border-2 transition ${
                        paymentInfo.method === 'netbanking'
                          ? 'border-mmt-blue bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <Building2 className="w-6 h-6 mx-auto mb-2" />
                      <span className="text-sm font-medium">Net Banking</span>
                    </button>
                  </div>
                </div>

                {/* Payment Form */}
                {paymentInfo.method === 'card' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Card Number *</label>
                      <input
                        type="text"
                        value={paymentInfo.cardNumber || ''}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, cardNumber: formatCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16)) })}
                        className={`w-full px-4 py-3 rounded-xl border ${
                          errors.cardNumber ? 'border-red-500' : 'border-gray-300'
                        } focus:outline-none focus:ring-2 focus:ring-mmt-blue`}
                        placeholder="1234 5678 9012 3456"
                      />
                      {errors.cardNumber && <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name *</label>
                      <input
                        type="text"
                        value={paymentInfo.cardName || ''}
                        onChange={(e) => setPaymentInfo({ ...paymentInfo, cardName: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl border ${
                          errors.cardName ? 'border-red-500' : 'border-gray-300'
                        } focus:outline-none focus:ring-2 focus:ring-mmt-blue`}
                        placeholder="Name on card"
                      />
                      {errors.cardName && <p className="text-red-500 text-sm mt-1">{errors.cardName}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date *</label>
                        <div className="flex gap-2">
                          <select
                            value={paymentInfo.expiryMonth || ''}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, expiryMonth: e.target.value })}
                            className={`flex-1 px-4 py-3 rounded-xl border ${
                              errors.expiry ? 'border-red-500' : 'border-gray-300'
                            } focus:outline-none focus:ring-2 focus:ring-mmt-blue`}
                          >
                            <option value="">MM</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                              <option key={m} value={m.toString().padStart(2, '0')}>{m.toString().padStart(2, '0')}</option>
                            ))}
                          </select>
                          <select
                            value={paymentInfo.expiryYear || ''}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, expiryYear: e.target.value })}
                            className={`flex-1 px-4 py-3 rounded-xl border ${
                              errors.expiry ? 'border-red-500' : 'border-gray-300'
                            } focus:outline-none focus:ring-2 focus:ring-mmt-blue`}
                          >
                            <option value="">YY</option>
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(y => (
                              <option key={y} value={y.toString().slice(-2)}>{y}</option>
                            ))}
                          </select>
                        </div>
                        {errors.expiry && <p className="text-red-500 text-sm mt-1">{errors.expiry}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">CVV *</label>
                        <input
                          type="text"
                          value={paymentInfo.cvv || ''}
                          onChange={(e) => setPaymentInfo({ ...paymentInfo, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                          className={`w-full px-4 py-3 rounded-xl border ${
                            errors.cvv ? 'border-red-500' : 'border-gray-300'
                          } focus:outline-none focus:ring-2 focus:ring-mmt-blue`}
                          placeholder="123"
                        />
                        {errors.cvv && <p className="text-red-500 text-sm mt-1">{errors.cvv}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {paymentInfo.method === 'upi' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">UPI ID *</label>
                    <input
                      type="text"
                      value={paymentInfo.upiId || ''}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, upiId: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border ${
                        errors.upiId ? 'border-red-500' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-mmt-blue`}
                      placeholder="yourname@upi"
                    />
                    {errors.upiId && <p className="text-red-500 text-sm mt-1">{errors.upiId}</p>}
                  </div>
                )}

                {paymentInfo.method === 'netbanking' && (
                  <div className="bg-blue-50 rounded-xl p-6 text-center">
                    <Building2 className="w-12 h-12 mx-auto mb-3 text-mmt-blue" />
                    <p className="text-gray-700">You will be redirected to your bank's secure payment gateway</p>
                  </div>
                )}

                <div className="flex gap-4 mt-8">
                  <button
                    onClick={() => setCurrentStep('guest-info')}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-4 rounded-xl font-semibold hover:bg-gray-300 transition flex items-center justify-center gap-2"
                    disabled={processing}
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                  </button>
                  <button
                    onClick={handleNextStep}
                    disabled={processing}
                    className="flex-1 bg-green-600 text-white px-6 py-4 rounded-xl font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Pay ₹{finalPrice.toLocaleString('en-IN')}
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Confirmation Step */}
            {currentStep === 'confirmation' && (
              <motion.div
                key="confirmation"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl p-8 text-center"
              >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>

                <h2 className="text-3xl font-bold text-gray-900 mb-3">Booking Confirmed!</h2>
                <p className="text-lg text-gray-600 mb-6">
                  Your payment was successful. We've sent a confirmation email to {guestInfo.email}
                </p>

                <div className="bg-blue-50 rounded-xl p-6 mb-6">
                  <p className="text-sm text-gray-600 mb-2">Booking ID</p>
                  <p className="text-2xl font-bold text-mmt-blue">{bookingId}</p>
                </div>

                <div className="text-left bg-gray-50 rounded-xl p-6 mb-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hotel</span>
                    <span className="font-semibold">{selectedHotel.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check-in</span>
                    <span className="font-semibold">{checkInDate.toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check-out</span>
                    <span className="font-semibold">{checkOutDate.toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Guests</span>
                    <span className="font-semibold">{totalGuests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rooms</span>
                    <span className="font-semibold">{totalRooms}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-300">
                    <span className="text-gray-900 font-bold">Total Paid</span>
                    <span className="font-bold text-green-600">₹{finalPrice.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setStep('mybookings')}
                    className="bg-mmt-blue text-white px-6 py-4 rounded-xl font-semibold hover:bg-blue-700 transition"
                  >
                    View Booking
                  </button>
                  <button
                    onClick={() => setStep('home')}
                    className="bg-gray-200 text-gray-700 px-6 py-4 rounded-xl font-semibold hover:bg-gray-300 transition"
                  >
                    Book Another Trip
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
