'use client';

import { motion } from 'framer-motion';
import { Plane, Hotel, MapPin, Users, Sparkles } from 'lucide-react';
import SocialCartFloatingButton from './SocialCartFloatingButton';

export default function Homepage() {

  const features = [
    { icon: Hotel, title: 'Hotels', color: 'text-blue-500' },
    { icon: Plane, title: 'Flights', color: 'text-green-500' },
    { icon: MapPin, title: 'Holidays', color: 'text-orange-500' },
    { icon: Users, title: 'Group Trips', color: 'text-purple-500' },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="w-10 h-10 bg-gradient-to-r from-mmt-blue to-mmt-purple rounded-lg flex items-center justify-center">
                <Plane className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-mmt-blue to-mmt-purple bg-clip-text text-transparent">
                MakeMyTrip
              </span>
            </motion.div>
            
            <nav className="hidden md:flex items-center gap-6">
              {features.map((feature, index) => (
                <motion.button
                  key={feature.title}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                  <span className="font-medium text-gray-700">{feature.title}</span>
                </motion.button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">NEW: Social Cart 2.0</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Plan Trips
              <br />
              <span className="bg-gradient-to-r from-mmt-blue via-mmt-purple to-mmt-pink bg-clip-text text-transparent">
                With Friends
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Create group trips, vote together, and unlock exclusive discounts. 
              The more friends join, the more you save! 🎉
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                className="btn-secondary text-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Browse Hotels
              </motion.button>
              
              <motion.button
                className="btn-secondary text-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Explore Destinations
              </motion.button>
            </div>
            
            <div className="mt-8 flex items-center gap-8">
              <div>
                <div className="text-3xl font-bold text-mmt-blue">10K+</div>
                <div className="text-sm text-gray-600">Group Trips</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-mmt-green">₹2Cr+</div>
                <div className="text-sm text-gray-600">Saved Together</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-mmt-purple">4.8★</div>
                <div className="text-sm text-gray-600">User Rating</div>
              </div>
            </div>
          </motion.div>

          {/* Hero Image/Illustration */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-3xl p-8 shadow-2xl">
              <div className="bg-white rounded-2xl p-6 space-y-4">
                {/* Mock Chat Bubbles */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    A
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-2xl rounded-tl-none p-4">
                    <p className="text-sm">Let's book a beach resort! 🏖️</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 justify-end">
                  <div className="flex-1 bg-mmt-blue text-white rounded-2xl rounded-tr-none p-4">
                    <p className="text-sm">Perfect! I vote for pool access 🏊</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                    B
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                    C
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-2xl rounded-tl-none p-4">
                    <p className="text-sm">Count me in! Budget ₹8-10K 💰</p>
                  </div>
                </div>
                
                <motion.div 
                  className="bg-gradient-to-r from-green-400 to-green-500 text-white rounded-xl p-4 text-center"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <p className="font-bold">🎉 Group Discount Unlocked!</p>
                  <p className="text-sm">Save ₹2,500 on your booking</p>
                </motion.div>
              </div>
            </div>
            
            {/* Floating Elements */}
            <motion.div
              className="absolute -top-4 -right-4 bg-white rounded-full p-4 shadow-lg"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-3xl">🎊</span>
            </motion.div>
            
            <motion.div
              className="absolute -bottom-4 -left-4 bg-white rounded-full p-4 shadow-lg"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            >
              <span className="text-3xl">💰</span>
            </motion.div>
          </motion.div>
        </div>

        {/* Features Section */}
        <motion.div
          className="mt-24 grid md:grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="card text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-mmt-blue" />
            </div>
            <h3 className="text-xl font-bold mb-2">Invite Friends</h3>
            <p className="text-gray-600">
              Share a link and get everyone on board. The more, the merrier!
            </p>
          </div>
          
          <div className="card text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🗳️</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Vote Together</h3>
            <p className="text-gray-600">
              Chat-style polls make group decisions fun and fast!
            </p>
          </div>
          
          <div className="card text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">💸</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Unlock Discounts</h3>
            <p className="text-gray-600">
              Group bookings mean bigger savings for everyone!
            </p>
          </div>
        </motion.div>
      </div>

      {/* Floating Social Cart Button */}
      <SocialCartFloatingButton />
    </div>
  );
}
