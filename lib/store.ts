import { create } from 'zustand';

export type TripPurpose = 'wedding' | 'concert' | 'casual';

export interface Member {
  id: string;
  name: string;
  avatar: string;
  isAdmin: boolean;
  joinedAt: Date;
  mobile?: string;
}

export interface MemberInput {
  id?: string;
  name: string;
  avatar: string;
  isAdmin: boolean;
  mobile?: string;
  joinedAt?: Date | string;
}

export interface PollVote {
  memberId: string;
  budget?: string;
  amenities?: string[];
  dates?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // member IDs
}

export interface Poll {
  id: string;
  question: string;
  type: 'budget' | 'dates' | 'amenities';
  options: PollOption[];
  status: 'active' | 'closed';
  createdAt: string;
  createdBy: string;
  duration?: number; // Duration in seconds
  expiresAt?: string; // ISO timestamp when poll expires
}

export interface HotelVote {
  vote: 'love' | 'dislike';
  comment?: string;
}

export interface BookingConfirmation {
  bookingId: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  roomType?: string;
  finalPrice: number;
  groupSize: number;
}

export interface Hotel {
  id: string;
  name: string;
  image: string;
  price: number;
  rating: number;
  location: string;
  amenities: string[];
  highlights: string[];
  votes: { [memberId: string]: HotelVote };
}

export interface TripState {
  // Trip Details
  tripId: string | null;
  tripName: string;
  destination: string;
  purpose: TripPurpose | null;
  requiredMembers: number;
  
  // Members
  members: Member[];
  currentUserId: string | null;
  
  // Status
  isDiscountUnlocked: boolean;
  isPollActive: boolean;
  pollEndTime: Date | null;
  
  // Poll Data (Old)
  votes: PollVote[];
  consensusBudget: string | null;
  consensusAmenities: string[];
  consensusDates: string | null;
  
  // Polls (New Chat-Style)
  polls: Poll[];
  activePoll: Poll | null;
  
  // Hotels
  shortlistedHotels: Hotel[];
  selectedHotel: Hotel | null;
  hotelVotingStatus: 'active' | 'closed' | null;
  hotelVotingExpiresAt: string | null;
  hotelBookingStatus: 'pending' | 'confirmed' | null;
  bookingConfirmation: BookingConfirmation | null;
  
  // UI State
  showTripHub: boolean;
  currentStep: 'home' | 'create' | 'invite' | 'hub' | 'poll' | 'hotels' | 'booking' | 'success';
  
  // Actions
  setTripDetails: (name: string, destination: string, purpose: TripPurpose, required: number) => void;
  createTrip: () => void;
  addMember: (member: MemberInput) => void;
  removeMember: (memberId: string) => void;
  setCurrentUser: (userId: string) => void;
  toggleTripHub: () => void;
  startPoll: () => void;
  submitVote: (vote: PollVote) => void;
  calculateConsensus: () => void;
  addHotel: (hotel: Hotel) => void;
  voteHotel: (hotelId: string, vote: 'love' | 'dislike') => void;
  voteHotelWithComment: (hotelId: string, vote: 'love' | 'dislike', comment?: string) => void;
  selectHotel: (hotelId: string) => void;
  setStep: (step: TripState['currentStep']) => void;
  resetTrip: () => void;
  
  // New Poll Actions
  addPoll: (poll: Poll) => void;
  updatePoll: (poll: Poll) => void;
  setActivePoll: (poll: Poll | null) => void;
}

