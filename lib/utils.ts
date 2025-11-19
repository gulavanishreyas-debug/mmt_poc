import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateShareLink(tripId: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/join/${tripId}`;
  }
  return `/join/${tripId}`;
}

export function formatTimeRemaining(endTime: Date): string {
  const now = new Date();
  const diff = endTime.getTime() - now.getTime();
  
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function getAvatarEmoji(index: number): string {
  const emojis = ['👤', '👨', '👩', '🧑', '👱', '👨‍🦱', '👩‍🦱', '👨‍🦰', '👩‍🦰', '👨‍🦳'];
  return emojis[index % emojis.length];
}

export function calculateDiscount(basePrice: number, memberCount: number): number {
  const discountPercent = Math.min(memberCount * 2, 20);
  return Math.floor(basePrice * discountPercent / 100);
}
