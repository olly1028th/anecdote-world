export type TripStatus = 'completed' | 'planned' | 'wishlist';

export type ExpenseCategory = 'flight' | 'hotel' | 'food' | 'transport' | 'activity' | 'shopping' | 'other';

export type PlacePriority = 'must' | 'want' | 'maybe';

export interface Expense {
  id?: string;
  category: ExpenseCategory;
  amount: number;
  label: string;
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
}

export interface ChecklistItem {
  id?: string;
  text: string;
  checked: boolean;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  status: TripStatus;
  startDate: string;
  endDate: string;
  coverImage: string;
  memo: string;
  expenses: Expense[];
  itinerary: ItineraryItem[];
  photos: string[];
  places: Place[];
  checklist: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}
