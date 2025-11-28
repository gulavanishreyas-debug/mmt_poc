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

const createHotel = (hotel: Omit<Hotel, 'votes'> & { amenities: string[] }): Omit<Hotel, 'votes'> => ({
  ...hotel,
  amenities: hotel.amenities.map((amenity) => canonicalAmenity(amenity)).filter(Boolean),
});

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

export const AVAILABLE_HOTELS: Omit<Hotel, 'votes'>[] = [
  // Comfort tier ₹5k – ₹7k
  createHotel({
    id: 'comfort-01',
    name: 'Lagoon Leaf Retreat',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    location: 'Candolim',
    price: 5200,
    rating: 4.2,
    amenities: ['wifi', 'breakfast', 'pool', 'parking'],
    highlights: [
      'Steps away from Candolim market',
      'Organic breakfast bowls each morning',
      'Private access to a shaded splash pool',
    ],
  }),
  createHotel({
    id: 'comfort-02',
    name: 'Palm Grove Courtyard',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',
    location: 'Baga',
    price: 5600,
    rating: 4.3,
    amenities: ['wifi', 'beach', 'restaurant'],
    highlights: [
      'Family rooms with workstation corners',
      'Complimentary beach shuttles every hour',
      'Evening acoustic sessions in the courtyard',
    ],
  }),
  createHotel({
    id: 'comfort-03',
    name: 'Sunset Cove Residency',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
    location: 'Colva',
    price: 5900,
    rating: 4.1,
    amenities: ['wifi', 'pool', 'spa'],
    highlights: [
      'Rooftop infinity plunge pool overlooking the sea',
      'Hearty Goan breakfast spreads',
      'Dedicated travel desk for spice plantation tours',
    ],
  }),
  createHotel({
    id: 'comfort-04',
    name: 'Spice Route Hideaway',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
    location: 'Panjim',
    price: 6100,
    rating: 4.4,
    amenities: ['wifi', 'parking', 'restaurant', 'gym'],
    highlights: [
      'Courtyard cafe serving artisanal coffee',
      'Complimentary city cycling trails with guide',
      'Evening yoga + spa unwind sessions',
    ],
  }),
  createHotel({
    id: 'comfort-05',
    name: 'Riverbend Garden Suites',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
    location: 'Nerul',
    price: 6400,
    rating: 4.0,
    amenities: ['wifi', 'breakfast', 'pool', 'beach', 'parking'],
    highlights: [
      'Suites open to a lush riverside promenade',
      'Mini theatre nights for the group',
      'All-day snack bar with healthy plates',
    ],
  }),
  createHotel({
    id: 'comfort-06',
    name: 'Coastal Comfort Inn',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
    location: 'Dona Paula',
    price: 6900,
    rating: 4.2,
    amenities: ['wifi', 'spa', 'restaurant', 'pool'],
    highlights: [
      'Panoramic Dona Paula viewpoint decks',
      'Free hour-long evening spa circuit daily',
      'Beach kits (towels, frisbees, coolers) for guests',
    ],
  }),
  createHotel({
    id: 'comfort-07',
    name: 'Bamboo Breeze Podhouse',
    image: 'https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&q=80',
    location: 'Siolim',
    price: 5300,
    rating: 4.2,
    amenities: ['wifi', 'breakfast', 'parking'],
    highlights: [
      'Individual bamboo pods shaded by palm canopies',
      'Complimentary Goan poi sandwiches each evening',
      'Board game library for late-night hangouts',
    ],
  }),
  createHotel({
    id: 'comfort-08',
    name: "Fisherman's Wharf Suites",
    image: 'https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=800&q=80',
    location: 'Betim',
    price: 5550,
    rating: 4.3,
    amenities: ['wifi', 'restaurant', 'parking'],
    highlights: [
      'Riverside deck with live grill counters',
      'Local storytellers hosting dusk sessions',
      'Free shuttle to Panjim promenade',
    ],
  }),
  createHotel({
    id: 'comfort-09',
    name: 'Hibiscus Courtyard Homes',
    image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80',
    location: 'Reis Magos',
    price: 5800,
    rating: 4.1,
    amenities: ['wifi', 'pool', 'breakfast'],
    highlights: [
      'Sunlit splash pool with floating bean bags',
      'DIY waffle bar each morning',
      'Complimentary ferry tickets to Panjim jetty',
    ],
  }),
  createHotel({
    id: 'comfort-10',
    name: 'Mangrove Muse Residences',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
    location: 'Chorao Island',
    price: 6025,
    rating: 4.4,
    amenities: ['wifi', 'breakfast', 'pool', 'parking'],
    highlights: [
      'Kayak docks that open straight into mangrove creeks',
      'Herbal welcome drinks from on-site farm',
      'Nature journaling corners with art supplies',
    ],
  }),
  createHotel({
    id: 'comfort-11',
    name: 'Sunlit Sal Estate',
    image: 'https://images.unsplash.com/photo-1445991842772-097fea258e7b?w=800&q=80',
    location: 'Loutolim',
    price: 6280,
    rating: 4.3,
    amenities: ['wifi', 'spa', 'restaurant'],
    highlights: [
      'Restored Indo-Portuguese mansion with courtyards',
      'Mini wellness studio offering reflexology',
      'Farm-to-table suppers cooked over clay stoves',
    ],
  }),
  createHotel({
    id: 'comfort-12',
    name: 'Coconut Cascade Lodge',
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80',
    location: 'Majorda',
    price: 6550,
    rating: 4.2,
    amenities: ['wifi', 'pool', 'breakfast', 'beach'],
    highlights: [
      'Lagoon-style pool ringed by coconut groves',
      'Morning beach volleyball for the group',
      'Unlimited tender coconut bar post check-in',
    ],
  }),
  createHotel({
    id: 'comfort-13',
    name: 'Pepper Spice Residency',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
    location: 'Mapusa',
    price: 6725,
    rating: 4.4,
    amenities: ['wifi', 'restaurant', 'parking', 'gym'],
    highlights: [
      'Cooking studio for hands-on vindaloo lessons',
      'Night market shuttle passes for every guest',
      'Compact cardio studio with sunrise sessions',
    ],
  }),
  createHotel({
    id: 'comfort-14',
    name: 'Laguna Azul Cabins',
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80',
    location: 'Arpora',
    price: 6950,
    rating: 4.5,
    amenities: ['wifi', 'pool', 'breakfast', 'spa'],
    highlights: [
      'Cabin decks suspended above lily ponds',
      'Hydro foot spa kiosks in every block',
      'Glow-in-the-dark paddle board experience at night',
    ],
  }),

  // Explorer tier ₹7k – ₹12k
  createHotel({
    id: 'explorer-01',
    name: 'Azure Bay Suites',
    image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
    location: 'Vagator',
    price: 7200,
    rating: 4.5,
    amenities: ['wifi', 'pool', 'beach', 'restaurant'],
    highlights: [
      'Two-tier lagoon pool with sunken cabanas',
      'Guided sunrise treks to Chapora fort',
      'Chef-curated coastal tasting menus',
    ],
  }),
  createHotel({
    id: 'explorer-02',
    name: 'Coral Crest Manor',
    image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80',
    location: 'Anjuna',
    price: 7800,
    rating: 4.6,
    amenities: ['wifi', 'spa', 'gym', 'restaurant', 'parking'],
    highlights: [
      'Soundproof party suites near Anjuna flea market',
      'Meditation dome with hourly wellness classes',
      'Complimentary airport transfers for the group',
    ],
  }),
  createHotel({
    id: 'explorer-03',
    name: 'Harmony Sands Retreat',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
    location: 'Morjim',
    price: 8500,
    rating: 4.8,
    amenities: ['wifi', 'beach', 'spa', 'pool', 'parking'],
    highlights: [
      'On-site music studio for jam sessions',
      'Private beach lounge with day beds',
      'Modern gym + reformer pilates studio',
    ],
  }),
  createHotel({
    id: 'explorer-04',
    name: 'Seabreeze Collective Hotel',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
    location: 'Calangute',
    price: 9200,
    rating: 4.7,
    amenities: ['wifi', 'pool', 'breakfast', 'parking'],
    highlights: [
      'Lap pool plus family splash zone',
      'Floating breakfast trays for villa suites',
      'Curated heritage walk through Old Goa',
    ],
  }),
  createHotel({
    id: 'explorer-05',
    name: 'Monsoon Grove Villas',
    image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
    location: 'Sinquerim',
    price: 9800,
    rating: 4.9,
    amenities: ['wifi', 'spa', 'restaurant', 'parking'],
    highlights: [
      'Independent villas with plunge pools',
      'Chef on-call for personalised menus',
      'Complimentary sunset cruise on the Mandovi',
    ],
  }),
  createHotel({
    id: 'explorer-06',
    name: 'Heritage Dunes Residences',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    location: 'Saligao',
    price: 11200,
    rating: 4.6,
    amenities: ['wifi', 'breakfast', 'spa', 'gym', 'restaurant'],
    highlights: [
      'Portuguese mansions converted into suites',
      '24x7 concierge for adventure activities',
      'Rooftop pool with LED cinema nights',
    ],
  }),
  createHotel({
    id: 'explorer-07',
    name: 'Tidepool Transit Hotel',
    image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
    location: 'Ashwem',
    price: 7350,
    rating: 4.4,
    amenities: ['wifi', 'pool', 'restaurant', 'parking'],
    highlights: [
      'Split-level lagoon pool with hammock bridges',
      'Surfboard rentals and trainers on-site',
      'Road trip concierge plotting day drives',
    ],
  }),
  createHotel({
    id: 'explorer-08',
    name: 'Ocean Cantina Collective',
    image: 'https://images.unsplash.com/photo-1445991842772-097fea258e7b?w=800&q=80',
    location: 'Chapora',
    price: 7650,
    rating: 4.5,
    amenities: ['wifi', 'breakfast', 'spa', 'restaurant'],
    highlights: [
      'Mexican-Goan tasting stations throughout the day',
      'In-house DJ booth open for guest playlists',
      'Rooftop plunge tubs overlooking Chapora fort',
    ],
  }),
  createHotel({
    id: 'explorer-09',
    name: 'Sailwind Habitat',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',
    location: 'Miramar',
    price: 8125,
    rating: 4.7,
    amenities: ['wifi', 'pool', 'beach', 'gym'],
    highlights: [
      'Skipper-led sailing workshops each morning',
      'Beachfront cabanas with misting fans',
      'Crossfit-inspired bootcamps hosted at sunrise',
    ],
  }),
  createHotel({
    id: 'explorer-10',
    name: 'Crafthouse Vista Suites',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
    location: 'Porvorim',
    price: 8650,
    rating: 4.6,
    amenities: ['wifi', 'breakfast', 'gym', 'parking'],
    highlights: [
      'Makers studio offering pottery and weaving labs',
      'Panoramic cowork + creator loft',
      'Guided market trails to boutique ateliers',
    ],
  }),
  createHotel({
    id: 'explorer-11',
    name: 'Riverlight Escapes',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
    location: 'Divar Island',
    price: 9280,
    rating: 4.8,
    amenities: ['wifi', 'pool', 'spa', 'restaurant', 'parking'],
    highlights: [
      'Pontoon floating deck for candlelight dinners',
      'Island hopping cruises scheduled daily',
      'Ayurvedic spa cabanas along the riverbank',
    ],
  }),
  createHotel({
    id: 'explorer-12',
    name: 'Crimson Reef Residences',
    image: 'https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=800&q=80',
    location: 'Keri',
    price: 9860,
    rating: 4.7,
    amenities: ['wifi', 'beach', 'pool', 'spa'],
    highlights: [
      'Bioluminescence kayak tours on new moon nights',
      'Infinity pool lined with coral-inspired lighting',
      'Guided snorkel runs with marine biologists',
    ],
  }),
  createHotel({
    id: 'explorer-13',
    name: 'Moonriver Culture House',
    image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80',
    location: 'Panjim Latin Quarter',
    price: 10550,
    rating: 4.9,
    amenities: ['wifi', 'restaurant', 'gym', 'parking'],
    highlights: [
      'Residency program with local artists in-house',
      'Jazz courtyard with nightly jam sessions',
      'Chef-led walking tours of hidden bakeries',
    ],
  }),
  createHotel({
    id: 'explorer-14',
    name: 'Terracotta Ridges Retreat',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
    location: 'Parra',
    price: 11800,
    rating: 4.8,
    amenities: ['wifi', 'pool', 'spa', 'restaurant', 'parking'],
    highlights: [
      'Split-level villas with terracotta plunge pools',
      'Guided e-bike tours through Parra coconut lanes',
      'Tea pairing ceremonies overlooking the ridges',
    ],
  }),

  // Premium tier ₹12k – ₹18k
  createHotel({
    id: 'premium-01',
    name: 'Marina Grande Palace',
    image: 'https://images.unsplash.com/photo-1445991842772-097fea258e7b?w=800&q=80',
    location: 'Bambolim',
    price: 12500,
    rating: 4.8,
    amenities: ['wifi', 'beach', 'spa', 'restaurant', 'gym'],
    highlights: [
      'Ocean-view suites with butler service',
      'Marina jetty for private yacht boarding',
      'Hydrotherapy spa experiences',
    ],
  }),
  createHotel({
    id: 'premium-02',
    name: 'Opal Horizon Resort',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',
    location: 'Varca',
    price: 13800,
    rating: 4.9,
    amenities: ['wifi', 'pool', 'spa', 'restaurant', 'parking'],
    highlights: [
      'Glasshouse pool bar',
      'Boutique co-working lounge for digital nomads',
      'Complimentary gourmet high tea daily',
    ],
  }),
  createHotel({
    id: 'premium-03',
    name: 'Tranquil Crest Estate',
    image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
    location: 'Cavelossim',
    price: 14900,
    rating: 4.8,
    amenities: ['wifi', 'pool', 'gym', 'restaurant'],
    highlights: [
      'Three-tier cascading pool',
      'Aroma therapy suites with hydro massage',
      'Guided mangrove kayak trails',
    ],
  }),
  createHotel({
    id: 'premium-04',
    name: 'Indigo Pearl Sanctuary',
    image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80',
    location: 'Assagao',
    price: 16200,
    rating: 4.9,
    amenities: ['wifi', 'breakfast', 'spa', 'restaurant', 'parking'],
    highlights: [
      'Designer villas curated by local artisans',
      'In-house mixology lab + chef table',
      'Holistic wellness pavilion with hammam',
    ],
  }),
  createHotel({
    id: 'premium-05',
    name: 'Vista Azure Manor',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    location: 'Betalbatim',
    price: 17500,
    rating: 4.95,
    amenities: ['wifi', 'beach', 'pool', 'spa', 'parking'],
    highlights: [
      'Clifftop infinity pool facing the Arabian Sea',
      'Dedicated concierge per villa',
      'Sunset champagne ritual for groups',
    ],
  }),
  createHotel({
    id: 'premium-06',
    name: 'Prism Horizon Club',
    image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
    location: 'Varca',
    price: 12950,
    rating: 4.7,
    amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant'],
    highlights: [
      'Three-colour LED lap pool for swim relays',
      'Mixology theatre with smoke infusion classes',
      'Dedicated creator studio for podcasts and reels',
    ],
  }),
  createHotel({
    id: 'premium-07',
    name: 'Azure Lattice Estate',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
    location: 'Aldona',
    price: 13680,
    rating: 4.8,
    amenities: ['wifi', 'breakfast', 'spa', 'parking'],
    highlights: [
      'Brise-soleil inspired villas with private courtyards',
      'Hydro sonic spa pods for recovery',
      'Outdoor library deck floating over lotus ponds',
    ],
  }),
  createHotel({
    id: 'premium-08',
    name: 'Meridian Grove Resort',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
    location: 'Mobor',
    price: 14400,
    rating: 4.85,
    amenities: ['wifi', 'pool', 'beach', 'gym', 'restaurant'],
    highlights: [
      'Two-kilometre private beachfront trail',
      'Supper clubs rotating global cuisine themes',
      'Performance lab with personal trainers and ice baths',
    ],
  }),
  createHotel({
    id: 'premium-09',
    name: 'Solstice Pavilion Retreat',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
    location: 'Siquerim',
    price: 15150,
    rating: 4.9,
    amenities: ['wifi', 'spa', 'restaurant', 'parking'],
    highlights: [
      'Glass-roofed pavilions aligned to solstice sunrise',
      'Daily breath work circles with master coaches',
      'Pan-Asian chef table hidden within spice gardens',
    ],
  }),
  createHotel({
    id: 'premium-10',
    name: 'Cascade Sereno Villas',
    image: 'https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=800&q=80',
    location: 'Nagoa',
    price: 15900,
    rating: 4.88,
    amenities: ['wifi', 'pool', 'spa', 'restaurant', 'parking'],
    highlights: [
      'Stone-carved cascade pools weaving through villas',
      'Wellness-led room service with sleep coaches',
      'Glow yoga decks with live instrumentalists',
    ],
  }),
  createHotel({
    id: 'premium-11',
    name: 'Luminous Garden Haveli',
    image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80',
    location: 'Velha Goa',
    price: 16850,
    rating: 4.92,
    amenities: ['wifi', 'breakfast', 'spa', 'gym'],
    highlights: [
      'Lantern-lit cloisters inspired by old monasteries',
      'Sound healing vault with choirs on weekends',
      'Curated pilgrimage of heritage churches by night',
    ],
  }),
  createHotel({
    id: 'premium-12',
    name: 'Auric Palm Residences',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
    location: 'Cola',
    price: 17720,
    rating: 4.95,
    amenities: ['wifi', 'beach', 'pool', 'spa', 'parking'],
    highlights: [
      'Hill-perched villas with panoramic lagoon views',
      'Aerial yoga dome suspended over the cliff',
      'Chef-curated tapas crawls through Cola village',
    ],
  }),

  // Luxury tier ₹18k+
  createHotel({
    id: 'luxury-01',
    name: 'Aurora Luxe Pavilion',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
    location: 'Benaulim',
    price: 18500,
    rating: 5.0,
    amenities: ['wifi', 'spa', 'restaurant', 'gym'],
    highlights: [
      'Panoramic glass suites with smart mood lighting',
      'Gourmet chef assigned to every booking',
      'Saltwater floatation therapy pods',
    ],
  }),
  createHotel({
    id: 'luxury-02',
    name: 'Celestial Bay Residences',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
    location: 'Colvale',
    price: 19800,
    rating: 4.95,
    amenities: ['wifi', 'beach', 'pool', 'spa', 'restaurant', 'parking'],
    highlights: [
      'Sky lounge with telescope + mixology bar',
      'Helipad transfers on request',
      'Floating cabanas with private butlers',
    ],
  }),
  createHotel({
    id: 'luxury-03',
    name: 'Imperial Tides Estate',
    image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
    location: 'Dona Paula',
    price: 21500,
    rating: 4.97,
    amenities: ['wifi', 'pool', 'spa', 'gym', 'parking'],
    highlights: [
      'Palatial ballroom for celebration dinners',
      'In-suite plunge pools + steam rooms',
      'Private jetty for yacht drop-offs',
    ],
  }),
  createHotel({
    id: 'luxury-04',
    name: 'Crown Jewel Retreat',
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80',
    location: 'Arossim',
    price: 23200,
    rating: 5.0,
    amenities: ['wifi', 'spa', 'restaurant', 'parking'],
    highlights: [
      'Crystal spa with zero-gravity massage pods',
      'Personalised shopping concierge',
      'Sunset sky-deck dinners for the entire squad',
    ],
  }),
  createHotel({
    id: 'luxury-05',
    name: 'Elysian Shore Palace',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    location: 'Candolim',
    price: 25500,
    rating: 5.0,
    amenities: ['wifi', 'beach', 'spa', 'restaurant', 'gym', 'parking'],
    highlights: [
      'Presidential wing with piano lounge',
      'Underwater dining experience for twelve',
      '24/7 chauffeur fleet and security detail',
    ],
  }),
  createHotel({
    id: 'luxury-06',
    name: 'Halo Crest Enclave',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
    location: 'Colva',
    price: 18950,
    rating: 4.96,
    amenities: ['wifi', 'spa', 'gym', 'restaurant', 'parking'],
    highlights: [
      'Halo-lit infinity pool with levitating cabanas',
      'Personal wellness butlers orchestrating daily rituals',
      'Soundproof celebration dome for private parties',
    ],
  }),
  createHotel({
    id: 'luxury-07',
    name: 'Saffron Dune Residences',
    image: 'https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=800&q=80',
    location: 'Talpona',
    price: 20500,
    rating: 4.98,
    amenities: ['wifi', 'beach', 'pool', 'spa'],
    highlights: [
      'Desert-inspired spa caves cooled with mist corridors',
      'Chef collaborations with Michelin guest pop-ups',
      'Marine biologist-led turtle watching from private decks',
    ],
  }),
  createHotel({
    id: 'luxury-08',
    name: 'Celestria Sky Mansions',
    image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80',
    location: 'Velsao',
    price: 22400,
    rating: 5.0,
    amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'parking'],
    highlights: [
      'Duplex sky mansions with telescopic observatories',
      'Levitation dining table for immersive tastings',
      'Aerial drone concierge delivering amenities',
    ],
  }),
  createHotel({
    id: 'luxury-09',
    name: 'Opaline River Citadel',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
    location: 'Old Goa',
    price: 24100,
    rating: 4.97,
    amenities: ['wifi', 'pool', 'spa', 'restaurant', 'parking'],
    highlights: [
      'Fort-inspired bastions converted to suites',
      'Mandovi river dinner parades with live orchestras',
      'Private gallery showing rare Indo-Portuguese art',
    ],
  }),
  createHotel({
    id: 'luxury-10',
    name: 'Mythic Lagoon Reserve',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    location: 'Cansaulim',
    price: 26750,
    rating: 5.0,
    amenities: ['wifi', 'beach', 'spa', 'gym', 'restaurant'],
    highlights: [
      'Biophilic lagoon domes with programmable climates',
      'Adventure concierge arranging helicopter drop-ins',
      'Chef residences that rotate every fortnight',
    ],
  }),
  createHotel({
    id: 'luxury-11',
    name: 'Nocturne Pearl Sanctum',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
    location: 'Anjuna',
    price: 27980,
    rating: 4.99,
    amenities: ['wifi', 'pool', 'spa', 'restaurant', 'parking'],
    highlights: [
      'Moonlit pool with fiber-optic constellations',
      'Silent-disco ballroom curated by celebrity DJs',
      'Private recording studio for guest podcasts',
    ],
  }),
  createHotel({
    id: 'luxury-12',
    name: 'Citrine Crown Atelier',
    image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
    location: 'Agonda',
    price: 29800,
    rating: 5.0,
    amenities: ['wifi', 'beach', 'spa', 'gym', 'restaurant', 'parking'],
    highlights: [
      'Atelier suites co-designed with couture houses',
      'Resident perfumer blending signature group scents',
      'Floating helipad for sunset aerial tours',
    ],
  }),
];

