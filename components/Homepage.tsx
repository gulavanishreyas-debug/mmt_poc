'use client';

import { motion } from 'framer-motion';
import { MapPin, Search, Calendar, Users, Sparkles, Plane } from 'lucide-react';
import SocialCartFloatingButton from './SocialCartFloatingButton';
import Header from './Header';

export default function Homepage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Global Header */}
      <Header />

      {/* Hero Section with Background */}
      <div className="relative bg-gradient-to-br from-[#E8F4FD] via-[#F0E6FF] to-[#FCE4EC] overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNHYxMmMwIDItMiA0LTIgNHMtMi0yLTItNFYzNHpNMCAyYzAtMiAyLTQgMi00czIgMiAyIDR2MTJjMCAyLTIgNC0yIDRzLTItMi0yLTRWMnoiLz48L2c+PC9nPjwvc3ZnPg==')]"></div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-gray-900"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm text-[#0071c2] px-4 py-2 rounded-full mb-6 border border-white/50"
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-semibold">Group Travel Made Easy</span>
              </motion.div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-gray-900">
                Plan Amazing
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0071c2] to-[#FF6B6B]">
                  Group Trips Together
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-700 mb-8 leading-relaxed">
                Invite friends, vote on hotels, and unlock exclusive group discounts. 
                The more you travel together, the more you save! 🎉
              </p>

              {/* Search Bar - MakeMyTrip Style */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white rounded-2xl shadow-2xl p-2 mb-6"
              >
                <div className="flex flex-col md:flex-row gap-2">
                  <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                    <MapPin className="w-5 h-5 text-[#008CFF]" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 font-medium">DESTINATION</div>
                      <input
                        type="text"
                        placeholder="Where do you want to go?"
                        className="w-full text-sm font-semibold text-gray-900 outline-none bg-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                    <Calendar className="w-5 h-5 text-[#008CFF]" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 font-medium">DATES</div>
                      <div className="text-sm font-semibold text-gray-900">Select dates</div>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                    <Users className="w-5 h-5 text-[#008CFF]" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 font-medium">TRAVELERS</div>
                      <div className="text-sm font-semibold text-gray-900">Add members</div>
                    </div>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-3 bg-gradient-to-r from-[#008CFF] to-[#0066CC] text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Search className="w-5 h-5" />
                    Search
                  </motion.button>
                </div>
              </motion.div>
              
              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <p className="text-gray-600 text-sm mb-3">Or start planning right away:</p>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#FF9800] to-[#E91E63] text-white rounded-full font-bold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300"
                >
                  <Plane className="w-6 h-6" />
                  Start Group Trip
                  <span className="text-2xl">→</span>
                </motion.button>
              </motion.div>

              {/* Stats */}
              <div className="mt-12 flex items-center gap-8">
                <div>
                  <div className="text-3xl font-bold text-[#0071c2]">10K+</div>
                  <div className="text-sm text-gray-700">Group Trips</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#0071c2]">₹2Cr+</div>
                  <div className="text-sm text-gray-700">Saved Together</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#0071c2]">4.8★</div>
                  <div className="text-sm text-gray-700">User Rating</div>
                </div>
              </div>
            </motion.div>

            {/* Hero Illustration */}
            <motion.div
              className="relative hidden md:block"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="relative">
                {/* Main Card */}
                <div className="bg-white rounded-3xl p-8 shadow-2xl backdrop-blur-sm">
                  <div className="space-y-4">
                    {/* Mock Chat Bubbles */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold shadow-md">
                        A
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-2xl rounded-tl-none p-4">
                        <p className="text-sm font-medium text-gray-800">Let's book a beach resort! 🏖️</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 justify-end">
                      <div className="flex-1 bg-gradient-to-br from-[#008CFF] to-[#0066CC] text-white rounded-2xl rounded-tr-none p-4 shadow-md">
                        <p className="text-sm font-medium">Perfect! I vote for pool access 🏊</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold shadow-md">
                        B
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
                        C
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-2xl rounded-tl-none p-4">
                        <p className="text-sm font-medium text-gray-800">Count me in! Budget ₹8-10K 💰</p>
                      </div>
                    </div>
                    
                    {/* Discount Badge */}
                    <motion.div 
                      className="bg-gradient-to-r from-[#4CAF50] to-[#66BB6A] text-white rounded-xl p-4 text-center shadow-lg"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <p className="font-bold text-lg">🎉 Group Discount Unlocked!</p>
                      <p className="text-sm opacity-90">Save ₹2,500 on your booking</p>
                    </motion.div>
                  </div>
                </div>
                
                {/* Floating Elements */}
                <motion.div
                  className="absolute -top-6 -right-6 bg-white rounded-full p-4 shadow-xl"
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <span className="text-4xl">🎊</span>
                </motion.div>
                
                <motion.div
                  className="absolute -bottom-6 -left-6 bg-white rounded-full p-4 shadow-xl"
                  animate={{ y: [0, 15, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.5, ease: 'easeInOut' }}
                >
                  <span className="text-4xl">💰</span>
                </motion.div>

                <motion.div
                  className="absolute top-1/3 -left-8 bg-white rounded-full p-3 shadow-xl"
                  animate={{ x: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 1, ease: 'easeInOut' }}
                >
                  <span className="text-3xl">✨</span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Planning group trips has never been easier. Just three simple steps!
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: '👥',
              title: 'Invite Friends',
              description: 'Share a link and get everyone on board. The more, the merrier!',
              color: 'from-[#008CFF] to-[#0066CC]',
            },
            {
              icon: '🗳️',
              title: 'Vote Together',
              description: 'Chat-style polls make group decisions fun and fast!',
              color: 'from-[#9C27B0] to-[#E91E63]',
            },
            {
              icon: '💸',
              title: 'Unlock Discounts',
              description: 'Group bookings mean bigger savings for everyone!',
              color: 'from-[#4CAF50] to-[#66BB6A]',
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
            >
              <div className={`w-20 h-20 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                <span className="text-4xl">{feature.icon}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-center leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="bg-gradient-to-br from-white via-[#F5F9FF] to-[#F0E6FF] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          >
            {[
              { value: '50,000+', label: 'Happy Travelers' },
              { value: '10,000+', label: 'Group Trips' },
              { value: '₹2Cr+', label: 'Total Savings' },
              { value: '4.8★', label: 'Average Rating' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="text-3xl md:text-4xl font-bold text-[#0071c2] mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-700 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Floating Social Cart Button */}
      <SocialCartFloatingButton />
    </div>
  );
}
