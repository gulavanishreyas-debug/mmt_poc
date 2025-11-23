'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MapPin, Check, X, Heart } from 'lucide-react';
import { Hotel, Poll, PollOption, useTripStore } from '@/lib/store';

const AMENITY_SYNONYMS: Record<string, string> = {
  wifi: 'wifi',
  wifihotspot: 'wifi',
  freewifi: 'wifi',
  highspeedinternet: 'wifi',
  internet: 'wifi',
  pool: 'pool',
  swimmingpool: 'pool',
  spa: 'spa',
  gym: 'gym',
  fitnesscenter: 'gym',
  restaurant: 'restaurant',
  dining: 'restaurant',
  breakfast: 'breakfast',
  beach: 'beach',
  beachaccess: 'beach',
  parking: 'parking',
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi',
  breakfast: 'Breakfast',
  pool: 'Pool',
  spa: 'Spa',
  restaurant: 'Restaurant',
  gym: 'Gym',
  beach: 'Beach Access',
  parking: 'Parking',
};

const DEFAULT_MAX_PRICE = 100000;

const canonicalAmenity = (value: string) => {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normalized) return '';
  return AMENITY_SYNONYMS[normalized] || normalized;
};

const formatAmenityLabel = (key: string) => {
  if (!key) return '';
  return AMENITY_LABELS[key] || `${key.charAt(0).toUpperCase()}${key.slice(1)}`;
};

const formatAmenityList = (keys: string[]) => keys.map(formatAmenityLabel).filter(Boolean).join(' + ');

const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN')}`;

const parseBudgetRange = (text?: string) => {
  if (!text) {
    return { min: 0, max: DEFAULT_MAX_PRICE, label: 'Any budget' };
  }

  const matches = text.match(/\d{1,3}(?:,\d{3})*/g);
  if (!matches?.length) {
    return { min: 0, max: DEFAULT_MAX_PRICE, label: text };
  }

  const parsed = matches
    .map((match) => parseInt(match.replace(/,/g, ''), 10))
    .filter((num) => !Number.isNaN(num));
  if (!parsed.length) {
    return { min: 0, max: DEFAULT_MAX_PRICE, label: text };
  }

  const min = Math.max(0, parsed[0]);
  let max = parsed[1] ?? parsed[0] + 10000;
  if (text.includes('+')) {
    max = DEFAULT_MAX_PRICE;
  }
  if (max < min) {
    max = min;
  }

  return {
    min: Math.min(min, DEFAULT_MAX_PRICE),
    max: Math.min(Math.max(max, min), DEFAULT_MAX_PRICE),
    label: text,
  };
};

const parseDateRangeOption = (text?: string) => {
  if (!text) {
    return { checkIn: '', checkOut: '', label: '' };
  }

  const segments = text.split('-').map((segment) => segment.trim()).filter(Boolean);
  if (!segments.length) {
    return { checkIn: '', checkOut: '', label: '' };
  }

  const start = parseDateSegment(segments[0]);
  const end = segments[1] ? parseDateSegment(segments[1], start.month) : start;

  const toInput = (date: Date | null) => (date ? date.toISOString().split('T')[0] : '');

  return {
    checkIn: toInput(start.date),
    checkOut: toInput(end.date),
    label: text,
  };
};

const parseDateSegment = (segment: string, fallbackMonth?: string) => {
  const tokens = segment.split(' ').filter(Boolean);
  let month = fallbackMonth;
  let dayToken = tokens[tokens.length - 1] || '';
  if (tokens.length > 1) {
    month = tokens.slice(0, tokens.length - 1).join(' ');
  }
  const day = parseInt(dayToken.replace(/[^0-9]/g, ''), 10);
  const resolvedMonth = month || new Date().toLocaleString('en-US', { month: 'short' });
  if (!day || !resolvedMonth) {
    return { date: null, month: resolvedMonth };
  }
  const date = new Date(`${resolvedMonth} ${day}, ${new Date().getFullYear()}`);
  if (Number.isNaN(date.getTime())) {
    return { date: null, month: resolvedMonth };
  }
  return { date, month: resolvedMonth };
};