const AVAILABLE_AMENITY_KEYS = Array.from(
  new Set(AVAILABLE_HOTELS.flatMap((hotel) => hotel.amenities.map((amenity) => canonicalAmenity(amenity))))
);

interface HotelSelectionProps {
  destination: string;
  onShareShortlist: (hotels: Hotel[]) => void;
  prefillHotelId?: string;
  isSharedLinkMode?: boolean;
}

export default function HotelSelection({ destination, onShareShortlist, prefillHotelId, isSharedLinkMode = false }: HotelSelectionProps) {
  const polls = useTripStore((state) => state.polls);
  const shortlistedHotels = useTripStore((state) => state.shortlistedHotels);
  const setStep = useTripStore((state) => state.setStep);
  const [selectedHotels, setSelectedHotels] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'popular' | 'price-low' | 'price-high' | 'rating'>('popular');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [priceRange, setPriceRange] = useState({ min: 0, max: DEFAULT_MAX_PRICE });
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [bannerMessage, setBannerMessage] = useState('');
  const [hotelNotAvailable, setHotelNotAvailable] = useState(false);

  // Handle prefill from shared link
  useEffect(() => {
    if (isSharedLinkMode) {
      setBannerMessage('🔗 Viewing shared booking itinerary—Create your own trip to book!');
      console.log('🔗 [HotelSelection] Shared link mode active');
    } else if (prefillHotelId) {
      const prefillHotel = AVAILABLE_HOTELS.find(h => h.id === prefillHotelId);
      if (prefillHotel) {
        setSelectedHotels(new Set([prefillHotelId]));
        setBannerMessage(`✨ Pre-selected hotel from shared link: ${prefillHotel.name}`);
        console.log('🔗 [HotelSelection] Pre-selected hotel:', prefillHotel.name);
      } else {
        // Hotel not available - show fallback message
        setHotelNotAvailable(true);
        setBannerMessage('⚠️ Original hotel unavailable—showing similar options in this destination');
        console.log('⚠️ [HotelSelection] Prefilled hotel not found:', prefillHotelId);
      }
    }
  }, [prefillHotelId, isSharedLinkMode]);
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

  const handleBookHotel = (hotelId: string) => {
    // In shared link mode, directly navigate to room selection with the hotel
    const params = new URLSearchParams(window.location.search);
    params.set('step', 'room-selection');
    params.set('hotelId', hotelId);
    window.history.pushState({}, '', `?${params.toString()}`);
    setStep('room-selection');
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
            {!isSharedLinkMode && (
              <button
                onClick={handleShareShortlist}
                disabled={selectedHotels.size === 0}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  selectedHotels.size > 0
                    ? 'bg-gradient-to-r from-[#0071c2] to-purple-600 text-white hover:from-[#005fa3] hover:to-purple-700 shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Share with Group ({selectedHotels.size}/5)
              </button>
            )}
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
            <div className="flex items-center gap-2">
              {isSharedLinkMode && (
                <button
                  onClick={() => setStep('home')}
                  className="px-4 py-1.5 bg-gradient-to-r from-[#0071c2] to-purple-600 text-white text-sm font-semibold rounded-lg hover:from-[#005fa3] hover:to-purple-700 transition-all"
                >
                  Create Your Trip
                </button>
              )}
              <button onClick={() => setShowBanner(false)} aria-label="Dismiss banner">
                <X className="w-4 h-4" />
              </button>
            </div>
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
                        <div className="w-48 h-40 flex-shrink-0 rounded-lg overflow-hidden">
                          <img
                            src={hotel.image}
                            alt={hotel.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
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
                              onClick={() => isSharedLinkMode ? handleBookHotel(hotel.id) : toggleHotel(hotel.id)}
                              className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                                isSelected && !isSharedLinkMode
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-[#0071c2] text-white hover:bg-[#005fa3]'
                              }`}
                            >
                              {isSharedLinkMode ? (
                                'Book This Hotel'
                              ) : isSelected ? (
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

