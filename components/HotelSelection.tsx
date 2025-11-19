'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MapPin, Check, X } from 'lucide-react';
import { Hotel } from '@/lib/store';

// Mock hotel data - In production, this would come from an API
const AVAILABLE_HOTELS: Omit<Hotel, 'votes'>[] = [
  {
    id: 'hotel1',
    name: 'Taj Exotica Resort & Spa',
    image: '🏨',
    location: 'Calangute',
    price: 8500,
    rating: 4.8,
    amenities: ['pool', 'spa', 'beach', 'restaurant', 'wifi'],
    highlights: [
      'Near Calangute Beach, stunning pool area surrounded by lush greenery',
      'Rooms with pool views',
      'Couple Friendly'
    ],
  },
  {
    id: 'hotel2',
    name: 'The Leela Goa',
    image: '🏖️',
    location: 'Bambolim Beach',
    price: 7200,
    rating: 4.6,
    amenities: ['pool', 'beach', 'gym', 'restaurant', 'wifi'],
    highlights: [
      'Book with ₹0 Payment',
      'Breakfast Included',
      'Breathtaking beach, private access for peaceful retreats'
    ],
  },
  {
    id: 'hotel3',
    name: 'Alila Diwa Goa',
    image: '🌴',
    location: 'Majorda Beach',
    price: 9100,
    rating: 4.7,
    amenities: ['pool', 'spa', 'gym', 'restaurant', 'wifi'],
    highlights: [
      'Luxurious beachfront property',
      'Award-winning spa',
      'Fine dining restaurants'
    ],
  },
  {
    id: 'hotel4',
    name: 'Grand Hyatt Goa',
    image: '🏝️',
    location: 'Bambolim',
    price: 8800,
    rating: 4.5,
    amenities: ['pool', 'beach', 'spa', 'gym', 'wifi'],
    highlights: [
      'Sprawling resort with multiple pools',
      'Direct beach access',
      'Kids club available'
    ],
  },
  {
    id: 'hotel5',
    name: 'Park Hyatt Goa Resort',
    image: '🌊',
    location: 'Arossim Beach',
    price: 7800,
    rating: 4.9,
    amenities: ['pool', 'beach', 'spa', 'restaurant', 'wifi'],
    highlights: [
      'Serene beachfront location',
      'Elegant Portuguese architecture',
      'World-class dining'
    ],
  },
  {
    id: 'hotel6',
    name: 'ITC Grand Goa Resort',
    image: '🏰',
    location: 'Arossim',
    price: 9500,
    rating: 4.8,
    amenities: ['pool', 'spa', 'gym', 'restaurant', 'wifi'],
    highlights: [
      'Indo-Portuguese architecture',
      'Kaya Kalp spa',
      'Multiple dining options'
    ],
  },
  {
    id: 'hotel7',
    name: 'Novotel Goa Dona Sylvia Resort',
    image: '🌺',
    location: 'Cavelossim Beach',
    price: 6500,
    rating: 4.4,
    amenities: ['pool', 'beach', 'gym', 'restaurant', 'wifi'],
    highlights: [
      'Family-friendly resort',
      'Beachfront location',
      'Water sports available'
    ],
  },
  {
    id: 'hotel8',
    name: 'Cidade de Goa',
    image: '🏛️',
    location: 'Vainguinim Beach',
    price: 7000,
    rating: 4.5,
    amenities: ['pool', 'beach', 'spa', 'restaurant', 'wifi'],
    highlights: [
      'Portuguese-style architecture',
      'Private beach',
      'Ayurvedic spa'
    ],
  },
];

interface HotelSelectionProps {
  destination: string;
  onShareShortlist: (hotels: Hotel[]) => void;
}