const buildBannerMessage = (dateText?: string, budgetText?: string, amenityLabels?: string[]) => {
  const segments: string[] = [];
  if (dateText) segments.push(dateText);
  if (budgetText) segments.push(budgetText);
  if (amenityLabels?.length) segments.push(amenityLabels.join(' + '));
  if (!segments.length) return '';
  return `Filters applied from group consensus: ${segments.join(', ')}`;
};

const getTopOptions = (poll?: Poll, allowMultiple = false): PollOption[] => {
  if (!poll || !poll.options.length) return [];
  const maxVotes = Math.max(...poll.options.map((option) => option.votes.length));
  if (maxVotes === 0) return [];
  const winners = poll.options.filter((option) => option.votes.length === maxVotes);
  return allowMultiple ? winners : [winners[0]];
};

const formatDateChip = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

interface HotelConsensusEntry {
  hotel: Omit<Hotel, 'votes'>;
  count: number;
  percentage: number;
}

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
      'Couple Friendly',
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
      'Breathtaking beach, private access for peaceful retreats',
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
      'Fine dining restaurants',
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
      'Kids club available',
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
      'World-class dining',
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
      'Multiple dining options',
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
      'Water sports available',
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
      'Ayurvedic spa',
    ],
  },
];

const AVAILABLE_AMENITY_KEYS = Array.from(
  new Set(AVAILABLE_HOTELS.flatMap((hotel) => hotel.amenities.map((amenity) => canonicalAmenity(amenity))))
);

interface HotelSelectionProps {
  destination: string;
  onShareShortlist: (hotels: Hotel[]) => void;
}

