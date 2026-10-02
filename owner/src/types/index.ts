export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: 'super_admin' | 'owner' | 'tenant';
  status: 'active' | 'suspended' | 'deactivated';
  avatarUrl?: string | null;
  createdAt: string;
}

export interface PropertyFacility {
  id: string;
  propertyId: string;
  name?: string;
  facilityName?: string;
  icon?: string | null;
  isPopular?: boolean;
}

export interface PropertyPhoto {
  id: string;
  propertyId: string;
  url: string;
  caption?: string | null;
  order: number;
  isPrimary: boolean;
}

export interface PropertyRule {
  id: string;
  propertyId: string;
  rule?: string;
  description?: string;
}

export interface Property {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description?: string | null;
  type: 'putra' | 'putri' | 'campur';
  address: string;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  subdistrict?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  priceStart?: number | null;
  whatsapp?: string | null;
  status: 'draft' | 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
  photos?: PropertyPhoto[];
  rooms?: Room[];
  facilities?: PropertyFacility[];
  rules?: PropertyRule[];
  _count?: {
    rooms?: number;
  };
}

export interface RoomFacility {
  id: string;
  roomId: string;
  name: string;
}

export interface RoomPhoto {
  id: string;
  roomId: string;
  url: string;
  caption?: string | null;
  order: number;
  isPrimary: boolean;
}

export interface Room {
  id: string;
  propertyId: string;
  ownerId: string;
  roomNumber: string;
  name?: string | null;
  type?: string | null;
  price: number;
  description?: string | null;
  status: 'available' | 'occupied' | 'maintenance';
  createdAt: string;
  updatedAt: string;
  property?: Property;
  photos?: RoomPhoto[];
  facilities?: RoomFacility[];
  stays?: TenantStay[];
}

export interface TenantStay {
  id: string;
  tenantId: string;
  roomId: string;
  startDate?: string;
  endDate?: string | null;
  checkInDate?: string;
  checkOutDate?: string | null;
  rentAmount?: number;
  rentPrice?: number;
  deposit?: number | null;
  status: 'active' | 'ended';
  createdAt: string;
  tenant?: Tenant;
  room?: Room;
}

export interface Tenant {
  id: string;
  ownerId: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  idCardNumber?: string | null;
  emergencyPhone?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  stays?: TenantStay[];
}

export interface TenantPayment {
  id: string;
  ownerId: string;
  tenantStayId: string;
  amount: number;
  paymentDate: string;
  periodStart: string;
  periodEnd: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'other';
  status: 'paid' | 'pending' | 'overdue';
  notes?: string | null;
  createdAt: string;
  tenantStay?: {
    id: string;
    tenant?: {
      name: string;
      phone?: string;
    };
    room?: {
      roomNumber: string;
      property?: {
        name: string;
      };
    };
  };
}

export interface SubscriptionPlanFeature {
  id: string;
  featureKey: string;
  featureValue: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  durationDays: number;
  isActive: boolean;
  isDefault: boolean;
  features: SubscriptionPlanFeature[];
}

export interface Subscription {
  id: string;
  ownerId: string;
  planId: string;
  status: 'trial' | 'active' | 'expiring_soon' | 'expired';
  startsAt: string;
  endsAt: string;
  plan: SubscriptionPlan;
}

export interface SubscriptionPayment {
  id: string;
  ownerId: string;
  planId: string;
  invoiceNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  proofUrl: string;
  notes?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  createdAt: string;
  plan?: SubscriptionPlan;
}

export interface DashboardReport {
  totalProperties: number;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  occupancyRate: number;
  revenueThisMonth: number;
  revenueTotal: number;
  pendingPayments: number;
  overduePayments: number;
  subscription: {
    planName: string;
    status: string;
    startsAt: string;
    endsAt: string;
    daysLeft: number;
  } | null;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}
