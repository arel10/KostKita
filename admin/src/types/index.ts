export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'owner';
  phone?: string | null;
}

export interface PageMeta { page: number; perPage: number; total: number; totalPages: number }

export interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  badgeText: string;
  imageUrl?: string;
  targetUrl: string;
  theme?: string;
  ctaText?: string;
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: string | number;
  durationDays: number;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  features: { id?: string; featureKey: string; featureValue: string }[];
}

export interface Owner {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: 'active' | 'suspended' | 'deactivated';
  createdAt: string;
  lastLoginAt?: string | null;
  _count?: { properties: number; subscriptions: number };
  subscriptions?: { id: string; status: string; startsAt?: string; endsAt: string; plan: { name: string } }[];
  properties?: any[];
}

export interface Property {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: 'draft' | 'active' | 'inactive' | 'suspended';
  city?: string | null;
  district?: string | null;
  address: string;
  whatsapp?: string;
  description?: string | null;
  priceStart?: string | number | null;
  suspendedReason?: string | null;
  createdAt: string;
  owner?: { id: string; name: string; email: string; phone?: string | null; status?: string };
  photos?: { id: string; url: string; isPrimary: boolean }[];
  facilities?: { id: string; facilityName: string }[];
  rules?: { id: string; rule: string }[];
  rooms?: { id: string; roomNumber: string; name?: string | null; price: string | number; status: string }[];
  reports?: ListingReport[];
}

export interface ListingReport {
  id: string;
  reason: string;
  description?: string | null;
  reporterName?: string | null;
  reporterContact?: string | null;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
  reviewedAt?: string | null;
  property?: { id: string; name: string; slug: string; status?: string; owner?: { id: string; name: string; email: string } };
}

export interface SubPayment {
  id: string;
  referenceNo: string;
  amount: string | number;
  paymentDate: string;
  paymentMethod: string;
  proofUrl?: string | null;
  notes?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  owner: { id: string; name: string; email: string; phone?: string | null };
  plan: { id?: string; name: string; price?: string | number; durationDays?: number };
  reviewer?: { name: string } | null;
}

export interface Subscription {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  plan: { id: string; name: string };
}

export interface AuditLog {
  id: string;
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  actor?: { name: string; email: string; role: string } | null;
}

export interface DashboardData {
  totalOwners: number;
  activeOwners: number;
  suspendedOwners: number;
  totalProperties: number;
  activeListings: number;
  inactiveListings: number;
  pendingPayments: number;
  pendingReports: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  trend: { key: string; label: string; owners: number; revenue: number }[];
  recentActivity: {
    owners: { id: string; name: string; email: string; createdAt: string }[];
    subscriptions: { id: string; createdAt: string; status: string; owner: { name: string }; plan: { name: string } }[];
    payments: { id: string; createdAt: string; amount: string; owner: { name: string }; plan: { name: string } }[];
    properties: { id: string; name: string; status: string; createdAt: string; owner: { name: string } }[];
    reports: { id: string; reason: string; createdAt: string; property: { name: string } }[];
    suspends: { id: string; action: string; createdAt: string; actor?: { name: string } | null; newValue?: any }[];
  };
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  recipients: number;
  target?: string;
  to?: string;
}

export interface OverviewReport {
  series: { key: string; label: string; owners: number; revenue: number }[];
  totalRevenue: number;
  newOwners: number;
  distribution: { plan: string; count: number }[];
  conversion: { totalOwners: number; payingOwners: number; rate: number };
}