export default function HotelSelection({ destination, onShareShortlist }: HotelSelectionProps) {
  const [selectedHotels, setSelectedHotels] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'popular' | 'price-low' | 'price-high' | 'rating'>('popular');

  const toggleHotel = (hotelId: string) => {
    const newSelected = new Set(selectedHotels);
    if (newSelected.has(hotelId)) {
      newSelected.delete(hotelId);
    } else {
      if (newSelected.size >= 5) {
        alert('You can only shortlist up to 5 hotels');
        return;
      }
      newSelected.add(hotelId);
    }
    setSelectedHotels(newSelected);
  };

  const handleShareShortlist = () => {
    if (selectedHotels.size === 0) {
      alert('Please select at least one hotel');
      return;
    }

    const shortlistedHotels: Hotel[] = AVAILABLE_HOTELS
      .filter(h => selectedHotels.has(h.id))
      .map(h => ({ ...h, votes: {} }));

    onShareShortlist(shortlistedHotels);
  };

  // Sort hotels
  const sortedHotels = [...AVAILABLE_HOTELS].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - MakeMyTrip Style */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {AVAILABLE_HOTELS.length} Properties in {destination}
            </h1>
            <button
              onClick={handleShareShortlist}
              disabled={selectedHotels.size === 0}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                selectedHotels.size > 0
                  ? 'bg-gradient-to-r from-[#0071c2] to-purple-600 text-white hover:from-[#005fa3] hover:to-purple-700 shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Share Shortlist ({selectedHotels.size}/5)
            </button>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-700">SORT BY</span>
            <div className="flex gap-2">
              {[
                { value: 'popular', label: 'Popular' },
                { value: 'rating', label: 'User Rating (Highest First)' },
                { value: 'price-high', label: 'Price (Highest First)' },
                { value: 'price-low', label: 'Price (Lowest First)' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    sortBy === option.value
                      ? 'bg-[#0071c2] text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:border-[#0071c2]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar - Filters (Visual only for now) */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4">Filters</h3>
              
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Price per night</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>₹0 - ₹2000 <span className="text-gray-400">(0)</span></div>
                  <div>₹2000 - ₹4000 <span className="text-gray-400">(0)</span></div>
                  <div>₹4000 - ₹6000 <span className="text-gray-400">(0)</span></div>
                  <div>₹6000 - ₹8000 <span className="text-gray-400">(3)</span></div>
                  <div>₹8000+ <span className="text-gray-400">(5)</span></div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Star Category</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>5 Star <span className="text-gray-400">(8)</span></div>
                  <div>4 Star <span className="text-gray-400">(0)</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Hotel List */}
          <div className="flex-1 space-y-4">
            <AnimatePresence>
              {sortedHotels.map((hotel, index) => {
                const isSelected = selectedHotels.has(hotel.id);
                
                return (
                  <motion.div
                    key={hotel.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden ${
                      isSelected ? 'ring-2 ring-[#0071c2]' : ''
                    }`}
                  >
                    <div className="flex gap-4 p-4">
                      {/* Hotel Image */}
                      <div className="w-48 h-40 flex-shrink-0 bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg flex items-center justify-center text-6xl">
                        {hotel.image}
                      </div>

                      {/* Hotel Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                              {hotel.name}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="w-4 h-4" />
                              <span>{hotel.location}</span>
                              <span className="text-gray-400">|</span>
                              <span>7 minutes walk to {hotel.location} Beach</span>
                            </div>
                          </div>

                          {/* Selection Button */}
                          <button
                            onClick={() => toggleHotel(hotel.id)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                              isSelected
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-[#0071c2] text-white hover:bg-[#005fa3]'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-4 h-4" />
                                Selected
                              </>
                            ) : (
                              'Add to Shortlist'
                            )}
                          </button>
                        </div>

                        {/* Highlights */}
                        <div className="space-y-1 mb-3">
                          {hotel.highlights.map((highlight, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="text-green-600 mt-0.5">✓</span>
                              <span>{highlight}</span>
                            </div>
                          ))}
                        </div>

                        {/* Amenities */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {hotel.amenities.slice(0, 4).map((amenity) => (
                            <span
                              key={amenity}
                              className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700"
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Price & Rating */}
                      <div className="w-40 flex-shrink-0 text-right">
                        <div className="inline-flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded-lg mb-2">
                          <Star className="w-4 h-4 fill-white" />
                          <span className="font-bold">{hotel.rating}</span>
                        </div>
                        <div className="text-xs text-gray-600 mb-4">
                          ({Math.floor(Math.random() * 1000) + 500} Ratings)
                        </div>

                        <div className="text-2xl font-bold text-[#0071c2] mb-1">
                          ₹{hotel.price.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600">
                          + ₹{Math.floor(hotel.price * 0.12).toLocaleString()} Taxes & Fees
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Per Night</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
