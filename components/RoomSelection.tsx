'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, Hotel, ArrowLeft, ArrowRight, Star, MapPin, Wifi, Coffee, Waves, Dumbbell, UtensilsCrossed, Car, Check } from 'lucide-react';
import { useTripStore, Poll, PollOption } from '@/lib/store';
import { AVAILABLE_HOTELS } from '@/components/HotelSelection';

// Helper function to get top voted option from a poll
const getTopOption = (poll?: Poll): PollOption | undefined => {
  if (!poll || !poll.options.length) return undefined;
  const maxVotes = Math.max(...poll.options.map((option) => option.votes.length));
  if (maxVotes === 0) return undefined;
  return poll.options.find((option) => option.votes.length === maxVotes);
};

// Helper function to parse date range from poll option text
// Format 1: "Dec 5 - 9, 2025 [2025-12-05:2025-12-09]" (display text with hidden ISO dates in brackets)
// Format 2 (legacy): "YYYY-MM-DD|YYYY-MM-DD|Display Text" (ISO dates with pipe separator)
// Format 3 (legacy): "01 Jan 2026 – 05 Jan 2026" (human readable with en-dash)
const parseDateRangeOption = (text?: string) => {
  if (!text) {
    console.log('📅 [parseDateRangeOption] No text provided');
    return { checkIn: '', checkOut: '' };
  }

  console.log('📅 [parseDateRangeOption] Parsing:', text);

  // FORMAT 1: Check for bracket format "Display [YYYY-MM-DD:YYYY-MM-DD]"
  const bracketMatch = text.match(/\[(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})\]/);
  if (bracketMatch) {
    const checkIn = bracketMatch[1];
    const checkOut = bracketMatch[2];
    console.log('📅 [parseDateRangeOption] Parsed bracket format:', { checkIn, checkOut });
    return { checkIn, checkOut };
  }

  // FORMAT 2 (legacy): Check for ISO format with pipe separators (YYYY-MM-DD|YYYY-MM-DD|Display)
  if (text.includes('|')) {
    const parts = text.split('|');
    if (parts.length >= 2) {
      const checkIn = parts[0].trim();
      const checkOut = parts[1].trim();
      // Validate ISO date format
      if (/^\d{4}-\d{2}-\d{2}$/.test(checkIn) && /^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
        console.log('📅 [parseDateRangeOption] Parsed pipe format:', { checkIn, checkOut });
        return { checkIn, checkOut };
      }
    }
  }

  // LEGACY FORMAT: Parse human-readable dates
  // Split by en-dash (–) or spaced dash to separate start and end dates
  const segments = text.split(/\s*–\s*|\s+-\s+/).map((segment) => segment.trim()).filter(Boolean);
  console.log('📅 [parseDateRangeOption] Legacy segments:', segments);
  
  if (!segments.length) {
    return { checkIn: '', checkOut: '' };
  }

  const parseSegment = (segment: string, fallbackMonth?: string, fallbackYear?: number) => {
    let day: number | null = null;
    let month: string | undefined = fallbackMonth;
    let year = fallbackYear || new Date().getFullYear();

    // Format 1: "DD Mon YYYY" (e.g., "01 Jan 2026") - en-IN locale with spaces
    const ddMonYYYYSpaceMatch = segment.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
    if (ddMonYYYYSpaceMatch) {
      day = parseInt(ddMonYYYYSpaceMatch[1], 10);
      month = ddMonYYYYSpaceMatch[2];
      year = parseInt(ddMonYYYYSpaceMatch[3], 10);
      console.log('📅 [parseSegment] Matched DD Mon YYYY (spaces):', { day, month, year });
    } 
    // Format 2: "DD-Mon-YYYY" (e.g., "01-Jan-2026") - with hyphens
    else {
      const ddMonYYYYHyphenMatch = segment.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
      if (ddMonYYYYHyphenMatch) {
        day = parseInt(ddMonYYYYHyphenMatch[1], 10);
        month = ddMonYYYYHyphenMatch[2];
        year = parseInt(ddMonYYYYHyphenMatch[3], 10);
        console.log('📅 [parseSegment] Matched DD-Mon-YYYY (hyphens):', { day, month, year });
      } 
      // Format 3: Fallback - parse tokens
      else {
        const tokens = segment.split(/[\s,\-]+/).filter(Boolean);
        console.log('📅 [parseSegment] Fallback tokens:', tokens);
        for (const token of tokens) {
          // Check if it's a month name (3+ letters)
          if (token.match(/^[A-Za-z]{3,}$/)) {
            month = token;
          } else {
            const num = parseInt(token, 10);
            if (!Number.isNaN(num)) {
              if (num >= 1 && num <= 31) {
                day = num;
              } else if (num > 1900 && num < 2100) {
                year = num;
              }
            }
          }
        }
      }
    }

    const resolvedMonth = month || new Date().toLocaleString('en-US', { month: 'short' });
    if (!day) {
      console.log('📅 [parseSegment] Could not parse day from:', segment);
      return null;
    }

    // Create date string in a format JavaScript can parse
    const dateStr = `${resolvedMonth} ${day}, ${year}`;
    const date = new Date(dateStr);
    
    if (Number.isNaN(date.getTime())) {
      console.log('📅 [parseSegment] Invalid date:', dateStr);
      return null;
    }
    console.log('📅 [parseSegment] Parsed date:', date.toISOString().split('T')[0]);
    return { date, month: resolvedMonth, year };
  };

  const start = parseSegment(segments[0]);
  const end = segments[1] ? parseSegment(segments[1], start?.month, start?.year) : start;

  const toInput = (parsed: { date: Date } | null) => (parsed ? parsed.date.toISOString().split('T')[0] : '');

  const result = {
    checkIn: toInput(start),
    checkOut: toInput(end),
  };
  console.log('📅 [parseDateRangeOption] Result:', result);
  return result;
};

