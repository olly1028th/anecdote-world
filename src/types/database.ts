// ============================================================
// DB 스키마에 대응하는 TypeScript 타입 (Supabase용)
// ============================================================

export type TripStatus = 'completed' | 'planned';
export type VisitStatus = 'visited' | 'planned' | 'wishlist';
export type PinCategory = 'food' | 'cafe' | 'landmark' | 'hotel' | 'nature' | 'shopping' | 'activity' | 'other';
export type ExpenseCategory = 'flight' | 'hotel' | 'food' | 'transport' | 'activity' | 'shopping' | 'other';

// ---- profiles ----
export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string;
  bio: string;
  created_at: string;
  updated_at: string;
}

// ---- trips ----
export interface Trip {
  id: string;
  user_id: string;
  title: string;
  status: TripStatus;
  start_date: string | null;
  end_date: string | null;
  cover_image: string;
  memo: string;
  created_at: string;
  updated_at: string;
}

// ---- pins ----
export interface Pin {
  id: string;
  user_id: string;
  trip_id: string | null;

  name: string;
  address: string;
  lat: number;
  lng: number;
  country: string;
  city: string;

  visit_status: VisitStatus;
  visited_at: string | null;

  category: PinCategory;
  rating: number | null;
  note: string;
  day_number: number | null;
  sort_order: number;

  created_at: string;
  updated_at: string;
}

// ---- pin_photos ----
export interface PinPhoto {
  id: string;
  pin_id: string;
  user_id: string;
  url: string;
  caption: string;
  is_favorite: boolean;
  sort_order: number;
  created_at: string;
}

// ---- expenses ----
export interface Expense {
  id: string;
  user_id: string;
  trip_id: string | null;
  pin_id: string | null;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  label: string;
  spent_at: string | null;
  created_at: string;
}

// ---- checklist_items ----
export interface ChecklistItem {
  id: string;
  user_id: string;
  trip_id: string;
  text: string;
  checked: boolean;
  sort_order: number;
  created_at: string;
}

// ============================================================
// 관계를 포함한 확장 타입 (JOIN 결과)
// ============================================================

export interface TripWithRelations extends Trip {
  pins: Pin[];
  expenses: Expense[];
  checklist_items: ChecklistItem[];
}

export interface PinWithPhotos extends Pin {
  pin_photos: PinPhoto[];
}
