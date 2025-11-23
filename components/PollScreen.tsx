'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';
import { useTripStore } from '@/lib/store';
import { formatTimeRemaining } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';

type PollStep = 'budget' | 'amenities' | 'dates' | 'complete';

interface AmenityConsensusEntry {
  id: string;
  label: string;
  icon: string;
  count: number;
  percentage: number;
}

interface AmenityOption {
  id: string;
  label: string;
  icon: string;
}

export default function PollScreen() {
  const {
    currentUserId,
    members,
    votes,
    submitVote,
    calculateConsensus,
    pollEndTime,
    setStep,
  } = useTripStore();

  const [currentStep, setCurrentStep] = useState<PollStep>('budget');
  const [selectedBudget, setSelectedBudget] = useState<string>('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedDates, setSelectedDates] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const budgetOptions = useMemo(
    () => [
      { id: '6-8k', label: '₹6-8K', range: 'Budget Friendly' },
      { id: '8-10k', label: '₹8-10K', range: 'Mid Range' },
      { id: '10k+', label: '₹10K+', range: 'Premium' },
    ],
    []
  );

  const amenityOptions = useMemo<AmenityOption[]>(
    () => [
      { id: 'pool', label: 'Pool', icon: '🏊' },
      { id: 'spa', label: 'Spa', icon: '💆' },
      { id: 'beach', label: 'Beach View', icon: '🏖️' },
      { id: 'gym', label: 'Gym', icon: '💪' },
      { id: 'restaurant', label: 'Restaurant', icon: '🍽️' },
      { id: 'wifi', label: 'Free WiFi', icon: '📶' },
    ],
    []
  );

  const dateOptions = useMemo(
    () => [
      { id: 'weekend', label: 'This Weekend' },
      { id: 'next-week', label: 'Next Week' },
      { id: 'next-month', label: 'Next Month' },
      { id: 'flexible', label: 'Flexible' },
    ],
    []
  );

  const amenityConsensus = useMemo(() => {
    const counts: Record<string, number> = amenityOptions.reduce((acc, option) => {
      acc[option.id] = 0;
      return acc;
    }, {} as Record<string, number>);

    votes.forEach((vote) => {
      vote.amenities?.forEach((amenity) => {
        if (counts[amenity] !== undefined) {
          counts[amenity] += 1;
        }
      });
    });

    const totalSelections = Object.values(counts).reduce((total, count) => total + count, 0);
    const entries: AmenityConsensusEntry[] = amenityOptions
      .map((option) => ({
        id: option.id,
        label: option.label,
        icon: option.icon,
        count: counts[option.id] ?? 0,
        percentage: totalSelections ? Math.round((counts[option.id] / totalSelections) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return { entries, totalSelections };
  }, [amenityOptions, votes]);

  const selectedAmenityBadges = useMemo(
    () =>
      selectedAmenities
        .map((key) => amenityOptions.find((option) => option.id === key))
        .filter((option): option is AmenityOption => Boolean(option)),
    [amenityOptions, selectedAmenities]
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentStep]);

  useEffect(() => {
    if (!pollEndTime) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(pollEndTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [pollEndTime]);

  const handleBudgetSelect = (budget: string) => {
    setSelectedBudget(budget);
    setTimeout(() => {
      setCurrentStep('amenities');
    }, 500);
  };

  const handleAmenitiesSelect = (amenity: string) => {
    setSelectedAmenities(prev => {
      if (prev.includes(amenity)) {
        return prev.filter(a => a !== amenity);
      }
      return [...prev, amenity];
    });
  };

  const handleAmenitiesContinue = () => {
    if (selectedAmenities.length > 0) {
      setCurrentStep('dates');
    }
  };

  const handleDatesSelect = (date: string) => {
    setSelectedDates(date);
    setTimeout(() => {
      handleSubmitVote();
    }, 500);
  };

  const handleSubmitVote = () => {
    if (!currentUserId) return;

    submitVote({
      memberId: currentUserId,
      budget: selectedBudget,
      amenities: selectedAmenities,
      dates: selectedDates,
    });

    setCurrentStep('complete');
    
    // Simulate all votes collected and calculate consensus
    setTimeout(() => {
      calculateConsensus();
      triggerConfetti();
      setTimeout(() => {
        setStep('hotels');
      }, 2000);
    }, 1500);
  };

  const currentMember = members.find(m => m.id === currentUserId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Group Poll</h1>
              <p className="text-sm text-gray-600">Let's find your perfect stay!</p>
            </div>
            <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full">
              <Clock className="w-4 h-4" />
              <span className="font-semibold text-sm">{timeRemaining}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {/* Welcome Message */}
          <motion.div
            className="chat-bubble chat-bubble-system max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm mb-2">
              Hey {currentMember?.name}! 👋
            </p>
            <p className="text-sm">
              Let's figure out what everyone wants. Your preferences will be combined with the group to find the perfect match! ✨
            </p>
          </motion.div>

          {/* Budget Question */}
          <motion.div
            className="chat-bubble chat-bubble-system max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="font-semibold mb-3">What's your budget per night? 💰</p>
            <div className="space-y-2">
              {budgetOptions.map((option, index) => {
                const isSelected = selectedBudget === option.id;

                return (
                  <motion.button
                    key={option.id}
                    onClick={() => handleBudgetSelect(option.id)}
                    disabled={currentStep !== 'budget'}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-mmt-blue bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    } ${currentStep !== 'budget' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    whileHover={currentStep === 'budget' ? { scale: 1.02 } : {}}
                  >
                    <div>
                      <div className="font-bold text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.range}</div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* User Budget Response */}
          <AnimatePresence>
            {selectedBudget && (
              <motion.div
                className="chat-bubble chat-bubble-user max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <p className="text-sm">
                  {budgetOptions.find(o => o.id === selectedBudget)?.label} sounds perfect! 👍
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Amenities Question */}
          <AnimatePresence>
            {currentStep !== 'budget' && (
              <>
                <motion.div
                  className="chat-bubble chat-bubble-system max-w-md"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="font-semibold mb-3">What amenities matter to you? 🏨</p>
                  <p className="text-sm text-gray-600 mb-3">Select all that apply</p>
                    <div className="grid grid-cols-2 gap-2">
                      {amenityOptions.map((option, index) => {
                        const isSelected = selectedAmenities.includes(option.id);
                        
                        return (
                          <motion.button
                            key={option.id}
                            onClick={() => handleAmenitiesSelect(option.id)}
                            disabled={currentStep !== 'amenities'}
                            className={`p-3 rounded-xl border-2 transition-all ${
                              isSelected
                                ? 'border-mmt-blue bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            } ${currentStep !== 'amenities' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={currentStep === 'amenities' ? { scale: 1.05 } : {}}
                          >
                            <div className="text-2xl mb-1">{option.icon}</div>
                            <div className="text-xs font-semibold text-gray-900">
                              {option.label}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  {currentStep === 'amenities' && selectedAmenities.length > 0 && (
                    <motion.button
                      onClick={handleAmenitiesContinue}
                      className="w-full mt-3 py-2 bg-mmt-blue text-white rounded-lg font-semibold"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Continue →
                    </motion.button>
                  )}
                </motion.div>

                  <motion.div
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3 max-w-md"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    aria-live="polite"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Live Poll Consensus</p>
                        <p className="font-semibold text-gray-900 leading-tight">Amenity trends</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {amenityConsensus.totalSelections} selections
                      </span>
                    </div>
                    <div className="space-y-2">
                      {amenityConsensus.entries.slice(0, 3).map((entry) => (
                        <div key={entry.id} className="flex items-center gap-3">
                          <div className="text-2xl">{entry.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{entry.label}</div>
                            <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-1.5 bg-gradient-to-r from-[#0071c2] to-purple-600"
                                style={{ width: `${entry.percentage}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 w-10 text-right">{entry.percentage}%</span>
                        </div>
                      ))}
                      {amenityConsensus.totalSelections === 0 && (
                        <p className="text-xs text-gray-500">
                          No consensus yet. Be the first to pick an amenity!
                        </p>
                      )}
                    </div>
                    {selectedAmenityBadges.length > 0 ? (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="font-semibold text-gray-500">Your likes:</span>
                        {selectedAmenityBadges.map((badge) => (
                          <span
                            key={badge.id}
                            className="flex items-center gap-1 px-2 py-1 rounded-full border border-blue-100 bg-blue-50 text-blue-800"
                          >
                            <span>{badge.icon}</span>
                            <span>{badge.label}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Tap amenities to record your likes — they'll appear here for you only.
                      </p>
                    )}
                  </motion.div>

                {selectedAmenities.length > 0 && currentStep !== 'amenities' && (
                  <motion.div
                    className="chat-bubble chat-bubble-user max-w-md"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <p className="text-sm">
                      Great choices! {selectedAmenities.map(a => amenityOptions.find(o => o.id === a)?.icon).join(' ')}
                    </p>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>

          {/* Dates Question */}
          <AnimatePresence>
            {currentStep === 'dates' || currentStep === 'complete' ? (
              <>
                <motion.div
                  className="chat-bubble chat-bubble-system max-w-md"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="font-semibold mb-3">When are you thinking? 📅</p>
                  <div className="space-y-2">
                    {dateOptions.map((option, index) => {
                      const isSelected = selectedDates === option.id;
                      
                      return (
                        <motion.button
                          key={option.id}
                          onClick={() => handleDatesSelect(option.id)}
                          disabled={currentStep !== 'dates'}
                          className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? 'border-mmt-blue bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          } ${currentStep !== 'dates' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={currentStep === 'dates' ? { scale: 1.02 } : {}}
                        >
                          <div className="font-semibold text-gray-900">{option.label}</div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>

                {selectedDates && (
                  <motion.div
                    className="chat-bubble chat-bubble-user max-w-md"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <p className="text-sm">
                      {dateOptions.find(o => o.id === selectedDates)?.label} works for me! 📆
                    </p>
                  </motion.div>
                )}
              </>
            ) : null}
          </AnimatePresence>

          {/* Completion Message */}
          <AnimatePresence>
            {currentStep === 'complete' && (
              <motion.div
                className="chat-bubble chat-bubble-system max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="text-center">
                  <div className="text-4xl mb-3">🎉</div>
                  <p className="font-semibold text-lg mb-2">
                    We've got your vibe!
                  </p>
                  <p className="text-sm text-gray-600">
                    Let's find hotels that match your group style. Stay tuned for further updates...
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-mmt-blue rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-mmt-blue rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-mmt-blue rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Reminder Banner */}
      <motion.div
        className="bg-gradient-to-r from-orange-400 to-red-400 text-white py-3 px-4 text-center"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 1 }}
      >
        <p className="text-sm font-semibold">
          ⏰ Vote within the next {timeRemaining} to keep the group alive! 🎁
        </p>
      </motion.div>
    </div>
  );
}
