import { useEffect, useRef } from 'react';
import { useTripStore } from '../store';

export function useRealTimeSync(tripId: string | null) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { addMember, removeMember, members, addPoll, updatePoll, setActivePoll, setStep, addHotel, isDiscountUnlocked, currentStep } = useTripStore();

  useEffect(() => {
    if (!tripId) return;

    // Polling fallback for Vercel (every 3 seconds)
    const pollTripUpdates = async () => {
      try {
        console.log(`🔄 [Polling] Fetching trip updates for: ${tripId}`);
        const response = await fetch(`/api/social-cart/join?tripId=${tripId}`);
        console.log(`🔄 [Polling] Response status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`🔄 [Polling] Response data:`, data);
          
          if (data.success && data.trip) {
            const currentMembers = useTripStore.getState().members;
            const serverMembers = data.trip.members || [];
            const currentStep = useTripStore.getState().currentStep;
            const isDiscountUnlocked = useTripStore.getState().isDiscountUnlocked;
            
            console.log(`🔄 [Polling] Current state:`, {
              localMemberCount: currentMembers.length,
              localMembers: currentMembers.map(m => ({ id: m.id, name: m.name })),
              serverMemberCount: serverMembers.length,
              serverMembers: serverMembers.map((m: any) => ({ id: m.id, name: m.name })),
              requiredMembers: data.trip.requiredMembers,
              currentStep,
              isDiscountUnlocked,
            });
            
            // Check if there are new members
            if (serverMembers.length > currentMembers.length) {
              console.log(`🎉 [Polling] NEW MEMBERS DETECTED! Server has ${serverMembers.length}, local has ${currentMembers.length}`);
              
              // Add missing members
              let addedCount = 0;
              serverMembers.forEach((serverMember: any) => {
                const exists = currentMembers.find(m => m.id === serverMember.id);
                if (!exists) {
                  console.log(`👥 [Polling] Adding new member: ${serverMember.name} (${serverMember.id})`);
                  addMember({
                    name: serverMember.name,
                    avatar: serverMember.avatar,
                    isAdmin: serverMember.isAdmin,
                    mobile: serverMember.mobile,
                  });
                  addedCount++;
                }
              });
              console.log(`✅ [Polling] Added ${addedCount} new members`);
              
              // Check if discount should be unlocked
              const updatedMembers = useTripStore.getState().members;
              const requiredMembers = data.trip.requiredMembers;
              console.log(`🔍 [Polling] Checking discount: ${updatedMembers.length} >= ${requiredMembers}? Currently unlocked: ${useTripStore.getState().isDiscountUnlocked}`);
              
              if (updatedMembers.length >= requiredMembers && !useTripStore.getState().isDiscountUnlocked) {
                console.log('🎉 [Polling] ALL MEMBERS JOINED! Unlocking discount...');
                useTripStore.setState({ isDiscountUnlocked: true });
                
                // Auto-advance to poll screen if on hub
                const currentStepNow = useTripStore.getState().currentStep;
                console.log(`🔍 [Polling] Current step: ${currentStepNow}`);
                if (currentStepNow === 'hub') {
                  console.log('🚀 [Polling] Advancing from hub to poll screen');
                  useTripStore.getState().setStep('poll');
                } else {
                  console.log(`⚠️ [Polling] Not on hub (on ${currentStepNow}), not advancing`);
                }
                
                // Trigger confetti
                if (typeof window !== 'undefined') {
                  console.log('🎊 [Polling] Triggering confetti!');
                  import('../confetti').then(({ triggerConfetti }) => {
                    triggerConfetti();
                  });
                }
              } else {
                console.log(`⏳ [Polling] Not all members yet or already unlocked. Members: ${updatedMembers.length}/${requiredMembers}, Unlocked: ${useTripStore.getState().isDiscountUnlocked}`);
              }
            } else {
              console.log(`✓ [Polling] No new members. Server: ${serverMembers.length}, Local: ${currentMembers.length}`);
            }
          } else {
            console.error('❌ [Polling] Invalid response format:', data);
          }
        } else {
          console.error(`❌ [Polling] Failed to fetch: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('❌ [Polling] Error fetching trip updates:', error);
      }
    };

    // Start polling immediately and then every 3 seconds
    pollTripUpdates();
    pollingIntervalRef.current = setInterval(pollTripUpdates, 3000);

    // Create EventSource connection for Server-Sent Events (primary method)
    const eventSource = new EventSource(`/api/social-cart/events?tripId=${tripId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('✅ [useRealTimeSync] Real-time connection established for trip:', tripId);
      console.log('✅ [useRealTimeSync] Current state:', {
        members: members.length,
        currentStep: useTripStore.getState().currentStep,
        isDiscountUnlocked: useTripStore.getState().isDiscountUnlocked,
      });
    };

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'CONNECTED':
            console.log('Connected to real-time updates');
            break;

          case 'MEMBER_JOINED':
            const { member, memberCount, isDiscountUnlocked } = message.data;
            
            console.log('👥 [SSE] MEMBER_JOINED event received:', {
              member: member.name,
              memberId: member.id,
              memberCount,
              isDiscountUnlocked,
              currentLocalMembers: members.length,
              currentLocalMemberIds: members.map(m => m.id),
            });
            
            // Check if member already exists
            const existingMember = members.find(m => m.id === member.id);
            if (!existingMember) {
              console.log(`👥 [SSE] Adding new member via SSE: ${member.name} (${member.id})`);
              // Add new member to store
              addMember({
                name: member.name,
                avatar: member.avatar,
                isAdmin: member.isAdmin,
                mobile: member.mobile,
              });

              // Show notification
              console.log(`🎉 [SSE] ${member.name} joined the trip!`);
              
              // Update discount status
              if (isDiscountUnlocked) {
                console.log('🎉 [SSE] Discount unlocked via SSE! Updating store...');
                useTripStore.setState({ isDiscountUnlocked: true });
              }
              
              // Trigger confetti if discount unlocked
              if (isDiscountUnlocked && typeof window !== 'undefined') {
                console.log('🎊 [SSE] Triggering confetti via SSE');
                import('../confetti').then(({ triggerConfetti }) => {
                  triggerConfetti();
                });
              }
            } else {
              console.log(`⏭️ [SSE] Member ${member.name} already exists locally, skipping`);
            }
            break;

          case 'MEMBER_REMOVED':
            const { memberId } = message.data;
            removeMember(memberId);
            console.log(`👋 Member removed from trip`);
            break;

          case 'ALL_MEMBERS_JOINED':
            console.log('🎉 [useRealTimeSync] ALL_MEMBERS_JOINED event received!');
            console.log('🎉 [useRealTimeSync] Current state before update:', {
              currentStep: useTripStore.getState().currentStep,
              isDiscountUnlocked: useTripStore.getState().isDiscountUnlocked,
              members: useTripStore.getState().members.length,
            });
            
            useTripStore.setState({ isDiscountUnlocked: true });
            console.log('🎉 [useRealTimeSync] Set isDiscountUnlocked = true');
            
            setStep('poll');
            console.log('🎉 [useRealTimeSync] Set currentStep = poll');
            
            console.log('🎉 [useRealTimeSync] State after update:', {
              currentStep: useTripStore.getState().currentStep,
              isDiscountUnlocked: useTripStore.getState().isDiscountUnlocked,
            });
            break;

          case 'POLL_CREATED':
            console.log('📊 New poll created:', message.data.poll);
            addPoll(message.data.poll);
            setActivePoll(message.data.poll);
            
            // Show browser notification for new poll
            if (typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                new Notification('New Poll Created! 📊', {
                  body: `Vote now: ${message.data.poll.question}`,
                  icon: '/favicon.ico',
                });
              }
            }
            break;

          case 'POLL_UPDATED':
            console.log('🔄 Poll updated:', message.data.poll);
            updatePoll(message.data.poll);
            if (message.data.poll.status === 'active') {
              setActivePoll(message.data.poll);
            }
            break;

          case 'POLL_CLOSED':
            console.log('✅ Poll closed:', message.data.poll);
            updatePoll(message.data.poll);
            setActivePoll(null);
            
            // Show browser notification for poll results
            if (typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                const winner = message.data.poll.options.reduce((max: any, opt: any) => 
                  opt.votes.length > max.votes.length ? opt : max
                );
                new Notification('Poll Closed! 🏆', {
                  body: `Winner: ${winner.text} with ${winner.votes.length} votes`,
                  icon: '/favicon.ico',
                });
              }
            }
            break;

          case 'CHAT_MESSAGE':
            console.log('💬 [SSE] Chat message received:', message.data.message);
            // Dispatch custom event for chat messages
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('chat-message', { 
                detail: message.data.message 
              }));
            }
            break;

          case 'MEMBER_REMOVED':
            console.log('🗑️ [SSE] Member removed:', message.data);
            const removedMemberId = message.data.memberId;
            const currentUserId = useTripStore.getState().currentUserId;
            
            // If the current user was removed, show alert and reload
            if (removedMemberId === currentUserId) {
              alert('You have been removed from this trip by the admin.');
              window.location.reload();
              return;
            }
            
            // Refresh member list from server for other users
            fetch(`/api/social-cart/join?tripId=${tripId}`)
              .then(res => res.json())
              .then(data => {
                if (data.trip) {
                  useTripStore.setState({ members: data.trip.members });
                }
              })
              .catch(err => console.error('Failed to refresh members:', err));
            break;

          case 'LINK_STATUS_CHANGED':
            console.log('🔗 [SSE] Link status changed:', message.data.isLinkActive);
            // Just log for now, UI will update via state
            break;

          case 'HOTELS_SHORTLISTED':
            console.log('🏨 [SSE] Hotels shortlisted:', message.data.hotels);
            // Add hotels to store and start voting timer
            message.data.hotels.forEach((hotel: any) => addHotel(hotel));
            useTripStore.setState({ 
              hotelVotingStatus: message.data.votingStatus,
              hotelVotingExpiresAt: message.data.votingExpiresAt,
            });
            break;

          case 'HOTEL_VOTE_UPDATED':
            console.log('🗳️ [SSE] Hotel votes updated');
            // Update all hotels in store
            const { hotels } = message.data;
            useTripStore.setState({ shortlistedHotels: hotels });
            break;

          case 'HOTEL_VOTING_CLOSED':
            console.log('🔒 [SSE] Hotel voting closed, winner:', message.data.selectedHotel);
            useTripStore.setState({ 
              hotelVotingStatus: message.data.votingStatus,
              selectedHotel: message.data.selectedHotel,
              hotelBookingStatus: message.data.hotelBookingStatus || null,
            });
            break;

          case 'BOOKING_CONFIRMED':
            console.log('📋 [SSE] Booking confirmed:', message.data.bookingId);
            useTripStore.setState({
              hotelBookingStatus: 'confirmed',
              bookingConfirmation: message.data,
            });
            // Dispatch custom event for booking confirmation message in chat
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('booking-confirmed', { 
                detail: message.data 
              }));
            }
            break;

          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
    };

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        console.log('🔌 Real-time connection closed');
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        console.log('🔌 Polling stopped');
      }
    };
  }, [tripId, addMember, removeMember, members, addPoll, updatePoll, setActivePoll, setStep, addHotel]);

  return {
    isConnected: typeof EventSource !== 'undefined' && eventSourceRef.current?.readyState === EventSource.OPEN,
  };
}
