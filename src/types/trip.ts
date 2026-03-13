export type TripStatus = 'completed' | 'planned' | 'wishlist';

export type ExpenseCategory = 'flight' | 'hotel' | 'food' | 'transport' | 'activity' | 'shopping' | 'other';

export type PlacePriority = 'must' | 'want' | 'maybe';

export interface Expense {
  id?: string;
  category: ExpenseCategory;
  amount: number;
  currency?: string;   // 'KRW' | 'USD' | 'JPY' etc. Default: 'KRW'
  label: string;
  spentAt?: string;    // 'YYYY-MM-DD'
}

export interface ItineraryItem {
  day: number;
  title: string;
  description: string;
}

export interface Place {
  name: string;
  priority: PlacePriority;
  note: string;
  day?: number;
  time?: string;
  lat?: number;
  lng?: number;
}

export interface ChecklistItem {
  id?: string;
  text: string;
  checked: boolean;
}

export type DocumentCategory = 'flight' | 'hotel' | 'visa' | 'insurance' | 'ticket' | 'other';

export interface TripDocument {
  id?: string;
  url: string;
  name: string;
  category: DocumentCategory;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  /** 여행지 국가명 (환율 조회용, DestinationPicker에서 설정) */
  country?: string;
  status: TripStatus;
  startDate: string;
  endDate: string;
  coverImage: string;
  memo: string;
  expenses: Expense[];
  itinerary: ItineraryItem[];
  photos: string[];
  /** 사진별 캡션 (URL → 캡션 텍스트) */
  photoCaptions?: Record<string, string>;
  places: Place[];
  checklist: ChecklistItem[];
  documents: TripDocument[];
  travelerCount: number;
  createdAt: string;
  updatedAt: string;
}
