'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, Users, Calendar, DollarSign, Sparkles, TrendingUp, BarChart3, MapPin, Star, X, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { useTripStore } from '@/lib/store';
import Header from './Header';

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
  const { tripId, currentUserId, members, tripName, destination, polls, activePoll, addPoll, updatePoll, setActivePoll, shortlistedHotels, addHotel, hotelVotingStatus, hotelVotingExpiresAt, selectedHotel, bookingConfirmation } = useTripStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [chatNotifications, setChatNotifications] = useState<Notification[]>([]); // Persistent chat notifications
  const [showPollWizard, setShowPollWizard] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showMemberManager, setShowMemberManager] = useState(false);
  const [linkExpiresAt, setLinkExpiresAt] = useState<string | null>(null);
  const [isLinkActive, setIsLinkActive] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [pollTimers, setPollTimers] = useState<Record<string, string>>({});
  const [showHotelSelection, setShowHotelSelection] = useState(false);
  const [hotelVotingTimer, setHotelVotingTimer] = useState<string>('');
  const [collapsedPolls, setCollapsedPolls] = useState<Set<string>>(new Set());
  const pollsEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const processedBookingMessages = useRef(new Set<string>());
  const notifiedPollCreations = useRef(new Set<string>()); // Track which polls we've notified about (creation)
  const notifiedPollClosures = useRef(new Set<string>()); // Track which polls we've notified about (closure)
  
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
    
    // Only notify if we haven't already notified about this poll's creation
    if (!notifiedPollCreations.current.has(latestPoll.id) && latestPoll.createdBy !== currentUserId) {
      const pollNotif: Notification = {
        id: `poll-${latestPoll.id}`,
        type: 'poll_created',
        message: `📊 New poll: "${latestPoll.question}" - Cast your vote now!`,
        timestamp: new Date().toISOString(),
      };
      setNotifications(prev => [...prev, pollNotif]); // Floating notification (auto-dismiss)
      setChatNotifications(prev => [...prev, pollNotif]); // Persistent chat notification
      notifiedPollCreations.current.add(latestPoll.id);
      console.log('📢 [Notifications] Poll created notification added:', pollNotif.id);
    }
  }, [polls.length]); // Only depend on polls.length, not the entire polls array

  // Watch for closed polls and add winner notification
  useEffect(() => {
    polls.forEach(poll => {
      if (poll.status === 'closed' && !notifiedPollClosures.current.has(poll.id)) {
        const winner = poll.options.reduce((max, opt) => 
          opt.votes.length > max.votes.length ? opt : max
        );
        const closeNotif: Notification = {
          id: `close-${poll.id}`,
          type: 'poll_closed',
          message: `✅ Poll closed! Winner: "${winner.text}" with ${winner.votes.length} votes 🏆`,
          timestamp: new Date().toISOString(),
        };
        setNotifications(prev => [...prev, closeNotif]); // Floating notification (auto-dismiss)
        setChatNotifications(prev => [...prev, closeNotif]); // Persistent chat notification
        notifiedPollClosures.current.add(poll.id);
        console.log('📢 [Notifications] Poll closed notification added:', poll.id);
        
        // Auto-collapse closed polls
        setCollapsedPolls(prev => {
          const next = new Set(prev);
          next.add(poll.id);
          return next;
        });
        console.log('📋 [Poll] Auto-collapsed closed poll:', poll.id);
      }
    });
  }, [polls.map(p => p.status).join(',')]); // Only depend on poll statuses changing, not vote counts

  // Auto-dismiss notifications after 15 seconds - only remove first one when timer expires
  useEffect(() => {
    if (notifications.length === 0) return;
    
    const firstNotif = notifications[0];
    const timer = setTimeout(() => {
      setNotifications(prev => {
        // Only remove if it's still the same notification (by id)
        if (prev.length > 0 && prev[0].id === firstNotif.id) {
          return prev.slice(1);
        }
        return prev;
      });
      console.log('⏰ [Notifications] Auto-dismissed notification:', firstNotif.id);
    }, 15000);

    return () => clearTimeout(timer);
  }, [notifications.length, notifications[0]?.id]);

  // Load chat messages on mount
  useEffect(() => {
    if (!tripId) return;
    let isMounted = true;

    const loadChatMessages = async () => {
      console.log('💬 [Chat] Loading messages for trip:', tripId);
      try {
        const response = await fetch(`/api/social-cart/chat?tripId=${tripId}`);
        if (response.ok) {
          const data = await response.json();
          if (!isMounted) return;
          const serverMessages = data.messages || [];
          setChatMessages(prev => {
            if (prev.length === serverMessages.length) {
              const unchanged = prev.every((msg, idx) => msg.id === serverMessages[idx]?.id);
              if (unchanged) {
                return prev;
              }
            }
            return serverMessages;
          });
        }
      } catch (error) {
        if (isMounted) {
          console.error('❌ [Chat] Load error:', error);
        }
      }
    };

    loadChatMessages();
    const interval = setInterval(loadChatMessages, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
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

  // Ensure booking confirmations show up even if admin returns later
  useEffect(() => {
    if (!bookingConfirmation || !tripId) return;
    if (processedBookingMessages.current.has(bookingConfirmation.bookingId)) return;

    processedBookingMessages.current.add(bookingConfirmation.bookingId);

    const bookingMessage = {
      id: `booking-${bookingConfirmation.bookingId}`,
      tripId,
      senderId: 'system',
      senderName: 'System',
      senderAvatar: '🎉',
      message: `🎊 Booking Confirmed!\n\nHotel: ${bookingConfirmation.hotelName}\nCheck-in: ${bookingConfirmation.checkIn}\nCheck-out: ${bookingConfirmation.checkOut}\nRoom: ${bookingConfirmation.roomType || 'Selected by admin'}\nBooking ID: ${bookingConfirmation.bookingId}\nFinal Price: ₹${bookingConfirmation.finalPrice.toLocaleString()}\nGroup Size: ${bookingConfirmation.groupSize} members\n\n✅ The admin has successfully completed the booking!`,
      timestamp: new Date().toISOString(),
    };

    setChatMessages(prev => {
      if (prev.some(msg => msg.id === bookingMessage.id)) {
        return prev;
      }
      return [...prev, bookingMessage];
    });
  }, [bookingConfirmation, tripId]);

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

      const payload = await response.json().catch(() => null);

      if (response.ok) {
        console.log('✅ [Chat] Message sent!');
        setMessageInput('');
        if (payload?.message) {
          setChatMessages(prev => {
            if (prev.some(msg => msg.id === payload.message.id)) {
              return prev;
            }
            return [...prev, payload.message];
          });
        }
      } else {
        console.error('❌ [Chat] Send failed:', response.status, payload?.error);
        alert(payload?.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('❌ [Chat] Send error:', error);
      alert('Failed to send message');
    }
  };

  // Auto-scroll disabled to prevent irritating behavior
  // useEffect(() => {
  //   pollsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  //   chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [polls, notifications, chatMessages]);

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

      if (data.poll) {
        updatePoll(data.poll);
        if (data.poll.status === 'active') {
          setActivePoll(data.poll);
        }
      }
    } catch (error) {
      console.error('❌ [GroupChatPolling] Failed to vote:', error);
      alert('Failed to record vote. Please try again.');
    }
  };

  // Start all polls with custom configuration from the wizard
  const handleStartCustomPolls = async (configs: { type: 'budget' | 'dates' | 'amenities'; question: string; options: string[]; duration?: number }[]) => {
    if (!isAdmin || !currentUserId || !tripId) return;
    if (polls.length > 0) return;

    try {
      console.log('🚀 [GroupChatPolling] Starting custom polls...', configs);

      for (const config of configs) {
        if (polls.find(p => p.type === config.type)) {
          console.warn(`Poll ${config.type} already exists, skipping`);
          continue;
        }

        const question = config.question.trim();
        const safeOptions = config.options
          .map(option => option.trim())
          .filter(Boolean)
          .slice(0, 6);

        if (safeOptions.length < 2) {
          throw new Error(`Poll ${config.type} requires at least 2 options`);
        }

        const pollPayload = {
          id: `${config.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: config.type,
          question,
          options: safeOptions.map((text, index) => ({
            id: `${config.type}-opt${index}`,
            text,
            votes: [],
          })),
          createdBy: 'admin',
          createdAt: new Date().toISOString(),
          status: 'active',
          duration: config.duration || 300,
        };

        const response = await fetch('/api/social-cart/polls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId,
            poll: pollPayload,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create ${config.type} poll`);
        }

        const data = await response.json();
        console.log(`✅ [GroupChatPolling] Created ${config.type} poll`, data);

        if (data.poll) {
          addPoll(data.poll);
          if (data.poll.status === 'active') {
            setActivePoll(data.poll);
          }
        }
      }

      console.log('✅ [GroupChatPolling] All custom polls started');
      setShowPollWizard(false);
    } catch (error) {
      console.error('❌ [GroupChatPolling] Failed to start custom polls:', error);
      alert('Failed to start polls. Please try again.');
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

      if (data.poll) {
        updatePoll(data.poll);
        if (activePoll?.id === data.poll.id) {
          setActivePoll(null);
        }
      }
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

        const data = await response.json();
        if (data.poll) {
          updatePoll(data.poll);
        }
        console.log(`✅ [GroupChatPolling] Closed poll: ${poll.id}`);
      }
      
      setActivePoll(null);
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
    <>
      <div className="flex flex-col h-screen bg-gray-50 pt-0">
      {/* Unified Header Component */}
      <Header />

      {/* Admin Controls */}
      {isAdmin && (
        <div className="bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {polls.length === 0 ? (
                <button
                  onClick={() => setShowPollWizard(true)}
                  className="px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 bg-gradient-to-r from-[#0071c2] to-purple-600 text-white hover:from-[#005fa3] hover:to-purple-700 shadow-lg"
                >
                  <BarChart3 className="w-5 h-5" />
                  Create + Start Polls
                </button>
              ) : (
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
              {polls.map((poll) => {
                const isCollapsed = collapsedPolls.has(poll.id);
                return isCollapsed ? (
                  <motion.div
                    key={poll.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-gray-50 rounded-lg border border-gray-200 p-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-700">
                            {poll.type === 'budget' ? '💰 Budget' : poll.type === 'dates' ? '📅 Travel Dates' : '✨ Amenities'}
                          </span>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                            ✅ Closed
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          {(() => {
                            const winner = poll.options.reduce((max, opt) => 
                              opt.votes.length > max.votes.length ? opt : max
                            );
                            return `Winner: ${winner.text}`;
                          })()}
                        </p>
                      </div>
                      <button
                        onClick={() => setCollapsedPolls(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(poll.id);
                          return newSet;
                        })}
                        className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Expand poll"
                      >
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    onVote={handleVote}
                    currentUserId={currentUserId || ''}
                    members={members}
                    timeRemaining={pollTimers[poll.id]}
                    onClose={() =>
                      setCollapsedPolls(prev => {
                        const next = new Set(prev);
                        next.add(poll.id);
                        return next;
                      })
                    }
                  />
                );
              })}
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
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={selectedHotel.image}
                            alt={selectedHotel.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
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

              {/* Chat Notifications */}
              {chatNotifications.map((notif) => (
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

              {/* Hotel Voting Consensus */}
              {shortlistedHotels.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900">Hotel Voting</h3>
                    {hotelVotingStatus === 'active' && (
                      <span className="text-xs text-green-600 font-semibold">● Live</span>
                    )}
                    {hotelVotingStatus === 'closed' && (
                      <span className="text-xs text-gray-500 font-semibold">Closed</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {(() => {
                      const hotelVotes = shortlistedHotels.map((hotel) => ({
                        hotel,
                        count: Object.values(hotel.votes || {}).filter((v: any) => v.vote === 'love').length,
                      }));
                      const totalVotes = hotelVotes.reduce((sum, hv) => sum + hv.count, 0);
                      const sortedHotels = hotelVotes.sort((a, b) => b.count - a.count);
                      
                      console.log('🏨 [GroupChatPolling] Hotel voting consensus:', { totalVotes, hotelCount: sortedHotels.length });
                      
                      if (totalVotes === 0) {
                        return (
                          <p className="text-xs text-gray-500 mt-2">No votes yet</p>
                        );
                      }
                      
                      return sortedHotels.map(({ hotel, count }, index) => {
                        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                        return (
                          <div key={hotel.id} className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 flex-1 truncate">
                              {index + 1}. {hotel.name}
                            </span>
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${index === 0 ? 'bg-[#0071c2]' : 'bg-purple-500'}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600 w-8 text-right">{percentage}%</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
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

      {/* Floating Notifications */}
      <AnimatePresence>
        <div className="fixed top-6 right-6 z-50 space-y-3 max-w-md">
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: -20, x: 400 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: -20, x: 400 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`rounded-lg px-4 py-3 shadow-lg border flex items-start gap-3 cursor-pointer hover:shadow-xl transition-shadow ${
                notif.type === 'welcome'
                  ? 'bg-green-50 border-green-200'
                  : notif.type === 'poll_created'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-orange-50 border-orange-200'
              }`}
              onClick={() => {
                // Allow users to dismiss manually
                setNotifications(prev => prev.filter(n => n.id !== notif.id));
              }}
            >
              <div className="text-xl flex-shrink-0 mt-0.5">
                {notif.type === 'welcome' ? '👋' : notif.type === 'poll_created' ? '🗳️' : '✅'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${
                  notif.type === 'welcome'
                    ? 'text-green-900'
                    : notif.type === 'poll_created'
                    ? 'text-blue-900'
                    : 'text-orange-900'
                }`}>
                  {notif.message}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {/* Poll Creator Modal */}
      {showPollWizard && (
        <PollWizardModal
          onClose={() => setShowPollWizard(false)}
          onStart={handleStartCustomPolls}
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
    </>
  );
}

// Poll Card Component
function PollCard({ 
  poll, 
  onVote,
  currentUserId,
  members,
  timeRemaining,
  onClose
}: { 
  poll: Poll;
  onVote: (pollId: string, optionId: string | string[]) => void;
  currentUserId: string;
  members: any[];
  timeRemaining?: string;
  onClose?: () => void;
}) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]); // For multi-select (amenities)
  
  const userVote = poll.options.find(opt => opt.votes.includes(currentUserId));
  const isClosed = poll.status === 'closed';
  const isMultiSelect = poll.type === 'amenities';

  // Initialize selected option from existing vote
  useEffect(() => {
    if (userVote && !selectedOption && !isMultiSelect) {
      setSelectedOption(userVote.id);
    }
  }, [userVote, selectedOption, isMultiSelect]);

  useEffect(() => {
    if (!isMultiSelect) return;
    const userSelections = poll.options
      .filter(opt => opt.votes.includes(currentUserId))
      .map(opt => opt.id);
    setSelectedOptions(userSelections);
  }, [isMultiSelect, poll.options, currentUserId]);

  const handleToggleOption = (optionId: string) => {
    if (isClosed) return;
    const isAlreadySelected = selectedOptions.includes(optionId);
    const nextOptions = isAlreadySelected
      ? selectedOptions.filter(id => id !== optionId)
      : [...selectedOptions, optionId];
    setSelectedOptions(nextOptions);
    onVote(poll.id, nextOptions);
  };

  const handleSelectOption = (optionId: string) => {
    if (isClosed) return;
    setSelectedOption(optionId);
    onVote(poll.id, optionId);
  };
  
  // Find most popular option
  const isExpired = timeRemaining === 'Time\'s Up!';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"
    >
      {/* Removed poll header to fix UI glitch */}

      <div className="p-6">
        {/* Poll Title with Fold Button */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-xl text-gray-900">{poll.question}</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
              title="Collapse poll"
            >
              <ChevronUp className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      
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
            const isSelected = isMultiSelect ? selectedOptions.includes(option.id) : selectedOption === option.id;
            const isWinner = isClosed && option.votes.length === Math.max(...poll.options.map(o => o.votes.length));

            return (
              <button
                key={option.id}
                onClick={() => isMultiSelect ? handleToggleOption(option.id) : handleSelectOption(option.id)}
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
                  
                </div>
              </button>
            );
          })}
        </div>

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

// Poll wizard modal that configures budget, dates, and amenities polls
const POLL_WIZARD_TEMPLATES = [
  {
    type: 'budget' as const,
    title: 'Budget Range',
    description: 'Ask the group what price bracket they are comfortable paying for the trip.',
    defaultQuestion: "What's your preferred budget bracket for accommodations?",
    defaultOptions: ['₹5,000 - ₹7,000', '₹7,000 - ₹12,000', '₹12,000 - ₹18,000', '₹18,000+'],
  },
  {
    type: 'dates' as const,
    title: 'Travel Dates',
    description: 'Pin down the best travel window for everyone.',
    defaultQuestion: 'Which range of dates works best for you?',
    defaultOptions: ['Dec 20-25', 'Dec 26-31', 'Jan 1-5', 'Jan 6-10'],
  },
  {
    type: 'amenities' as const,
    title: 'Top Amenities',
    description: 'Capture what features guests want in their hotel.',
    defaultQuestion: 'Which amenities are must-have?',
    defaultOptions: ['Swimming Pool', 'Beach Access', 'Spa', 'Restaurant'],
  },
];

type PollWizardConfig = {
  type: 'budget' | 'dates' | 'amenities';
  title: string;
  description: string;
  question: string;
  options: string[];
  duration: number;
};

function PollWizardModal({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (configs: { type: 'budget' | 'dates' | 'amenities'; question: string; options: string[]; duration?: number }[]) => void;
}) {
  const [configs, setConfigs] = useState<PollWizardConfig[]>(() =>
    POLL_WIZARD_TEMPLATES.map(template => ({
      type: template.type,
      title: template.title,
      description: template.description,
      question: template.defaultQuestion,
      options: [...template.defaultOptions],
      duration: 300,
    }))
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');

  const currentConfig = configs[currentStep];
  const isLastStep = currentStep === configs.length - 1;

  const updateStep = (updates: Partial<PollWizardConfig>, index = currentStep) => {
    setConfigs(prev => prev.map((config, idx) => idx === index ? { ...config, ...updates } : config));
  };

  const handleOptionChange = (idx: number, value: string) => {
    const nextOptions = [...currentConfig.options];
    nextOptions[idx] = value;
    updateStep({ options: nextOptions });
  };

  const handleAddOption = () => {
    if (currentConfig.options.length >= 6) return;
    updateStep({ options: [...currentConfig.options, ''] });
  };

  const handleRemoveOption = (idx: number) => {
    if (currentConfig.options.length <= 2) return;
    const nextOptions = currentConfig.options.filter((_, index) => index !== idx);
    updateStep({ options: nextOptions });
  };

  const isConfigValid = (config: PollWizardConfig) => {
    return config.question.trim().length > 0 && config.options.filter(option => option.trim()).length >= 2;
  };

  const handleNext = () => {
    if (!isConfigValid(currentConfig)) {
      setError('Add a question and at least two meaningful options to proceed.');
      return;
    }
    setError('');
    setCurrentStep(prev => Math.min(prev + 1, configs.length - 1));
  };

  const handlePrev = () => {
    setError('');
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleStart = () => {
    if (!configs.every(isConfigValid)) {
      setError('Please finish configuring every poll before starting.');
      return;
    }
    setError('');
    onStart(configs.map(({ type, question, options, duration }) => ({
      type,
      question,
      options,
      duration,
    })));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Configure Polls</h2>
            <p className="text-sm text-gray-500">Create budget, date, and amenities polls in one flow.</p>
          </div>
          <span className="text-sm text-gray-400">
            Step {currentStep + 1} of {configs.length}
          </span>
        </div>

        <div className="rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-mmt-blue font-semibold uppercase tracking-wide">
                {currentConfig.title}
              </p>
              <h3 className="text-xl font-bold text-gray-900 mt-1">{currentConfig.description}</h3>
            </div>
            <div className="text-xs text-gray-500">{currentConfig.duration / 60} min timer</div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Question</label>
            <input
              type="text"
              value={currentConfig.question}
              onChange={(e) => updateStep({ question: e.target.value })}
              placeholder="Example: What's your preferred budget?"
              className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-mmt-blue focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Options</label>
            <div className="space-y-2">
              {currentConfig.options.map((option, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2 focus:border-mmt-blue focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    disabled={currentConfig.options.length <= 2}
                    className="text-sm text-red-500 disabled:text-red-200"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddOption}
              disabled={currentConfig.options.length >= 6}
              className="text-sm text-mmt-blue"
            >
              + Add option
            </button>
          </div>

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors disabled:opacity-60"
          >
            ← Previous
          </button>
          <div className="flex items-center gap-3">
            {!isLastStep && (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-full bg-[#0071c2] px-6 py-2 text-sm font-semibold text-white shadow-lg"
              >
                Next →
              </button>
            )}
            {isLastStep && (
              <button
                type="button"
                onClick={handleStart}
                className={`rounded-full px-6 py-2 text-sm font-semibold text-white shadow-lg ${configs.every(isConfigValid) ? 'bg-gradient-to-r from-[#0071c2] to-purple-600' : 'bg-gray-300 cursor-not-allowed'}`}
                disabled={!configs.every(isConfigValid)}
              >
                Start Polls
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 text-right">
          <button type="button" onClick={onClose} className="text-xs text-gray-500 hover:underline">
            Cancel configuration
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

  console.log('🏨 [HotelVotingCard] Rendering for user:', currentUserId, 'userVote:', userVote?.vote, 'votingClosed:', votingClosed);

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
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={hotel.image}
                    alt={hotel.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
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

          {/* Like Button - User's Vote Only */}
          <div className="mb-3">
            <motion.button
              onClick={() => handleVoteClick('love')}
              disabled={votingClosed}
              className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                userVote?.vote === 'love'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${votingClosed ? 'cursor-not-allowed opacity-50' : ''}`}
              whileHover={votingClosed ? {} : { scale: 1.03 }}
              whileTap={votingClosed ? {} : { scale: 0.97 }}
            >
              <span>👍</span>
              <span>{userVote?.vote === 'love' ? 'You liked this' : 'Like'}</span>
            </motion.button>
          </div>
          
          {/* Voting Closed Message */}
          {votingClosed && (
            <p className="text-xs text-center text-gray-500 mt-2">Voting has ended</p>
          )}

          {/* User's Comment */}
          {userVote?.comment && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-900 mb-1">Your comment:</p>
                  <p className="text-sm text-gray-700">{userVote.comment}</p>
                </div>
              </div>
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
