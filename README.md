# MakeMyTrip Social Cart 2.0 - POC

A highly interactive, gamified group booking platform for collaborative travel planning.

## 🚀 Features

- **Mobile-First Chat Interface**: Conversational UX for all interactions
- **Real-Time Collaboration**: Live member updates and voting
- **Gamification**: Confetti animations, achievement badges, progress tracking
- **Group Discounts**: Unlock savings by inviting more friends
- **Smart Polling**: Vote on budget, amenities, and dates
- **Hotel Voting**: React-based voting system (👍/👎)
- **Social Sharing**: WhatsApp integration and shareable links

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Icons**: Lucide React
- **Effects**: Canvas Confetti

## 📦 Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎯 User Flow

1. **Homepage**: Landing page with "Start Group Trip" CTA
2. **Trip Creation**: Select purpose (Wedding/Concert/Casual), destination, and member requirements
3. **Invitation**: Share trip link via WhatsApp or copy link
4. **Trip Hub**: Real-time dashboard showing members and progress (floating widget)
5. **Polling**: Chat-style voting on budget, amenities, and dates
6. **Hotel Voting**: Vote on shortlisted hotels with reactions
7. **Booking**: Final selection and payment with discount summary
8. **Success**: Celebration screen with savings and social sharing

## 🎨 Key Components

- `Homepage.tsx` - Landing page with hero section
- `TripCreation.tsx` - Trip setup flow
- `InvitationScreen.tsx` - Share and invite interface
- `FloatingWidget.tsx` - Persistent trip hub access
- `TripHubModal.tsx` - Member management dashboard
- `PollScreen.tsx` - Chat-style polling interface
- `HotelVoting.tsx` - Hotel selection with voting
- `BookingScreen.tsx` - Final booking and success

## 🎮 Gamification Elements

- ✨ Confetti animations on milestones
- 🏆 Achievement badges
- 📊 Real-time vote tallies
- ⏰ Countdown timers
- 💰 Discount unlock celebrations
- 🎯 Match percentage indicators

## 📱 Mobile-First Design

- Responsive layouts for all screen sizes
- Touch-optimized interactions
- Chat-style bubbles for natural flow
- Bottom-sheet modals
- Gesture-friendly buttons

## 🔧 Configuration

The app uses mock data for demonstration. In production:
- Connect to real backend API
- Implement WebSocket for real-time updates
- Add payment gateway integration
- Enable actual OTP verification
- Connect to hotel booking APIs

## 📝 Notes

- All state is managed in-memory (Zustand store)
- No backend required for POC
- Animations optimized for 60fps
- Fully type-safe with TypeScript

## 🎨 Color Scheme

- Primary Blue: `#008CFF`
- Dark Blue: `#0066CC`
- Green: `#4CAF50`
- Orange: `#FF9800`
- Purple: `#9C27B0`
- Pink: `#E91E63`

## 🚀 Build for Production

```bash
npm run build
npm start
```

## 📄 License

This is a POC (Proof of Concept) project for demonstration purposes.
