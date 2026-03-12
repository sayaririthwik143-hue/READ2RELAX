import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const MOCK_APPS = [
  { id: 'ig', name: 'Instagram', icon: 'https://cdn-icons-png.flaticon.com/512/174/174855.png', category: 'Social', url: 'https://instagram.com' },
  { id: 'yt', name: 'YouTube', icon: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png', category: 'Entertainment', url: 'https://youtube.com' },
  { id: 'ff', name: 'Free Fire', icon: 'https://cdn-icons-png.flaticon.com/512/5968/5968958.png', category: 'Games', url: 'https://play.google.com/store/apps/details?id=com.dts.freefireth' },
  { id: 'tk', name: 'TikTok', icon: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png', category: 'Social', url: 'https://tiktok.com' },
  { id: 'fb', name: 'Facebook', icon: 'https://cdn-icons-png.flaticon.com/512/124/124010.png', category: 'Social', url: 'https://facebook.com' },
  { id: 'wa', name: 'WhatsApp', icon: 'https://cdn-icons-png.flaticon.com/512/733/733585.png', category: 'Communication', url: 'https://wa.me' },
];

export const QUOTES = [
  "Focus on life, not just the screen.",
  "Your time is limited, don't waste it living someone else's digital life.",
  "Disconnect to reconnect.",
  "The best things in life aren't on a screen.",
  "Be present in the moment."
];

export interface User {
  id: number;
  uid: string;
  name: string;
  email: string;
  profile_photo: string | null;
  selected_apps: string; // JSON string
  screen_time_limit: number;
  exercise_minutes_earned: number;
  daily_usage: number;
  focus_score: number;
  gender: string | null;
}
