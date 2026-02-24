export interface DestinationInfo {
  name: string;
  lat: number | null;
  lng: number | null;
  country: string;
  city: string;
}

export const EMPTY_DESTINATION: DestinationInfo = {
  name: '',
  lat: null,
  lng: null,
  country: '',
  city: '',
};