export default function HotelSelection({ destination, onShareShortlist }: HotelSelectionProps) {
  const polls = useTripStore((state) => state.polls);
  const shortlistedHotels = useTripStore((state) => state.shortlistedHotels);
  const [selectedHotels, setSelectedHotels] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'popular' | 'price-low' | 'price-high' | 'rating'>('popular');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [priceRange, setPriceRange] = useState({ min: 0, max: DEFAULT_MAX_PRICE });
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [bannerMessage, setBannerMessage] = useState('');
  const [showBanner, setShowBanner] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  const userTouchedFiltersRef = useRef(false);
  const lastConsensusKeyRef = useRef('');
  const prevFilteredCountRef = useRef<number>(AVAILABLE_HOTELS.length);

  const budgetPoll = polls.find((poll) => poll.type === 'budget');
  const datePoll = polls.find((poll) => poll.type === 'dates');
  const amenitiesPoll = polls.find((poll) => poll.type === 'amenities');

  const budgetWinner = useMemo(() => getTopOptions(budgetPoll)[0], [budgetPoll]);
  const dateWinner = useMemo(() => getTopOptions(datePoll)[0], [datePoll]);
  const amenitiesWinnerKeys = useMemo(
    () =>
      getTopOptions(amenitiesPoll, true)
        .map((option) => canonicalAmenity(option.text))
        .filter((amenity) => AVAILABLE_AMENITY_KEYS.includes(amenity)),
    [amenitiesPoll]
  );

  const parsedDateRange = useMemo(() => parseDateRangeOption(dateWinner?.text), [dateWinner?.text]);
  const parsedBudgetRange = useMemo(() => parseBudgetRange(budgetWinner?.text), [budgetWinner?.text]);
  const amenitiesKeyString = amenitiesWinnerKeys.join(',');
  const consensusLabel = useMemo(() => {
    const labels = amenitiesWinnerKeys.map(formatAmenityLabel).filter(Boolean);
    return buildBannerMessage(dateWinner?.text, budgetWinner?.text, labels);
  }, [dateWinner?.text, budgetWinner?.text, amenitiesKeyString]);
  const consensusKey = `${parsedBudgetRange.min}-${parsedBudgetRange.max}-${parsedDateRange.checkIn}-${parsedDateRange.checkOut}-${amenitiesKeyString}-${consensusLabel}`;

  const hotelConsensus = useMemo(() => {
    const voteCounts = shortlistedHotels.reduce<Record<string, number>>((acc, hotel) => {
      const count = Object.values(hotel.votes || {}).length;
      acc[hotel.id] = count;
      return acc;
    }, {});

    const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
    const entries: HotelConsensusEntry[] = AVAILABLE_HOTELS.map((hotel) => {
      const count = voteCounts[hotel.id] ?? 0;
      const percentage = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
      return { hotel, count, percentage };
    }).sort((a, b) => b.count - a.count);

    const maxCount = entries.length ? Math.max(...entries.map((entry) => entry.count)) : 0;
    const topHotels = maxCount > 0 ? entries.filter((entry) => entry.count === maxCount).map((entry) => entry.hotel) : [];

    return {
      entries,
      topHotels,
      totalVotes,
    };
  }, [shortlistedHotels]);

  useEffect(() => {
    if (userTouchedFiltersRef.current) return;
    setPriceRange({ min: parsedBudgetRange.min, max: parsedBudgetRange.max });
    setCheckIn(parsedDateRange.checkIn);
    setCheckOut(parsedDateRange.checkOut);
    setSelectedAmenities(amenitiesWinnerKeys);
    setBannerMessage(consensusLabel);
    setShowBanner(Boolean(consensusLabel));

    if (consensusLabel && lastConsensusKeyRef.current !== consensusKey) {
      console.log('📡 [HotelSelection] Consensus filters applied', {
        checkIn: parsedDateRange.checkIn,
        checkOut: parsedDateRange.checkOut,
        priceRange: parsedBudgetRange,
        amenities: amenitiesWinnerKeys,
      });
      lastConsensusKeyRef.current = consensusKey;
    }
  }, [consensusKey, consensusLabel, parsedBudgetRange, parsedDateRange, amenitiesWinnerKeys]);

  useEffect(() => {
    if (!bannerMessage) {
      setShowBanner(false);
      return;
    }
    setShowBanner(true);
    const timer = setTimeout(() => setShowBanner(false), 6000);
    return () => clearTimeout(timer);
  }, [bannerMessage]);

  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => setIsFiltering(false), 250);
    return () => clearTimeout(timer);
  }, [checkIn, checkOut, priceRange.min, priceRange.max, selectedAmenities.join(','), sortBy]);

  useEffect(() => {
    if (!userTouchedFiltersRef.current) return;
    console.log('📡 [HotelSelection] Filters updated', {
      checkIn,
      checkOut,
      priceRange,
      selectedAmenities,
    });
  }, [checkIn, checkOut, priceRange, selectedAmenities]);

  const filteredHotels = useMemo(() => {
    const minPrice = Math.min(priceRange.min, priceRange.max);
    const maxPrice = Math.max(priceRange.min, priceRange.max);

    return AVAILABLE_HOTELS.filter((hotel) => {
      if (hotel.price < minPrice || hotel.price > maxPrice) {
        return false;
      }
      if (selectedAmenities.length === 0) {
        return true;
      }
      const hotelAmenities = hotel.amenities.map((amenity) => canonicalAmenity(amenity));
      return selectedAmenities.every((amenity) => hotelAmenities.includes(amenity));
    });
  }, [priceRange, selectedAmenities]);

  useEffect(() => {
    if (filteredHotels.length === 0 && prevFilteredCountRef.current !== 0) {
      console.log('📡 [HotelSelection] No hotels match current filters', {
        priceRange,
        selectedAmenities,
        checkIn,
        checkOut,
      });
    }
    prevFilteredCountRef.current = filteredHotels.length;
  }, [filteredHotels.length, priceRange, selectedAmenities, checkIn, checkOut]);

  const sortedHotels = useMemo(() => {
    const list = [...filteredHotels];
    switch (sortBy) {
      case 'price-low':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      default:
        break;
    }
    return list;
  }, [filteredHotels, sortBy]);

  const activeFilterChips = useMemo(() => {
    const chips: { id: string; label: string }[] = [];
    if (checkIn && checkOut) {
      const label = `${formatDateChip(checkIn)} – ${formatDateChip(checkOut)}`;
      if (label.trim()) {
        chips.push({ id: 'dates', label });
      }
    }
    if (priceRange.min > 0 || priceRange.max < DEFAULT_MAX_PRICE) {
      chips.push({
        id: 'budget',
        label: `Budget: ${formatCurrency(priceRange.min)} – ${formatCurrency(priceRange.max)}`,
      });
    }
    if (selectedAmenities.length) {
      chips.push({ id: 'amenities', label: formatAmenityList(selectedAmenities) });
    }
    return chips;
  }, [checkIn, checkOut, priceRange, selectedAmenities]);

  const handleMinPriceChange = (value: string) => {
    userTouchedFiltersRef.current = true;
    const minValue = Number(value);
    setPriceRange((prev) => ({
      min: Number.isNaN(minValue) ? 0 : Math.max(0, Math.min(minValue, DEFAULT_MAX_PRICE)),
      max: Math.max(prev.max, Number.isNaN(minValue) ? 0 : minValue),
    }));
  };

  const handleMaxPriceChange = (value: string) => {
    userTouchedFiltersRef.current = true;
    const maxValue = Number(value);
    setPriceRange((prev) => ({
      min: prev.min,
      max: Number.isNaN(maxValue)
        ? DEFAULT_MAX_PRICE
        : Math.max(prev.min, Math.min(maxValue, DEFAULT_MAX_PRICE)),
    }));
  };

  const handleAmenityToggle = (amenity: string) => {
    userTouchedFiltersRef.current = true;
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((value) => value !== amenity) : [...prev, amenity]
    );
  };

  const handleCheckInChange = (value: string) => {
    userTouchedFiltersRef.current = true;
    setCheckIn(value);
  };

  const handleCheckOutChange = (value: string) => {
    userTouchedFiltersRef.current = true;
    setCheckOut(value);
  };

  const handleClearFilters = () => {
    userTouchedFiltersRef.current = true;
    setPriceRange({ min: 0, max: DEFAULT_MAX_PRICE });
    setSelectedAmenities([]);
    setCheckIn('');
    setCheckOut('');
    setBannerMessage('Filters cleared.');
    setShowBanner(true);
    console.log('📡 [HotelSelection] Filters cleared');
  };

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

    const shortlistedHotels: Hotel[] = AVAILABLE_HOTELS.filter((hotel) => selectedHotels.has(hotel.id)).map(
      (hotel) => ({ ...hotel, votes: {} })
    );

    onShareShortlist(shortlistedHotels);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {sortedHotels.length} Properties in {destination}
              </h1>
              <p className="text-sm text-gray-500">
                {isFiltering ? 'Applying filters…' : `${filteredHotels.length} options match your filters.`}
              </p>
            </div>
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
          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
              {activeFilterChips.map((chip) => (
                <span key={chip.id} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {chip.label}
                </span>
              ))}
              <button
                onClick={handleClearFilters}
                className="ml-auto text-[11px] font-semibold text-[#0071c2] hover:text-[#005fa3]"
              >
                Clear all
              </button>
            </div>
          )}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-semibold text-gray-700">SORT BY</span>
            <div className="flex gap-2 flex-wrap">
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

      {showBanner && bannerMessage && (
        <div className="max-w-7xl mx-auto px-4 mt-4" role="status" aria-live="polite">
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-900 rounded-lg px-4 py-2 shadow-sm">
            <p className="text-sm font-medium">{bannerMessage}</p>
            <button onClick={() => setShowBanner(false)} aria-label="Dismiss banner">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <div className="w-64 flex-shrink-0 space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-24 space-y-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Filters</h3>
                <button
                  onClick={handleClearFilters}
                  className="text-xs text-[#0071c2] hover:text-[#005fa3]"
                  aria-label="Clear all filters"
                >
                  Clear
                </button>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Travel Dates</p>
                <div className="space-y-2 text-sm">
                  <label className="block">
                    <span className="text-gray-600">Check-in</span>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => handleCheckInChange(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071c2]"
                      aria-label="Filter by check-in date"
                    />
                  </label>
                  <label className="block">
                    <span className="text-gray-600">Check-out</span>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => handleCheckOutChange(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0071c2]"
                      aria-label="Filter by check-out date"
                    />
                  </label>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Budget (per night)</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label className="block">
                    <span className="text-gray-600">Min</span>
                    <input
                      type="number"
                      value={priceRange.min}
                      min={0}
                      max={DEFAULT_MAX_PRICE}
                      onChange={(e) => handleMinPriceChange(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071c2]"
                      aria-label="Minimum budget per night"
                    />
                  </label>
                  <label className="block">
                    <span className="text-gray-600">Max</span>
                    <input
                      type="number"
                      value={priceRange.max}
                      min={0}
                      max={DEFAULT_MAX_PRICE}
                      onChange={(e) => handleMaxPriceChange(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0071c2]"
                      aria-label="Maximum budget per night"
                    />
                  </label>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Amenities</p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_AMENITY_KEYS.map((amenity) => {
                    const isSelected = selectedAmenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        onClick={() => handleAmenityToggle(amenity)}
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                          isSelected
                            ? 'bg-[#0071c2] text-white border-[#0071c2]'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-[#0071c2]'
                        }`}
                      >
                        {formatAmenityLabel(amenity)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            {sortedHotels.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-dashed border-gray-300 p-6 text-center">
                <p className="text-lg font-semibold text-gray-900 mb-2">No hotels match current filters.</p>
                <p className="text-sm text-gray-600 mb-4">
                  Try widening the budget, moving dates, or removing some amenities so more options appear.
                </p>
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 rounded-lg bg-[#0071c2] text-white text-sm font-semibold hover:bg-[#005fa3]"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <AnimatePresence>
                {sortedHotels.map((hotel, index) => {
                  const isSelected = selectedHotels.has(hotel.id);
                  return (
                    <motion.div
                      key={hotel.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all relative overflow-hidden ${
                        isSelected ? 'ring-2 ring-[#0071c2]' : ''
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-4 left-4 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#0071c2] shadow">
                          <Heart className="w-4 h-4 text-red-500" />
                          <span>You liked this</span>
                        </div>
                      )}
                      <div className="flex gap-4 p-4">
                        <div className="w-48 h-40 flex-shrink-0 bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg flex items-center justify-center text-6xl">
                          {hotel.image}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 mb-1">{hotel.name}</h3>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MapPin className="w-4 h-4" />
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
                        <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-gray-500">
                          <span>Live Hotel Consensus</span>
                          <span>{hotelConsensus.totalVotes} votes</span>
                        </div>
                        {hotelConsensus.totalVotes > 0 ? (
                          <>
                            <p className="text-sm font-semibold text-gray-900">
                              Top pick{hotelConsensus.topHotels.length > 1 ? 's' : ''}: {hotelConsensus.topHotels.map((hotel) => hotel.name).join(', ')}
                            </p>
                            <div className="space-y-2">
                              {hotelConsensus.entries.slice(0, 3).map((entry) => (
                                <div key={entry.hotel.id} className="flex items-center gap-3 text-xs">
                                  <span className="font-semibold text-gray-700 w-28 truncate">{entry.hotel.name}</span>
                                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-[#0071c2] to-purple-600"
                                      style={{ width: `${entry.percentage}%` }}
                                    />
                                  </div>
                                  <span className="w-10 text-right font-semibold text-gray-700">{entry.percentage}%</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">
                            No votes yet. Pick a few hotels to ignite the group consensus without crowding the cards.
                          </p>
                        )}
                      </div>
                                <span>{hotel.location}</span>
                                <span className="text-gray-400">|</span>
                                <span>7 minutes walk to {hotel.location} Beach</span>
                              </div>
                            </div>
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

                          <div className="space-y-1 mb-3 text-sm text-gray-700">
                            {hotel.highlights.map((highlight, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">✓</span>
                                <span>{highlight}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-wrap gap-2 mb-3">
                            {hotel.amenities.map((amenity) => (
                              <span
                                key={amenity}
                                className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700"
                              >
                                {formatAmenityLabel(canonicalAmenity(amenity))}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="w-40 flex-shrink-0 text-right">
                          <div className="inline-flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded-lg mb-2">
                            <Star className="w-4 h-4 fill-white" />
                            <span className="font-bold">{hotel.rating}</span>
                          </div>
                          <div className="text-xs text-gray-600 mb-4">({Math.floor(Math.random() * 1000) + 500} Ratings)</div>
                          <div className="text-2xl font-bold text-[#0071c2] mb-1">₹{hotel.price.toLocaleString()}</div>
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
