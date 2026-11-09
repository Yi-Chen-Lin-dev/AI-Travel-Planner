// types/trip.ts

export type NavTab = 'home' | 'my-trips' | 'top-attractions' | 'day-trips';

export interface Attraction {
  id: string;
  name: string;
  districtName: string;
  description: string;
  imageUrl: string;
  mrtStation: string;
  recommendedDuration: string;
  matchScore?: number;
}

export interface ItineraryStop {
  id: string;
  title: string;
  description: string;
  timeSlot: string;
  duration: string;
  imageUrl: string;
  badgeStatus?: string;
  microTags: { icon: string; text: string; color?: string }[];
  transitToNext?: { description: string };
}

export interface TripPlan {
  id: string;
  title: string;
  subtitle: string;
  durationDays: number;
  durationNights: number;
  spotsCount: number;
  transitSummary: string;
  days: {
    dayNumber: number;
    dateStr: string;
    routeStats: {
      totalDistanceKm: number;
      totalTransitMinutes: number;
      weather: string;
      primaryMrtLine: string;
    };
    stops: ItineraryStop[];
  }[];
}

// --- โครงสร้างข้อมูลที่อัปเดตใหม่ให้ตรงกับ PostgreSQL V2 (Backend) ---
export type Budget = 'low' | 'medium' | 'high';
export type Transportation = 'walking' | 'public_transport' | 'driving';
export type Pace = 'relaxed' | 'normal' | 'fast';
export type Interest = 'food' | 'culture' | 'nature' | 'shopping' | 'entertainment';

// --- โครงสร้าง Payload ตามข้อกำหนดของ Issue #13 และ DATA_CONTRACT.md ---
export interface PreferenceSubmissionPayload {
  trip_id: string;
  destination: string;
  start_date: string;       // YYYY-MM-DD
  days: number;             // ต้อง >= 1
  budget: Budget;
  transportation: Transportation;
  pace: Pace;
  interests: Interest[];
  daily_start_time: string; // เช่น "09:00"
  daily_end_time: string;   // เช่น "21:00"
  timezone: string;         // เช่น "Asia/Taipei"
  pinned_spots?: string[];
}