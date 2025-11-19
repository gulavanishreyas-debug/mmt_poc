'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, Users, Calendar, DollarSign, Sparkles, TrendingUp, BarChart3, MapPin, Star, X } from 'lucide-react';
import { useTripStore } from '@/lib/store';

interface Poll {
  id: string;
  type: 'budget' | 'dates' | 'amenities';
  question: string;
  options: PollOption[];
  createdBy: string;
  createdAt: string;
  status: 'active' | 'closed';
}

interface PollOption {
  id: string;
  text: string;
  votes: string[]; // Array of user IDs who voted
}

interface ChatMessage {
  id: string;
  type: 'message' | 'poll' | 'result';
  content: string;
  sender: string;
  timestamp: string;
  poll?: Poll;
}

interface Notification {
  id: string;
  type: 'welcome' | 'poll_created' | 'poll_closed';
  message: string;
  timestamp: string;
}

export default function GroupChatPolling() {
  const { tripId, currentUserId, members, tripName, destination, polls, activePoll, addPoll, updatePoll, setActivePoll, shortlistedHotels, addHotel, hotelVotingStatus, hotelVotingExpiresAt, selectedHotel } = useTripStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showMemberManager, setShowMemberManager] = useState(false);
  const [linkExpiresAt, setLinkExpiresAt] = useState<string | null>(null);
  const [isLinkActive, setIsLinkActive] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [pollTimers, setPollTimers] = useState<Record<string, string>>({});
  const [showHotelSelection, setShowHotelSelection] = useState(false);
  const [hotelVotingTimer, setHotelVotingTimer] = useState<string>('');
  const pollsEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const currentUser = members.find(m => m.id === currentUserId);
  const isAdmin = currentUser?.isAdmin || false;
  const currentUserName = currentUser?.name || 'You';

  console.log('🔍 [Chat] State:', { tripId, currentUserId, chatCount: chatMessages.length, input: messageInput });

  // Load trip metadata (link expiration, etc.)
  useEffect(() => {
    const loadTripMetadata = async () => {
      if (!tripId) return;
      try {
        const response = await fetch(`/api/social-cart/join?tripId=${tripId}`);
        if (response.ok) {
          const data = await response.json();
          setLinkExpiresAt(data.trip.linkExpiresAt || null);
          setIsLinkActive(data.trip.isLinkActive !== false);
        }
      } catch (error) {
        console.error('Failed to load trip metadata:', error);
      }
    };
    loadTripMetadata();
  }, [tripId]);

  // Countdown timer
  useEffect(() => {
    if (!linkExpiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(linkExpiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [linkExpiresAt]);

  // Poll countdown timers
  useEffect(() => {
    const activePolls = polls.filter(p => p.status === 'active' && p.expiresAt);
    if (activePolls.length === 0) return;

    const updatePollTimers = () => {
      const now = new Date().getTime();
      const newTimers: Record<string, string> = {};

      activePolls.forEach(poll => {
        if (!poll.expiresAt) return;
        
        const expiry = new Date(poll.expiresAt).getTime();
        const diff = expiry - now;

        if (diff <= 0) {
          newTimers[poll.id] = 'Time\'s Up!';
          // Auto-close poll when timer expires
          if (isAdmin && activePoll?.id === poll.id) {
            handleClosePoll();
          }
        } else {
          const minutes = Math.floor(diff / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          newTimers[poll.id] = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
      });

      setPollTimers(newTimers);
    };

    updatePollTimers();
    const interval = setInterval(updatePollTimers, 1000);
    return () => clearInterval(interval);
  }, [polls, isAdmin, activePoll]);

  // Hotel voting timer
  useEffect(() => {
    if (!hotelVotingExpiresAt || hotelVotingStatus !== 'active') {
      setHotelVotingTimer('');
      return;
    }

    const updateHotelTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(hotelVotingExpiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setHotelVotingTimer('Time\'s Up!');
        // Auto-close voting when timer expires
        if (isAdmin) {
          handleCloseHotelVoting();
        }
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setHotelVotingTimer(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateHotelTimer();
    const interval = setInterval(updateHotelTimer, 1000);
    return () => clearInterval(interval);
  }, [hotelVotingExpiresAt, hotelVotingStatus, isAdmin]);

  // Debug logging
  useEffect(() => {
    console.log('🗳️ [GroupChatPolling] Component mounted');
    console.log('🗳️ [GroupChatPolling] Trip ID:', tripId);
    console.log('🗳️ [GroupChatPolling] Current User ID:', currentUserId);
    console.log('🗳️ [GroupChatPolling] Members:', members);
    console.log('🗳️ [GroupChatPolling] Trip Name:', tripName);
    console.log('🗳️ [GroupChatPolling] Destination:', destination);
    console.log('🗳️ [GroupChatPolling] Is Admin:', isAdmin);
  }, []);

  // Welcome message on mount
  useEffect(() => {
    if (!tripName || !destination) {
      console.warn('⚠️ [GroupChatPolling] Missing trip data, skipping welcome message');
      return;
    }
    
    const welcomeNotif: Notification = {
      id: 'welcome',
      type: 'welcome',
      message: `🎉 Welcome to ${tripName}! All ${members.length} friends are here. Let's plan this amazing trip to ${destination} together!`,
      timestamp: new Date().toISOString(),
    };
    console.log('✅ [GroupChatPolling] Adding welcome notification:', welcomeNotif);
    setNotifications([welcomeNotif]);
  }, [tripName, destination, members.length]);

  // Watch for new polls and add notification
  useEffect(() => {
    if (polls.length === 0) return;
    
    const latestPoll = polls[polls.length - 1];
    const existingNotif = notifications.find(n => n.id === `poll-${latestPoll.id}`);
    
    if (!existingNotif && latestPoll.createdBy !== currentUserId) {
      const pollNotif: Notification = {
        id: `poll-${latestPoll.id}`,
        type: 'poll_created',
        message: `📊 New poll: "${latestPoll.question}" - Cast your vote now!`,
        timestamp: new Date().toISOString(),
      };
      setNotifications(prev => [...prev, pollNotif]);
    }
  }, [polls, currentUserId, notifications]);

  // Watch for closed polls and add winner notification
  useEffect(() => {
    polls.forEach(poll => {
      if (poll.status === 'closed') {
        const existingNotif = notifications.find(n => n.id === `close-${poll.id}`);
        if (!existingNotif) {
          const winner = poll.options.reduce((max, opt) => 
            opt.votes.length > max.votes.length ? opt : max
          );
          const closeNotif: Notification = {
            id: `close-${poll.id}`,
            type: 'poll_closed',
            message: `✅ Poll closed! Winner: "${winner.text}" with ${winner.votes.length} votes 🏆`,
            timestamp: new Date().toISOString(),
          };
          setNotifications(prev => [...prev, closeNotif]);
        }
      }
    });
  }, [polls, notifications]);

  // Load chat messages on mount
  useEffect(() => {
    const loadChatMessages = async () => {
      if (!tripId) return;
      console.log('💬 [Chat] Loading messages for trip:', tripId);
      try {
        const response = await fetch(`/api/social-cart/chat?tripId=${tripId}`);
        if (response.ok) {
          const data = await response.json();
          console.log('✅ [Chat] Loaded', data.messages?.length || 0, 'messages');
          setChatMessages(data.messages || []);
        }
      } catch (error) {
        console.error('❌ [Chat] Load error:', error);
      }
    };
    loadChatMessages();
  }, [tripId]);

  // Listen for real-time chat messages
  useEffect(() => {
    const handleChatMessage = (event: any) => {
      console.log('📨 [Chat] New message received:', event.detail);
      setChatMessages(prev => [...prev, event.detail]);
    };
    
    const handleBookingConfirmed = (event: any) => {
      console.log('📋 [Chat] Booking confirmed:', event.detail);
      const { bookingId, hotelName, checkIn, checkOut, roomType, finalPrice, groupSize } = event.detail;
      
      // Add booking confirmation as system message
      const bookingMessage = {
        id: `booking-${bookingId}`,
        tripId: tripId || '',
        senderId: 'system',
        senderName: 'System',
        senderAvatar: '🎉',
        message: `🎊 Booking Confirmed!\n\nHotel: ${hotelName}\nCheck-in: ${checkIn}\nCheck-out: ${checkOut}\nRoom: ${roomType}\nBooking ID: ${bookingId}\nFinal Price: ₹${finalPrice.toLocaleString()}\nGroup Size: ${groupSize} members\n\n✅ The admin has successfully completed the booking!`,
        timestamp: new Date().toISOString(),
      };
      
      setChatMessages(prev => [...prev, bookingMessage]);
    };
    
    window.addEventListener('chat-message', handleChatMessage);
    window.addEventListener('booking-confirmed', handleBookingConfirmed);
    
    return () => {
      window.removeEventListener('chat-message', handleChatMessage);
      window.removeEventListener('booking-confirmed', handleBookingConfirmed);
    };
  }, [tripId]);

  // Remove member (admin only)
  const handleRemoveMember = async (memberId: string) => {
    if (!isAdmin || !currentUserId) return;
    
    console.log('🗑️ [Remove] Initial state:', {
      memberId,
      tripId,
      adminId: currentUserId,
      currentMembers: members.map(m => ({ id: m.id, name: m.name }))
    });
    
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const payload = { tripId, memberId, adminId: currentUserId };
      console.log('📤 [Remove] Sending request:', payload);
      
      const response = await fetch('/api/social-cart/remove-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('📥 [Remove] Response status:', response.status);
      
      if (response.ok) {
        console.log('✅ Member removed successfully');
        // Update will come via SSE
      } else {
        const error = await response.json();
        console.error('❌ [Remove] Error response:', error);
        alert(error.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('❌ [Remove] Exception:', error);
      alert('Failed to remove member');
    }
  };

  // Refresh member list when opening member manager
  const handleOpenMemberManager = async () => {
    setShowMemberManager(!showMemberManager);
    
    if (!showMemberManager && tripId) {
      // Opening manager - refresh member list
      try {
        const response = await fetch(`/api/social-cart/join?tripId=${tripId}`);
        if (response.ok) {
          const data = await response.json();
          useTripStore.setState({ members: data.trip.members });
          console.log('🔄 [MemberManager] Refreshed member list:', data.trip.members.map((m: any) => ({ id: m.id, name: m.name })));
        }
      } catch (error) {
        console.error('⚠️ [MemberManager] Failed to refresh:', error);
      }
    }
  };

  // Toggle link status (admin only)
  const handleToggleLink = async () => {
    if (!isAdmin || !currentUserId) return;

    try {
      const newStatus = !isLinkActive;
      const response = await fetch('/api/social-cart/toggle-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, adminId: currentUserId, isActive: newStatus }),
      });

      if (response.ok) {
        setIsLinkActive(newStatus);
        console.log('✅ Link status toggled:', newStatus);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to toggle link');
      }
    } catch (error) {
      console.error('Failed to toggle link:', error);
      alert('Failed to toggle link');
    }
  };

  // Send chat message
  const handleSendMessage = async () => {
    console.log('📤 [Chat] Send clicked. Input:', messageInput);
    if (!messageInput.trim() || !currentUserId || !tripId) {
      console.warn('⚠️ [Chat] Cannot send - missing data');
      return;
    }
    const currentUser = members.find(m => m.id === currentUserId);
    if (!currentUser) {
      alert('You have been removed from this trip and cannot send messages.');
      return;
    }

    try {
      console.log('📤 [Chat] Sending message...');
      const response = await fetch('/api/social-cart/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          senderId: currentUserId,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          message: messageInput.trim(),
        }),
      });
      if (response.ok) {
        console.log('✅ [Chat] Message sent!');
        setMessageInput('');
      } else {
        console.error('❌ [Chat] Send failed:', response.status);
      }
    } catch (error) {
      console.error('❌ [Chat] Send error:', error);
      alert('Failed to send message');
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    pollsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [polls, notifications, chatMessages]);

  const handleCreatePoll = async (poll: Poll) => {
    try {
      console.log('📊 [GroupChatPolling] Creating poll:', poll);
      
      // Check if poll of this type already exists
      const existingPollOfType = polls.find(p => p.type === poll.type);
      if (existingPollOfType) {
        alert(`A ${poll.type} poll already exists! You can only create one poll per type.`);
        return;
      }
      
      // Send to API
      const response = await fetch('/api/social-cart/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          poll,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create poll');
      }

      const data = await response.json();
      console.log('✅ [GroupChatPolling] Poll created:', data);
      
      // DON'T add locally - will come via SSE to avoid duplicates
      setShowPollCreator(false);
    } catch (error) {
      console.error('❌ [GroupChatPolling] Failed to create poll:', error);
      alert('Failed to create poll. Please try again.');
    }
  };

  const handleVote = async (pollId: string, optionId: string | string[]) => {
    if (!currentUserId) return;
    
    // Check if user is still a member
    const currentUser = members.find(m => m.id === currentUserId);
    if (!currentUser) {
      alert('You have been removed from this trip and cannot vote.');
      return;
    }

    try {
      console.log('🗳️ [GroupChatPolling] Voting:', { pollId, optionId, currentUserId });
      
      // Send to API
      const response = await fetch('/api/social-cart/polls/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          pollId,
          optionId,
          userId: currentUserId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to vote');
      }

      const data = await response.json();
      console.log('✅ [GroupChatPolling] Vote recorded:', data);
      
      // Update will come via SSE - no need for local update to avoid race conditions
    } catch (error) {
      console.error('❌ [GroupChatPolling] Failed to vote:', error);
      alert('Failed to record vote. Please try again.');
    }
  };

  // Start all polls at once
  const handleStartAllPolls = async () => {
    if (!isAdmin || !currentUserId || polls.length > 0) return;

    try {
      console.log('🚀 [GroupChatPolling] Starting all polls...');
      
      const pollTypes = ['budget', 'dates', 'amenities'];
      
      for (const pollType of pollTypes) {
        const response = await fetch('/api/social-cart/polls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId,
            pollType,
            duration: 300, // 5 minutes per poll
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create ${pollType} poll`);
        }

        console.log(`✅ [GroupChatPolling] Created ${pollType} poll`);
      }
      
      console.log('✅ [GroupChatPolling] All polls created successfully');
    } catch (error) {
      console.error('❌ [GroupChatPolling] Failed to create polls:', error);
      alert('Failed to create polls. Please try again.');
    }
  };

  const handleClosePoll = async () => {
    if (!activePoll) return;

    try {
      console.log('✅ [GroupChatPolling] Closing poll:', activePoll.id);
      
      // Send to API
      const response = await fetch('/api/social-cart/polls/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          pollId: activePoll.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to close poll');
      }

      const data = await response.json();
      console.log('✅ [GroupChatPolling] Poll closed:', data);
      
      // Update will come via SSE - notification will be added by useEffect
    } catch (error) {
      console.error('❌ [GroupChatPolling] Failed to close poll:', error);
      alert('Failed to close poll. Please try again.');
    }
  };

  // Close all polls at once
  const handleCloseAllPolls = async () => {
    const activePolls = polls.filter(p => p.status === 'active');
    if (activePolls.length === 0) return;

    try {
      console.log('✅ [GroupChatPolling] Closing all polls...');
      
      for (const poll of activePolls) {
        const response = await fetch('/api/social-cart/polls/close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId,
            pollId: poll.id,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to close poll ${poll.id}`);
        }

        console.log(`✅ [GroupChatPolling] Closed poll: ${poll.id}`);
      }
      
      console.log('✅ [GroupChatPolling] All polls closed successfully');
    } catch (error) {
      console.error('❌ [GroupChatPolling] Failed to close all polls:', error);
      alert('Failed to close all polls. Please try again.');
    }
  };

  // Close hotel voting
  const handleCloseHotelVoting = async () => {
    if (!tripId || hotelVotingStatus !== 'active') return;

    try {
      console.log('🔒 [GroupChatPolling] Closing hotel voting...');
      
      const response = await fetch('/api/social-cart/hotels/close-voting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId }),
      });

      if (!response.ok) {
        throw new Error('Failed to close hotel voting');
      }

      console.log('✅ [GroupChatPolling] Hotel voting closed successfully');
    } catch (error) {
      console.error('❌ [GroupChatPolling] Failed to close hotel voting:', error);
      alert('Failed to close hotel voting. Please try again.');
    }
  };

  // Leave cart (for non-admin members)
  const handleLeaveCart = async () => {
    if (isAdmin || !currentUserId) return;

    if (!confirm('Are you sure you want to leave this trip? You will be removed from the group.')) return;

    try {
      console.log('👋 [GroupChatPolling] Leaving cart...');
      
      const response = await fetch('/api/social-cart/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          memberId: currentUserId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to leave cart');
      }

      alert('You have left the trip successfully.');
      
      // Redirect to homepage
      useTripStore.setState({ currentStep: 'home', tripId: null, currentUserId: null });
      window.location.href = '/';
    } catch (error) {
      console.error('❌ [GroupChatPolling] Failed to leave cart:', error);
      alert('Failed to leave cart. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* MakeMyTrip Header */}
      <div className="bg-[#0071c2] px-6 py-4 shadow-md">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-white text-2xl font-normal">make</span>
              <span className="bg-red-600 text-white px-2 py-1 text-xl font-bold italic rounded">my</span>
              <span className="text-white text-2xl font-normal">trip</span>
            </div>
            
            {/* Personalized Greeting */}
            {currentUser && (
              <div className="text-white">
                <span className="text-lg">Hello, </span>
                <span className="text-lg font-semibold">{currentUser.name}</span>
                {currentUser.isAdmin && (
                  <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded">Admin</span>
                )}
              </div>
            )}
          </div>
          
          {/* Promotional Banner */}
          <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div>
              <div className="text-sm font-semibold">₹200+ off on your booking</div>
              <div className="text-xs opacity-90">Limited time offer</div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Controls */}
      {isAdmin && (
        <div className="bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {polls.length === 0 ? (
                <button
                  onClick={handleStartAllPolls}
                  className="px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 bg-gradient-to-r from-[#0071c2] to-purple-600 text-white hover:from-[#005fa3] hover:to-purple-700 shadow-lg"
                >
                  <BarChart3 className="w-5 h-5" />
                  Start All Polls (Budget, Dates, Amenities)
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowPollCreator(true)}
                    disabled={polls.length >= 3}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                      polls.length >= 3
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-[#0071c2] text-white hover:bg-[#005fa3]'
                    }`}
                  >
                    <BarChart3 className="w-5 h-5" />
                    Create Poll {polls.length > 0 && `(${3 - polls.length} left)`}
                  </button>
                  
                  <div className="flex gap-1">
                    {polls.find(p => p.type === 'budget') && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">✓ Budget</span>
                    )}
                    {polls.find(p => p.type === 'dates') && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">✓ Dates</span>
                    )}
                    {polls.find(p => p.type === 'amenities') && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">✓ Amenities</span>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {polls.some(p => p.status === 'active') && (
                <button
                  onClick={handleCloseAllPolls}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
                >
                  Close All Polls & Publish Results
                </button>
              )}
              
              {/* Proceed to Hotel Selection - Show when all 3 polls are closed and no hotels shortlisted yet */}
              {polls.length === 3 && polls.every(p => p.status === 'closed') && shortlistedHotels.length === 0 && (
                <button
                  onClick={() => setShowHotelSelection(true)}
                  className="px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg animate-pulse"
                >
                  <span>🏨</span>
                  Shortlist Hotels for Voting
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave Cart Button (Non-Admin) */}
      {!isAdmin && currentUser && polls.some(p => p.status === 'closed') && (
        <div className="bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-end">
            <button
              onClick={handleLeaveCart}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all flex items-center gap-2"
            >
              <span>👋</span>
              Leave Cart
            </button>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full flex gap-6 p-6">
          {/* Left Column - Polls */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Notifications */}
            {notifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 rounded-lg p-3 border border-blue-200"
              >
                <p className="text-sm text-gray-700 font-medium">{notif.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notif.timestamp).toLocaleTimeString()}
                </p>
              </motion.div>
            ))}
            
            {/* Empty State */}
            {polls.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <div className="text-6xl mb-4">🗳️</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to Vote!</h2>
                <p className="text-gray-600">
                  {isAdmin 
                    ? "Create your first poll to start planning!"
                    : "Waiting for admin to create a poll..."}
                </p>
              </div>
            )}
            
            {/* Polls */}
            <AnimatePresence>
              {polls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  onVote={handleVote}
                  currentUserId={currentUserId || ''}
                  members={members}
                  timeRemaining={pollTimers[poll.id]}
                />
              ))}
            </AnimatePresence>
            
            {/* Hotel Voting Cards - Show after polls are closed and hotels are shortlisted */}
            {shortlistedHotels.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 mt-6"
              >
                {/* Hotel Voting Header with Timer */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">
                        🏨 Vote for Your Favorite Hotel
                      </h2>
                      <p className="text-purple-100">
                        React with 👍 or 👎 to help the group decide
                      </p>
                    </div>
                    {hotelVotingStatus === 'active' && hotelVotingTimer && (
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
                        <div className="text-xs font-semibold mb-1">TIME REMAINING</div>
                        <div className="text-3xl font-bold">{hotelVotingTimer}</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Admin Close Voting Button */}
                  {isAdmin && hotelVotingStatus === 'active' && (
                    <button
                      onClick={handleCloseHotelVoting}
                      className="w-full mt-3 px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-all"
                    >
                      Close Voting & Announce Winner
                    </button>
                  )}
                  
                  {/* Voting Closed Message */}
                  {hotelVotingStatus === 'closed' && selectedHotel && (
                    <div className="mt-3 bg-white/20 backdrop-blur-sm rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-4xl">{selectedHotel.image}</span>
                        <div>
                          <div className="text-sm font-semibold mb-1">🏆 WINNER SELECTED!</div>
                          <div className="text-xl font-bold">{selectedHotel.name}</div>
                          <div className="text-sm text-purple-100">{selectedHotel.location}</div>
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => useTripStore.setState({ currentStep: 'booking' })}
                          className="w-full px-4 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
                        >
                          <span>🏨</span>
                          Proceed to Room Selection & Booking
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Hotel Cards */}
                {hotelVotingStatus === 'active' && shortlistedHotels.map((hotel) => (
                  <HotelVotingCard
                    key={hotel.id}
                    hotel={hotel}
                    currentUserId={currentUserId || ''}
                    tripId={tripId || ''}
                    votingClosed={false}
                  />
                ))}
                
                {/* Show results after voting closed */}
                {hotelVotingStatus === 'closed' && shortlistedHotels.map((hotel) => (
                  <HotelVotingCard
                    key={hotel.id}
                    hotel={hotel}
                    currentUserId={currentUserId || ''}
                    tripId={tripId || ''}
                    votingClosed={true}
                  />
                ))}
              </motion.div>
            )}
            
            <div ref={pollsEndRef} />
          </div>

          {/* Right Column - Group Chat */}
          <div className="w-96 bg-white rounded-xl shadow-lg flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-900">Group Chat</h2>
                {isAdmin && (
                  <button
                    onClick={handleOpenMemberManager}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-all"
                  >
                    {showMemberManager ? 'Hide' : 'Manage'}
                  </button>
                )}
              </div>
              
              {/* Timer removed - cart already created, no need to show expiry */}

              {/* Admin Controls */}
              {isAdmin && showMemberManager && (
                <div className="space-y-2 mt-2 p-2 bg-gray-50 rounded-lg">
                  {/* Link Status */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Invitation Link:</span>
                    <button
                      onClick={handleToggleLink}
                      className={`px-2 py-1 rounded font-semibold ${
                        isLinkActive 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {isLinkActive ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                  
                  {/* Link Expiration */}
                  {linkExpiresAt && (
                    <div className="text-xs text-gray-600">
                      Expires: {new Date(linkExpiresAt).toLocaleString()}
                    </div>
                  )}
                  
                  {/* Member Count */}
                  <div className="text-xs text-gray-600">
                    Members: {members.length} / {useTripStore.getState().requiredMembers}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Welcome message as chat */}
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  S
                </div>
                <div>
                  <div className="bg-gray-100 rounded-lg px-3 py-2 max-w-xs">
                    <p className="text-sm text-gray-800">
                      Welcome to {tripName}! All {members.length} friends are here. Let's plan this trip! 🎉
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">System</p>
                </div>
              </div>

              {/* Real Chat Messages */}
              {chatMessages.map((msg) => {
                const isOwnMessage = msg.senderId === currentUserId;
                return (
                  <div key={msg.id} className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                    {!isOwnMessage && (
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: msg.senderAvatar || '#3b82f6' }}
                      >
                        {msg.senderName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={isOwnMessage ? 'flex flex-col items-end' : ''}>
                      <div className={`rounded-lg px-3 py-2 max-w-xs ${
                        isOwnMessage ? 'bg-[#0071c2] text-white' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {!isOwnMessage && (
                          <p className="text-xs font-semibold mb-1 opacity-70">{msg.senderName}</p>
                        )}
                        <p className="text-sm">{msg.message}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {isOwnMessage ? 'You' : msg.senderName} · {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />

              {/* Poll notifications */}
              {notifications.slice(1).map((notif) => (
                <div key={notif.id} className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    🔔
                  </div>
                  <div>
                    <div className="bg-blue-50 rounded-lg px-3 py-2 max-w-xs">
                      <p className="text-sm text-gray-800">{notif.message}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notif.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}

              {/* Members List (Admin Only) */}
              {isAdmin && showMemberManager && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Members ({members.length})</h3>
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: member.avatar || '#3b82f6' }}
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{member.name}</span>
                          {member.isAdmin && <span className="text-blue-600">(Admin)</span>}
                        </div>
                        {!member.isAdmin && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-red-600 hover:text-red-800 font-semibold"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Poll Consensus */}
              {polls.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Poll Consensus</h3>
                  <div className="space-y-3">
                    {polls.map((poll) => {
                      const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
                      return (
                        <div key={poll.id}>
                          <p className="text-xs font-semibold text-gray-700 mb-1">
                            {poll.type === 'budget' ? 'Budget' : poll.type === 'dates' ? 'Travel Dates' : 'Amenities'}
                          </p>
                          {poll.options.map((opt) => {
                            const percentage = totalVotes > 0 ? (opt.votes.length / totalVotes) * 100 : 0;
                            return (
                              <div key={opt.id} className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-gray-600 flex-1 truncate">{opt.text}</span>
                                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="bg-[#0071c2] h-1.5 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-600 w-8 text-right">{Math.round(percentage)}%</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {/* Match Score - Show once below Poll Consensus */}
                  {polls.some(p => p.status === 'closed') && currentUserId && (
                    <MatchScore polls={polls} currentUserId={currentUserId} />
                  )}
                </div>
              )}
            </div>
            
            <div className="px-4 py-3 border-t border-gray-200">
              {currentUser ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0071c2] text-sm"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className={`p-2 rounded-lg transition-all ${
                      messageInput.trim()
                        ? 'bg-[#0071c2] text-white hover:bg-[#005fa3]'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-2 text-sm text-red-600 bg-red-50 rounded-lg">
                  You have been removed from this trip
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Only show for admin or when no active poll */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        {!activePoll && !isAdmin && (
          <div className="text-center text-gray-500 py-3">
            <p className="text-sm">Waiting for admin to create a poll...</p>
          </div>
        )}
        {activePoll && !isAdmin && (
          <div className="text-center text-gray-500 py-3">
            <p className="text-sm">Vote on the poll above 👆</p>
          </div>
        )}
      </div>

      {/* Poll Creator Modal */}
      {showPollCreator && (
        <PollCreatorModal
          onClose={() => setShowPollCreator(false)}
          onCreate={handleCreatePoll}
          existingPollTypes={polls.map(p => p.type)}
        />
      )}
      
      {/* Hotel Selection Modal */}
      {showHotelSelection && (
        <HotelSelectionModal
          destination={destination}
          tripId={tripId || ''}
          onClose={() => setShowHotelSelection(false)}
        />
      )}
    </div>
  );
}

// Poll Card Component
function PollCard({ 
  poll, 
  onVote,
  currentUserId,
  members,
  timeRemaining
}: { 
  poll: Poll;
  onVote: (pollId: string, optionId: string | string[]) => void;
  currentUserId: string;
  members: any[];
  timeRemaining?: string;
}) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]); // For multi-select (amenities)
  
  const userVote = poll.options.find(opt => opt.votes.includes(currentUserId));
  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
  const isClosed = poll.status === 'closed';
  const isMultiSelect = poll.type === 'amenities';

  // Initialize selected option from existing vote
  useEffect(() => {
    if (userVote && !selectedOption && !isMultiSelect) {
      setSelectedOption(userVote.id);
    }
  }, [userVote, selectedOption, isMultiSelect]);

  // Toggle multi-select option
  const toggleOption = (optionId: string) => {
    if (selectedOptions.includes(optionId)) {
      setSelectedOptions(selectedOptions.filter(id => id !== optionId));
    } else {
      setSelectedOptions([...selectedOptions, optionId]);
    }
  };
  
  // Find most popular option
  const popularOption = poll.options.reduce((max, opt) => 
    opt.votes.length > max.votes.length ? opt : max
  );
  
  const isExpired = timeRemaining === 'Time\'s Up!';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"
    >
      {/* Removed poll header to fix UI glitch */}

      <div className="p-6">
        {/* Poll Title */}
        <h3 className="font-bold text-xl text-gray-900 mb-4">{poll.question}</h3>
      
      {/* Countdown Timer */}
      {!isClosed && timeRemaining && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 p-3 rounded-xl border-2 ${
            isExpired 
              ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-300'
              : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-sm font-semibold ${
              isExpired ? 'text-red-700' : 'text-orange-700'
            }`}>
              {isExpired ? '⏰ Time\'s Up!' : '⏱️ Vote Now!'}
            </p>
            <p className={`text-lg font-bold ${
              isExpired ? 'text-red-600' : 'text-orange-600'
            }`}>
              {timeRemaining}
            </p>
          </div>
        </motion.div>
      )}

        {/* Poll Options - Radio/Checkbox Style */}
        <div className="space-y-2 mb-4">
          {poll.options.map((option) => {
            const percentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0;
            const isSelected = isMultiSelect ? selectedOptions.includes(option.id) : selectedOption === option.id;
            const hasVoted = option.votes.includes(currentUserId);
            const isWinner = isClosed && option.votes.length === Math.max(...poll.options.map(o => o.votes.length));

            return (
              <button
                key={option.id}
                onClick={() => !isClosed && (isMultiSelect ? toggleOption(option.id) : setSelectedOption(option.id))}
                disabled={isClosed}
                className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${
                  isClosed
                    ? 'border-gray-300 bg-gray-50 cursor-default'
                    : isSelected
                      ? 'border-[#0071c2] bg-blue-50'
                      : 'border-gray-300 hover:border-[#0071c2] hover:bg-gray-50 cursor-pointer'
                }`}
              >
                {/* Radio Button or Checkbox */}
                {isMultiSelect ? (
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'border-[#0071c2] bg-[#0071c2]' : 'border-gray-400'
                  }`}>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                ) : (
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'border-[#0071c2]' : 'border-gray-400'
                  }`}>
                    {isSelected && (
                      <div className="w-3 h-3 rounded-full bg-[#0071c2]"></div>
                    )}
                  </div>
                )}

                {/* Option Text */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{option.text}</span>
                    {isWinner && isClosed && <span className="text-xl">🏆</span>}
                  </div>
                  
                  {/* Progress Bar */}
                  {totalVotes > 0 && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          isWinner && isClosed ? 'bg-green-500' : 'bg-[#0071c2]'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Submit Button */}
        {!isClosed && (
          <button
            onClick={() => {
              if (isMultiSelect && selectedOptions.length > 0) {
                // For multi-select, send all selected option IDs in one request
                onVote(poll.id, selectedOptions);
              } else if (selectedOption) {
                onVote(poll.id, selectedOption);
              }
            }}
            disabled={isMultiSelect ? selectedOptions.length === 0 : !selectedOption}
            className={`w-full py-3 rounded-lg font-semibold transition-all ${
              (isMultiSelect ? selectedOptions.length > 0 : selectedOption)
                ? 'bg-[#0071c2] text-white hover:bg-[#005fa3]'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Submit {isMultiSelect && selectedOptions.length > 0 && `(${selectedOptions.length} selected)`}
          </button>
        )}

        {/* Closed Badge */}
        {isClosed && (
          <div className="text-center py-2 bg-green-100 text-green-700 rounded-lg font-semibold">
            Poll Closed
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Match Score Component
function MatchScore({ polls, currentUserId }: { polls: Poll[]; currentUserId: string }) {
  const closedPolls = polls.filter(p => p.status === 'closed');
  
  // Find user's votes in all closed polls
  let matchCount = 0;
  let totalPolls = closedPolls.length;
  
  closedPolls.forEach(p => {
    const maxVotes = Math.max(...p.options.map(o => o.votes.length));

    if (p.type === 'amenities') {
      // Multi-select: user can pick multiple amenities
      const userOptions = p.options.filter(opt => opt.votes.includes(currentUserId));
      if (userOptions.length === 0 || maxVotes === 0) {
        return;
      }

      // Softer rule: count as a match if AT LEAST ONE of the user's amenities
      // is among the top-voted options
      const anyTopChoice = userOptions.some(opt => opt.votes.length === maxVotes);
      if (anyTopChoice) {
        matchCount++;
      }
    } else {
      // Single-select polls (budget, dates)
      const userVote = p.options.find(opt => opt.votes.includes(currentUserId));
      if (userVote && maxVotes > 0 && userVote.votes.length === maxVotes) {
        matchCount++;
      }
    }
  });
  
  const matchPercentage = totalPolls > 0 ? (matchCount / totalPolls) * 100 : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-gray-900">Your Match Score</h4>
        <span className="text-2xl font-bold text-[#0071c2]">{matchCount}/{totalPolls}</span>
      </div>
      
      <p className="text-xs text-gray-600 mb-3">
        {matchCount === totalPolls 
          ? '🎉 Perfect! All your choices matched the group!' 
          : matchCount > totalPolls / 2
            ? '👍 Great! Most of your choices aligned with the group.'
            : '💡 Your preferences are unique!'}
      </p>
      
      {/* Visual Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 rounded-full transition-all duration-500 bg-gradient-to-r from-[#0071c2] to-purple-500"
          style={{ width: `${matchPercentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1 text-center">{Math.round(matchPercentage)}% match</p>
    </motion.div>
  );
}

// Poll Creator Modal
function PollCreatorModal({
  onClose,
  onCreate,
  existingPollTypes = [],
}: {
  onClose: () => void;
  onCreate: (poll: Poll) => void;
  existingPollTypes?: ('budget' | 'dates' | 'amenities')[];
}) {
  const [pollType, setPollType] = useState<'budget' | 'dates' | 'amenities'>('budget');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);

  const pollTemplates = {
    budget: {
      question: "What's your budget range for this trip?",
      options: ['₹10,000 - ₹20,000', '₹20,000 - ₹30,000', '₹30,000 - ₹50,000', '₹50,000+'],
    },
    dates: {
      question: 'Which dates work best for you?',
      options: ['Dec 20-25', 'Dec 26-31', 'Jan 1-5', 'Jan 6-10'],
    },
    amenities: {
      question: 'Which amenities are most important?',
      options: ['Swimming Pool', 'Gym', 'Beach Access', 'Spa', 'Restaurant', 'WiFi'],
    },
  };

  const loadTemplate = () => {
    const template = pollTemplates[pollType];
    setQuestion(template.question);
    setOptions(template.options);
  };

  const handleCreate = () => {
    const poll: Poll = {
      id: Date.now().toString(),
      type: pollType,
      question: question || pollTemplates[pollType].question,
      options: options.filter(o => o.trim()).map((text, idx) => ({
        id: `opt${idx}`,
        text,
        votes: [],
      })),
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    onCreate(poll);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
      >
        <h2 className="text-2xl font-bold mb-4">Create Poll</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Poll Type</label>
            <select
              value={pollType}
              onChange={(e) => setPollType(e.target.value as any)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-mmt-blue focus:outline-none"
            >
              <option value="budget" disabled={existingPollTypes.includes('budget')}>
                💰 Budget Range {existingPollTypes.includes('budget') ? '(Already created)' : ''}
              </option>
              <option value="dates" disabled={existingPollTypes.includes('dates')}>
                📅 Date Range {existingPollTypes.includes('dates') ? '(Already created)' : ''}
              </option>
              <option value="amenities" disabled={existingPollTypes.includes('amenities')}>
                ✨ Amenities {existingPollTypes.includes('amenities') ? '(Already created)' : ''}
              </option>
            </select>
            {existingPollTypes.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {existingPollTypes.length} of 3 poll types already created
              </p>
            )}
          </div>

          <button
            onClick={loadTemplate}
            className="text-sm text-mmt-blue hover:underline"
          >
            Load template for {pollType}
          </button>

          <div>
            <label className="block text-sm font-medium mb-2">Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter poll question"
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-mmt-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Options</label>
            {options.map((option, idx) => (
              <input
                key={idx}
                type="text"
                value={option}
                onChange={(e) => {
                  const newOptions = [...options];
                  newOptions[idx] = e.target.value;
                  setOptions(newOptions);
                }}
                placeholder={`Option ${idx + 1}`}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-mmt-blue focus:outline-none mb-2"
              />
            ))}
            <button
              onClick={() => setOptions([...options, ''])}
              className="text-sm text-mmt-blue hover:underline"
            >
              + Add option
            </button>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-mmt-blue to-mmt-purple text-white rounded-xl hover:shadow-lg"
          >
            Create Poll
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Hotel Voting Card Component
function HotelVotingCard({ hotel, currentUserId, tripId, votingClosed }: { hotel: any; currentUserId: string; tripId: string; votingClosed: boolean }) {
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedVote, setSelectedVote] = useState<'love' | 'dislike' | null>(null);
  const [commentText, setCommentText] = useState('');

  const userVote = hotel.votes[currentUserId];
  const loveCount = Object.values(hotel.votes).filter((v: any) => v.vote === 'love').length;
  const dislikeCount = Object.values(hotel.votes).filter((v: any) => v.vote === 'dislike').length;

  const handleVoteClick = (vote: 'love' | 'dislike') => {
    if (votingClosed) return; // Prevent voting if closed
    setSelectedVote(vote);
    setCommentModalOpen(true);
  };

  const handleSubmitVote = async () => {
    if (!selectedVote) return;
    
    try {
      const response = await fetch('/api/social-cart/hotels/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          hotelId: hotel.id,
          vote: selectedVote,
          comment: commentText || undefined,
          userId: currentUserId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit vote');
      }

      setCommentModalOpen(false);
      setSelectedVote(null);
      setCommentText('');
    } catch (error) {
      console.error('Failed to submit vote:', error);
      alert('Failed to submit vote. Please try again.');
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"
      >
        <div className="p-6">
          {/* Hotel Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{hotel.image}</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{hotel.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{hotel.location}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-yellow-500 mb-1">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-bold">{hotel.rating}</span>
              </div>
              <div className="text-lg font-bold text-[#0071c2]">
                ₹{hotel.price.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">/night</div>
            </div>
          </div>

          {/* Amenities */}
          <div className="flex flex-wrap gap-2 mb-4">
            {hotel.amenities.slice(0, 5).map((amenity: string) => (
              <span key={amenity} className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700">
                {amenity}
              </span>
            ))}
          </div>

          {/* Voting Buttons */}
          <div className="flex gap-3 mb-3">
            <motion.button
              onClick={() => handleVoteClick('love')}
              disabled={votingClosed}
              className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                votingClosed
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : userVote?.vote === 'love'
                  ? 'bg-green-500 text-white'
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}
              whileHover={votingClosed ? {} : { scale: 1.02 }}
              whileTap={votingClosed ? {} : { scale: 0.98 }}
            >
              <span>👍</span>
              <span>{loveCount}</span>
            </motion.button>

            <motion.button
              onClick={() => handleVoteClick('dislike')}
              disabled={votingClosed}
              className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                votingClosed
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : userVote?.vote === 'dislike'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
              whileHover={votingClosed ? {} : { scale: 1.02 }}
              whileTap={votingClosed ? {} : { scale: 0.98 }}
            >
              <span>👎</span>
              <span>{dislikeCount}</span>
            </motion.button>
          </div>
          
          {/* Voting Closed Message */}
          {votingClosed && (
            <div className="text-center text-sm text-gray-600 mb-3">
              🔒 Voting has been closed
            </div>
          )}

          {/* User's Comment */}
          {userVote?.comment && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 mb-1">Your comment:</p>
              <p className="text-sm text-gray-700">{userVote.comment}</p>
            </div>
          )}

          {/* Vote Status */}
          {loveCount > 0 && (
            <div className="text-sm text-center mt-3">
              <span className="text-green-600 font-semibold">
                🔥 {loveCount} {loveCount === 1 ? 'friend' : 'friends'} loved this!
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Comment Modal */}
      <AnimatePresence>
        {commentModalOpen && selectedVote && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCommentModalOpen(false)}
            />
            
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                      selectedVote === 'love' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {selectedVote === 'love' ? '👍' : '👎'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {selectedVote === 'love' ? 'Love this hotel!' : 'Not a fan?'}
                      </h3>
                      <p className="text-sm text-gray-600">Tell your friends why</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCommentModalOpen(false)}
                    className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Add a comment (optional)
                  </label>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={selectedVote === 'love' 
                      ? "E.g., 'Close to the beach and within our budget!'" 
                      : "E.g., 'Too expensive for what it offers'"}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#0071c2] focus:outline-none resize-none"
                    rows={4}
                    maxLength={200}
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {commentText.length}/200 characters
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setCommentModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitVote}
                    className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white ${
                      selectedVote === 'love'
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    Submit Vote
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Hotel Selection Modal Component
function HotelSelectionModal({ destination, tripId, onClose }: { destination: string; tripId: string; onClose: () => void }) {
  const HotelSelection = require('./HotelSelection').default;
  
  const handleShareShortlist = async (hotels: any[]) => {
    try {
      const response = await fetch('/api/social-cart/hotels/shortlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, hotels }),
      });

      if (!response.ok) {
        throw new Error('Failed to share shortlist');
      }

      onClose();
    } catch (error) {
      console.error('Failed to share shortlist:', error);
      alert('Failed to share shortlist. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-auto">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Select Hotels for Voting</h2>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
        >
          <X className="w-6 h-6 text-gray-500" />
        </button>
      </div>
      <HotelSelection destination={destination} onShareShortlist={handleShareShortlist} />
    </div>
  );
}
