export type PropertyType = 'putra' | 'putri' | 'campur';

export interface PropertyPhoto {
  id: string;
  url: string;
  order: number;
  isPrimary: boolean;
}

export interface PropertyFacility {
  id: string;
  facilityName: string;
}

export interface PropertyRule {
  id: string;
  rule: string;
}

export interface RoomPhoto {
  id: string;
  url: string;
  isPrimary: boolean;
}

export interface RoomFacility {
  id: string;
  facilityName: string;
}

export interface Room {
  id: string;
  propertyId: string;
  roomNumber: string;
  name?: string;
  type?: string;
  price: number | string;
  description?: string;
  status: 'available' | 'occupied' | 'maintenance';
  photos?: RoomPhoto[];
  facilities?: RoomFacility[];
}

export interface PropertyListItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: PropertyType;
  whatsapp: string;
  address: string;
  province?: string;
  city?: string;
  district?: string;
  subdistrict?: string;
  postalCode?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  priceStart: number | string;
  status: string;
  photos: PropertyPhoto[];
  facilities: PropertyFacility[];
  _count?: {
    rooms: number;
  };
  distanceKm?: number | null;
}

export interface PropertyDetail extends PropertyListItem {
  rules: PropertyRule[];
  rooms: Room[];
  isActive: boolean;
}

export interface SearchFilterParams {
  search?: string;
  city?: string;
  district?: string;
  type?: PropertyType | '';
  priceMin?: number;
  priceMax?: number;
  facilities?: string[];
  availableOnly?: boolean;
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  perPage?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}
