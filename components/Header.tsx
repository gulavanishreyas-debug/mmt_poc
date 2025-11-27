'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  ChevronDown,
  Plane,
  Building2,
  Home,
  MapPin,
  Train,
  Bus,
  Car,
  DollarSign,
  Shield,
} from 'lucide-react';
import { useTripStore } from '@/lib/store';

const navigationItems = [
  { label: 'Flights', icon: Plane, href: '#flights', isActive: false },
  { label: 'Hotels', icon: Building2, href: '#hotels', isActive: true },
  { label: 'Homestays', icon: Home, href: '#homestays', isActive: false },
  { label: 'Holiday Packages', icon: MapPin, href: '#packages', isActive: false },
  { label: 'Trains', icon: Train, href: '#trains', isActive: false },
  { label: 'Buses', icon: Bus, href: '#buses', isActive: false },
  { label: 'Cabs', icon: Car, href: '#cabs', isActive: false },
  { label: 'Forex Cards', icon: DollarSign, href: '#forex', isActive: false },
  { label: 'Travel Insurance', icon: Shield, href: '#insurance', isActive: false },
];

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('INR');
  const { members, currentUserId } = useTripStore();
  
  const currentUser = members.find(m => m.id === currentUserId);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0071c2] shadow-md">
      {/* Main Header Content */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between gap-4 py-3 sm:py-4">
          {/* Logo & Personalized Section (Left) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-6 flex-shrink-0"
          >
            {/* MakeMyTrip Logo */}
            <a href="/" className="flex items-center gap-1 group hover:opacity-90 transition-opacity">
              <span className="text-white text-2xl font-normal">make</span>
              {/* MY Logo Image */}
              <Image
                src="/pngegg.png"
                alt="my"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
                priority
                unoptimized
              />
              <span className="text-white text-2xl font-normal">trip</span>
            </a>
          </motion.div>

          {/* Desktop Navigation Menu (Center) */}
          <nav className="hidden items-center space-x-1 lg:flex flex-1 justify-center">
            {navigationItems.slice(0, 7).map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.a
                  key={item.label}
                  href={item.href}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`group relative flex items-center space-x-1 px-3 py-2 text-sm font-medium transition-all duration-200 rounded-md ${
                    item.isActive
                      ? 'text-white font-bold bg-white/20'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </motion.a>
              );
            })}

            {/* More Dropdown */}
            <div className="relative">
              <motion.button
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.35 }}
                onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 rounded-md transition-all duration-200"
              >
                <span>More</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isMoreDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </motion.button>

              <AnimatePresence>
                {isMoreDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-0 w-48 rounded-lg bg-white shadow-lg border border-gray-200 overflow-hidden z-10"
                  >
                    {navigationItems.slice(7).map((item) => {
                      const Icon = item.icon;
                      return (
                        <a
                          key={item.label}
                          href={item.href}
                          onClick={() => setIsMoreDropdownOpen(false)}
                          className="flex items-center space-x-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </a>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Right Section: Promo + Currency + User */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Promotional Banner */}
            <div className="hidden md:flex bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg items-center gap-2">
              <div>
                <div className="text-sm font-semibold">₹200+ off</div>
                <div className="text-xs opacity-90">Limited time</div>
              </div>
            </div>

            {/* Currency Selector */}
            <div className="relative group hidden lg:block">
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 rounded-md transition-all duration-200"
              >
                <span>{selectedCurrency}</span>
                <ChevronDown className="h-4 w-4" />
              </motion.button>

              <div className="absolute right-0 mt-0 w-40 rounded-lg bg-white shadow-lg border border-gray-200 overflow-hidden hidden group-hover:block z-10">
                {['INR', 'USD', 'EUR', 'GBP'].map((currency) => (
                  <button
                    key={currency}
                    onClick={() => setSelectedCurrency(currency)}
                    className={`block w-full px-4 py-2 text-left text-sm font-medium transition-colors ${
                      selectedCurrency === currency
                        ? 'bg-blue-50 text-[#0071c2]'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {currency}
                  </button>
                ))}
              </div>
            </div>

            {/* User Profile */}
            <div className="relative hidden lg:block">
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-white/10 transition-colors text-white"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/30 text-white font-bold text-sm shadow-md">
                  {currentUser?.name?.charAt(0) || 'S'}
                </div>
                <div className="hidden sm:flex flex-col items-start gap-0.5">
                  <span className="text-sm font-semibold text-white">Hi {currentUser?.name?.split(' ')[0] || 'Guest'}</span>
                  {currentUser?.isAdmin && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Admin</span>
                  )}
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-white transition-transform duration-200 ${
                    isUserDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </motion.button>

              <AnimatePresence>
                {isUserDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg border border-gray-200 overflow-hidden z-10"
                  >
                    <a
                      href="/profile"
                      className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
                      onClick={() => setIsUserDropdownOpen(false)}
                    >
                      My Profile
                    </a>
                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        useTripStore.setState({ currentStep: 'mybookings' });
                      }}
                      className="block w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
                    >
                      My Bookings
                    </button>
                    <a
                      href="/wishlist"
                      className="block px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
                      onClick={() => setIsUserDropdownOpen(false)}
                    >
                      My Wishlist
                    </a>
                    <button
                      className="block w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setIsUserDropdownOpen(false)}
                    >
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-md p-2 text-white transition-colors hover:bg-white/10 lg:hidden"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/30 bg-[#0071c2] lg:hidden"
          >
            <div className="space-y-1 px-4 pb-4 pt-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-2 rounded-md px-3 py-2 text-base font-medium transition-colors ${
                      item.isActive
                        ? 'bg-white/20 text-white font-bold'
                        : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </a>
                );
              })}

              {/* Mobile User Profile */}
              <div className="border-t border-white/30 pt-4 mt-4">
                <div className="flex items-center space-x-3 px-3 py-2 mb-3 text-white">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/30 text-white font-bold shadow-md">
                    {currentUser?.name?.charAt(0) || 'S'}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">Hi {currentUser?.name?.split(' ')[0] || 'Guest'}</span>
                    {currentUser?.isAdmin && (
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded w-fit">Admin</span>
                    )}
                  </div>
                </div>

                <a
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors"
                >
                  My Profile
                </a>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    useTripStore.setState({ currentStep: 'mybookings' });
                  }}
                  className="block w-full text-left rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors"
                >
                  My Bookings
                </button>
                <a
                  href="/wishlist"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors"
                >
                  My Wishlist
                </a>

                {/* Mobile Currency Selector */}
                <div className="border-t border-white/30 mt-3 pt-3">
                  <p className="px-3 py-2 text-sm font-semibold text-white">
                    Currency: {selectedCurrency}
                  </p>
                  <div className="space-y-1 px-3">
                    {['INR', 'USD', 'EUR', 'GBP'].map((currency) => (
                      <button
                        key={currency}
                        onClick={() => {
                          setSelectedCurrency(currency);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`block w-full px-3 py-2 text-left text-sm font-medium rounded-md transition-colors ${
                          selectedCurrency === currency
                            ? 'bg-white/20 text-white font-bold'
                            : 'text-white/80 hover:bg-white/10'
                        }`}
                      >
                        {currency}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mobile Promo Banner */}
              <div className="border-t border-white/30 mt-4 pt-4">
                <div className="bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg">
                  <div className="text-sm font-semibold">₹200+ off on your booking</div>
                  <div className="text-xs opacity-90">Limited time offer</div>
                </div>
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="mt-4 w-full rounded-md bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
