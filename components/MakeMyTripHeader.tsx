'use client';

import { useMemo } from 'react';
import { useTripStore } from '@/lib/store';

interface MakeMyTripHeaderProps {
  variant?: 'default' | 'immersive';
  className?: string;
}

const navLinks = [
  'Flights',
  'Hotels',
  'Homestays',
  'Holiday Packages',
  'Trains',
  'Buses',
  'Cabs',
  'Forex',
];

export default function MakeMyTripHeader({
  variant = 'default',
  className = '',
}: MakeMyTripHeaderProps) {
  const { members, currentUserId, isDiscountUnlocked } = useTripStore();

  const currentUser = useMemo(
    () => members.find((member) => member.id === currentUserId),
    [members, currentUserId]
  );

  const promoHeading = isDiscountUnlocked
    ? 'Group discount unlocked!'
    : '₹200+ off on booking';

  const promoSubtext = isDiscountUnlocked
    ? 'Lock in the best deal today'
    : 'Add members to unlock bigger perks';

  return (
    <header className={`${variant === 'immersive' ? 'relative z-20' : ''} ${className}`.trim()}>
      <div className="border-b border-[#0066b3] bg-[#0071c2] text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-2xl font-semibold sm:text-3xl">
              <span className="font-light text-white/80">make</span>
              <span className="rounded bg-red-600 px-2 py-1 text-xl font-black italic text-white shadow">
                my
              </span>
              <span className="font-light text-white/80">trip</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-white/80 lg:text-sm">
              {navLinks.map((link) => (
                <button
                  key={link}
                  className="rounded-full border border-transparent px-3 py-1.5 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
                >
                  {link}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 text-sm text-white/80 sm:flex-row sm:items-center sm:justify-end sm:gap-5">
            {currentUser ? (
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-white/50">Planning with</p>
                <div className="flex items-center justify-end gap-2 text-base font-semibold text-white">
                  <span>{currentUser.name}</span>
                  {currentUser.isAdmin && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/80">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-white/60">Sign in to personalize</p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 text-sm font-semibold">
              <button className="rounded-full border border-white/30 px-4 py-2 text-white/90 transition hover:border-white/60">
                My Trips
              </button>
              <button className="rounded-full border border-white/30 px-4 py-2 text-white/90 transition hover:border-white/60">
                MMT Wallet
              </button>
              <button className="rounded-full border border-white/30 px-3 py-2 text-white/80 transition hover:border-white/60">
                🔔
              </button>
              <button className="rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-400">
                Login / Signup
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