interface RoomType {
  id: string;
  name: string;
  description: string;
  maxOccupancy: number;
  basePrice: number;
  amenities: string[];
  image?: string;
}

const ROOM_TYPES: RoomType[] = [
  {
    id: 'standard',
    name: 'Standard Room',
    description: 'Comfortable room with essential amenities',
    maxOccupancy: 2,
    basePrice: 0, // No extra cost
    amenities: ['Free WiFi', 'AC', 'TV', 'Breakfast'],
  },
  {
    id: 'deluxe',
    name: 'Deluxe Room',
    description: 'Spacious room with premium amenities and city view',
    maxOccupancy: 3,
    basePrice: 1500, // Extra ₹1500 per night
    amenities: ['Free WiFi', 'AC', 'TV', 'Breakfast', 'Mini Bar', 'City View', 'Bath Tub'],
  },
  {
    id: 'suite',
    name: 'Executive Suite',
    description: 'Luxurious suite with living area and ocean view',
    maxOccupancy: 4,
    basePrice: 3500, // Extra ₹3500 per night
    amenities: ['Free WiFi', 'AC', 'TV', 'Breakfast', 'Mini Bar', 'Ocean View', 'Jacuzzi', 'Living Area', 'Butler Service'],
  },
];

export default function RoomSelection() {
  const { setStep, selectedHotel: storeSelectedHotel, destination: tripDestination, members, polls } = useTripStore();
  
  // Get the winning date from polls
  const datePoll = useMemo(() => polls.find(p => p.type === 'dates'), [polls]);
  const dateWinner = useMemo(() => getTopOption(datePoll), [datePoll]);
  const winningDates = useMemo(() => parseDateRangeOption(dateWinner?.text), [dateWinner]);
  
  // Get URL parameters for shared link mode
  const [urlParams, setUrlParams] = useState<URLSearchParams | null>(null);
  const [hotel, setHotel] = useState<any>(storeSelectedHotel || null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setUrlParams(params);
  }, []);

  useEffect(() => {
    if (!urlParams && !storeSelectedHotel) return;

    const hotelId = urlParams?.get('hotelId');
    if (hotelId) {
      const foundHotel = AVAILABLE_HOTELS.find((h: any) => h.id === hotelId);
      setHotel(foundHotel || storeSelectedHotel || null);
      return;
    }

    if (storeSelectedHotel) {
      setHotel(storeSelectedHotel);
    }
  }, [urlParams, storeSelectedHotel]);
  
  // Helper: Calculate required rooms based on adults (max 2 adults per room)
  const calculateRequiredRooms = (adultCount: number) => Math.max(1, Math.ceil(adultCount / 2));
  
  // State for room selection
  const [selectedRoomType, setSelectedRoomType] = useState<string>('standard');
  const [checkInDate, setCheckInDate] = useState<string>('');
  const [checkOutDate, setCheckOutDate] = useState<string>('');
  // Initialize adults with group member count (minimum 1)
  const initialAdults = Math.max(members.length, 1);
  const [adults, setAdults] = useState<number>(initialAdults);
  const [children, setChildren] = useState<number>(0);
  // Initialize rooms based on adults (max 2 adults per room)
  const [rooms, setRooms] = useState<number>(calculateRequiredRooms(initialAdults));
  
  // Update adults and rooms when members change
  useEffect(() => {
    if (members.length > 0) {
      setAdults(members.length);
      setRooms(calculateRequiredRooms(members.length));
      console.log(`🛏️ [RoomSelection] Auto-calculated rooms: ${calculateRequiredRooms(members.length)} for ${members.length} adults`);
    }
  }, [members.length]);
  
  // Auto-update rooms when adults count changes manually
  useEffect(() => {
    const requiredRooms = calculateRequiredRooms(adults);
    if (rooms < requiredRooms) {
      setRooms(requiredRooms);
      console.log(`🛏️ [RoomSelection] Adjusted rooms to ${requiredRooms} for ${adults} adults`);
    }
  }, [adults]);
  
  // Initialize dates from poll winning dates, URL params, or defaults
  useEffect(() => {
    console.log('📅 [RoomSelection] Date init effect running:', { 
      winningDates, 
      dateWinner: dateWinner?.text,
      urlParams: urlParams?.toString() 
    });
    
    // Priority 1: Use poll winning dates if available
    if (winningDates.checkIn && winningDates.checkOut) {
      setCheckInDate(winningDates.checkIn);
      setCheckOutDate(winningDates.checkOut);
      console.log('📅 [RoomSelection] Using poll winning dates:', winningDates);
      return;
    }
    
    // Priority 2: Use URL params
    if (urlParams) {
      const checkIn = urlParams.get('checkIn');
      const checkOut = urlParams.get('checkOut');
      const adultsParam = urlParams.get('adults');
      const childrenParam = urlParams.get('children');
      const roomsParam = urlParams.get('rooms');
      
      if (checkIn && checkOut) {
        setCheckInDate(checkIn);
        setCheckOutDate(checkOut);
        console.log('📅 [RoomSelection] Using URL params for dates');
        
        // Only use URL adults if no members in group
        if (adultsParam && members.length === 0) setAdults(parseInt(adultsParam));
        if (childrenParam) setChildren(parseInt(childrenParam));
        if (roomsParam) setRooms(parseInt(roomsParam));
        return;
      }
    }

    // Priority 3: Use defaults
    const defaultCheckIn = new Date();
    defaultCheckIn.setDate(defaultCheckIn.getDate() + 7);
    const defaultCheckOut = new Date();
    defaultCheckOut.setDate(defaultCheckOut.getDate() + 10);
    
    setCheckInDate(defaultCheckIn.toISOString().split('T')[0]);
    setCheckOutDate(defaultCheckOut.toISOString().split('T')[0]);
    console.log('📅 [RoomSelection] Using default dates');
  }, [urlParams, winningDates.checkIn, winningDates.checkOut]);
  
  // Calculate nights
  const nights = checkInDate && checkOutDate 
    ? Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  // Calculate pricing
  const selectedRoom = ROOM_TYPES.find(r => r.id === selectedRoomType);
  const hotelBasePrice = hotel?.price || 3500;
  const roomExtraCharge = (selectedRoom?.basePrice || 0) * nights * rooms;
  const basePrice = (hotelBasePrice * nights * rooms) + roomExtraCharge;
  const taxRate = 0.12;
  const taxes = basePrice * taxRate;
  const totalPrice = basePrice + taxes;
  
  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];
  
  const handleProceedToCheckout = () => {
    // Set selected hotel in store for GuestPaymentScreen
    if (hotel) {
      useTripStore.setState({ selectedHotel: { ...hotel, votes: {} } });
    }
    
    // Store selection in URL params for GuestPaymentScreen
    const params = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
    params.set('roomType', selectedRoomType);
    params.set('checkIn', checkInDate);
    params.set('checkOut', checkOutDate);
    params.set('adults', adults.toString());
    params.set('children', children.toString());
    params.set('rooms', rooms.toString());
    if (hotel?.location || tripDestination) {
      params.set('destination', hotel?.location || tripDestination || '');
    }
    
    // Navigate to guest payment with params
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `?${params.toString()}`);
    }
    setStep('guest-payment');
  };
  
  const handleChangeHotel = () => {
    // Navigate back to hotel selection with current hotel pre-selected
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('step', 'hotels');
      window.history.pushState({}, '', `?${params.toString()}`);
    }
    setStep('hotels');
  };
  
  if (!hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading hotel details...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Complete Your Booking</h1>
              <p className="text-sm text-gray-600 mt-1">Select room type and customize your stay</p>
            </div>
            <button
              onClick={handleChangeHotel}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition"
            >
              <Hotel className="w-4 h-4" />
              Change Hotel
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hotel Info Card */}
            <motion.div
              className="bg-white rounded-xl shadow-sm overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="relative h-64">
                <img
                  src={hotel.image || `https://source.unsplash.com/800x600/?hotel,${hotel.name.replace(/\s/g, '+')}`}
                  alt={hotel.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">{hotel.rating}</span>
                </div>
              </div>
              
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{hotel.name}</h2>
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <MapPin className="w-4 h-4" />
                  <span>{hotel.location}</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {hotel.amenities.slice(0, 6).map((amenity: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
            
            {/* Stay Details */}
            <motion.div
              className="bg-white rounded-xl shadow-sm p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Stay Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Check-in Date
                  </label>
                  <input
                    type="date"
                    value={checkInDate}
                    min={today}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Check-out Date
                  </label>
                  <input
                    type="date"
                    value={checkOutDate}
                    min={checkInDate || today}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {nights > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                  <p className="text-sm font-medium text-blue-900">
                    {nights} night{nights !== 1 ? 's' : ''} • {checkInDate && new Date(checkInDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {checkOutDate && new Date(checkOutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-2" />
                    Adults
                  </label>
                  <input
                    type="number"
                    value={adults}
                    min={1}
                    max={10}
                    onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Children</label>
                  <input
                    type="number"
                    value={children}
                    min={0}
                    max={10}
                    onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rooms</label>
                  <input
                    type="number"
                    value={rooms}
                    min={calculateRequiredRooms(adults)}
                    max={5}
                    onChange={(e) => setRooms(Math.max(calculateRequiredRooms(adults), parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {adults > 2 && (
                    <p className="text-xs text-blue-600 mt-1">
                      Min {calculateRequiredRooms(adults)} rooms for {adults} adults
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
            
            {/* Room Type Selection */}
            <motion.div
              className="bg-white rounded-xl shadow-sm p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Select Room Type</h3>
              
              <div className="space-y-4">
                {ROOM_TYPES.map((room) => (
                  <motion.div
                    key={room.id}
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                      selectedRoomType === room.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedRoomType(room.id)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-bold text-gray-900">{room.name}</h4>
                          {selectedRoomType === room.id && (
                            <Check className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{room.description}</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {room.amenities.map((amenity, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500">Max Occupancy: {room.maxOccupancy} guests</p>
                      </div>
                      
                      <div className="text-right ml-4">
                        {room.basePrice === 0 ? (
                          <p className="text-lg font-bold text-green-600">Included</p>
                        ) : (
                          <>
                            <p className="text-xs text-gray-500 mb-1">+₹{room.basePrice}/night</p>
                            <p className="text-lg font-bold text-gray-900">
                              ₹{((hotelBasePrice + room.basePrice) * nights * rooms).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">for {nights} night{nights !== 1 ? 's' : ''}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
          
          {/* Price Summary Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              className="bg-white rounded-xl shadow-lg p-6 sticky top-24"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Price Summary</h3>
              
              <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Room × {rooms} × {nights} night{nights !== 1 ? 's' : ''}</span>
                  <span className="font-medium">₹{(hotelBasePrice * nights * rooms).toLocaleString()}</span>
                </div>
                
                {selectedRoom && selectedRoom.basePrice > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{selectedRoom.name} upgrade</span>
                    <span className="font-medium text-blue-600">+₹{roomExtraCharge.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Taxes & Fees (12%)</span>
                  <span className="font-medium">₹{taxes.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-bold text-gray-900">Total Amount</span>
                <span className="text-2xl font-bold text-blue-600">₹{Math.round(totalPrice).toLocaleString()}</span>
              </div>
              
              <button
                onClick={handleProceedToCheckout}
                disabled={!checkInDate || !checkOutDate || nights <= 0}
                className="w-full bg-gradient-to-r from-[#0071c2] to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-[#005fa3] hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Proceed to Checkout
              </button>
              
              <div className="mt-4 space-y-2 text-xs text-gray-500">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Free cancellation up to 24 hours before check-in</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>No hidden charges or booking fees</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Instant confirmation via email & SMS</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
