import { useEffect, useRef } from 'react';
import { useTripStore } from '../store';

export function useRealTimeSync(tripId: string | null) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const { addMember, removeMember, members, addPoll, updatePoll, setActivePoll, setStep, addHotel } = useTripStore();

  useEffect(() => {
    if (!tripId) return;

    // Create EventSource connection for Server-Sent Events
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
            
            console.log('👥 [useRealTimeSync] MEMBER_JOINED event:', {
              member: member.name,
              memberCount,
              isDiscountUnlocked,
              currentMembers: members.length,
            });
            
            // Check if member already exists
            const existingMember = members.find(m => m.id === member.id);
            if (!existingMember) {
              // Add new member to store
              addMember({
                name: member.name,
                avatar: member.avatar,
                isAdmin: member.isAdmin,
                mobile: member.mobile,
              });

              // Show notification
              console.log(`🎉 [useRealTimeSync] ${member.name} joined the trip!`);
              
              // Update discount status
              if (isDiscountUnlocked) {
                console.log('🎉 [useRealTimeSync] Discount unlocked! Updating store...');
                useTripStore.setState({ isDiscountUnlocked: true });
              }
              
              // Trigger confetti if discount unlocked
              if (isDiscountUnlocked && typeof window !== 'undefined') {
                import('../confetti').then(({ triggerConfetti }) => {
                  triggerConfetti();
                });
              }
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
              hotelVotingStatus: 'closed',
              selectedHotel: message.data.selectedHotel,
            });
            break;

          case 'BOOKING_CONFIRMED':
            console.log('📋 [SSE] Booking confirmed:', message.data.bookingId);
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
    };
  }, [tripId, addMember, removeMember, members, addPoll, updatePoll, setActivePoll, setStep, addHotel]);

  return {
    isConnected: typeof EventSource !== 'undefined' && eventSourceRef.current?.readyState === EventSource.OPEN,
  };
}