export const useTripStore = create<TripState>((set, get) => ({
  // Initial State
  tripId: null,
  tripName: '',
  destination: '',
  purpose: null,
  requiredMembers: 5,
  members: [],
  currentUserId: null,
  isDiscountUnlocked: false,
  isPollActive: false,
  pollEndTime: null,
  votes: [],
  consensusBudget: null,
  consensusAmenities: [],
  consensusDates: null,
  polls: [],
  activePoll: null,
  shortlistedHotels: [],
  selectedHotel: null,
  hotelVotingStatus: null,
  hotelVotingExpiresAt: null,
  hotelBookingStatus: null,
  bookingConfirmation: null,
  showTripHub: false,
  currentStep: 'home',
  
  // Actions
  setTripDetails: (name, destination, purpose, required) => {
    set({ tripName: name, destination, purpose, requiredMembers: required });
  },
  
  createTrip: () => {
    const tripId = `trip${Math.random().toString(36).substr(2, 9)}`;
    const adminId = `user${Math.random().toString(36).substr(2, 9)}`;
    
    set({
      tripId,
      currentUserId: adminId,
      members: [{
        id: adminId,
        name: 'You (Admin)',
        avatar: '👤',
        isAdmin: true,
        joinedAt: new Date(),
      }],
      currentStep: 'invite',
    });
  },
  
  addMember: (member) => {
    set((state) => {
      const normalizedId = member.id ?? `user${Math.random().toString(36).substr(2, 9)}`;
      const normalizedJoinedAt = member.joinedAt
        ? new Date(member.joinedAt)
        : new Date();
      const normalizedMember: Member = {
        id: normalizedId,
        name: member.name,
        avatar: member.avatar,
        isAdmin: member.isAdmin,
        mobile: member.mobile,
        joinedAt: normalizedJoinedAt,
      };

      const existingIndex = state.members.findIndex(m => m.id === normalizedId);
      if (existingIndex !== -1) {
        const existing = state.members[existingIndex];
        const needsUpdate = existing.name !== normalizedMember.name ||
          existing.avatar !== normalizedMember.avatar ||
          existing.isAdmin !== normalizedMember.isAdmin ||
          existing.mobile !== normalizedMember.mobile;
        if (!needsUpdate) {
          return state;
        }
        const updatedMembers = state.members.slice();
        updatedMembers[existingIndex] = { ...existing, ...normalizedMember };
        return { ...state, members: updatedMembers };
      }

      const updatedMembers = [...state.members, normalizedMember];
      return {
        ...state,
        members: updatedMembers,
        isDiscountUnlocked: updatedMembers.length >= state.requiredMembers,
      };
    });
  },
  
  removeMember: (memberId) => {
    const members = get().members.filter(m => m.id !== memberId);
    const isDiscountUnlocked = members.length >= get().requiredMembers;
    
    set({ members, isDiscountUnlocked });
  },
  
  setCurrentUser: (userId) => {
    set({ currentUserId: userId });
  },
  
  toggleTripHub: () => {
    set({ showTripHub: !get().showTripHub });
  },
  
  startPoll: () => {
    const pollEndTime = new Date();
    pollEndTime.setHours(pollEndTime.getHours() + 24);
    
    set({
      isPollActive: true,
      pollEndTime,
      currentStep: 'poll',
    });
  },
  
  submitVote: (vote) => {
    const votes = [...get().votes.filter(v => v.memberId !== vote.memberId), vote];
    set({ votes });
  },
  
  calculateConsensus: () => {
    const { votes } = get();
    
    // Calculate budget consensus
    const budgetCounts: { [key: string]: number } = {};
    votes.forEach(v => {
      if (v.budget) {
        budgetCounts[v.budget] = (budgetCounts[v.budget] || 0) + 1;
      }
    });
    const consensusBudget = Object.keys(budgetCounts).reduce((a, b) => 
      budgetCounts[a] > budgetCounts[b] ? a : b, '');
    
    // Calculate amenities consensus
    const amenityCounts: { [key: string]: number } = {};
    votes.forEach(v => {
      v.amenities?.forEach(a => {
        amenityCounts[a] = (amenityCounts[a] || 0) + 1;
      });
    });
    const consensusAmenities = Object.keys(amenityCounts)
      .filter(a => amenityCounts[a] >= votes.length / 2)
      .sort((a, b) => amenityCounts[b] - amenityCounts[a]);
    
    set({ consensusBudget, consensusAmenities, isPollActive: false });
  },
  
  addHotel: (hotel) => {
    set({ shortlistedHotels: [...get().shortlistedHotels, hotel] });
  },
  
  voteHotel: (hotelId, vote) => {
    const { currentUserId, shortlistedHotels } = get();
    if (!currentUserId) return;
    
    const updatedHotels = shortlistedHotels.map(h => {
      if (h.id === hotelId) {
        return {
          ...h,
          votes: { ...h.votes, [currentUserId]: { vote, comment: h.votes[currentUserId]?.comment } },
        };
      }
      return h;
    });
    
    set({ shortlistedHotels: updatedHotels });
  },
  
  voteHotelWithComment: (hotelId: string, vote: 'love' | 'dislike', comment?: string) => {
    const { currentUserId, shortlistedHotels } = get();
    if (!currentUserId) return;
    
    const updatedHotels = shortlistedHotels.map(h => {
      if (h.id === hotelId) {
        return {
          ...h,
          votes: { ...h.votes, [currentUserId]: { vote, comment } },
        };
      }
      return h;
    });
    
    set({ shortlistedHotels: updatedHotels });
  },
  
  selectHotel: (hotelId) => {
    const hotel = get().shortlistedHotels.find(h => h.id === hotelId);
    set({ selectedHotel: hotel || null, currentStep: 'booking' });
  },
  
  setStep: (step) => {
    set({ currentStep: step });
  },
  
  resetTrip: () => {
    set({
      tripId: null,
      tripName: '',
      destination: '',
      purpose: null,
      requiredMembers: 5,
      members: [],
      currentUserId: null,
      isDiscountUnlocked: false,
      isPollActive: false,
      pollEndTime: null,
      votes: [],
      consensusBudget: null,
      consensusAmenities: [],
      consensusDates: null,
      polls: [],
      activePoll: null,
      shortlistedHotels: [],
      selectedHotel: null,
      hotelBookingStatus: null,
      bookingConfirmation: null,
      showTripHub: false,
      currentStep: 'home',
    });
  },
  
  // New Poll Actions
  addPoll: (poll) => {
    set((state) => ({ polls: [...state.polls, poll] }));
  },
  
  updatePoll: (poll) => {
    set((state) => ({
      polls: state.polls.map(p => p.id === poll.id ? poll : p)
    }));
  },
  
  setActivePoll: (poll) => {
    set({ activePoll: poll });
  },
}));
