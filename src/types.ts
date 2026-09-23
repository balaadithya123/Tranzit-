export type PlanType = 'SaaS' | 'Lease';

export type SubscriptionTierId = 'starter' | 'growth' | 'enterprise';

export interface TierPricingConfig {
  starterRate: number; // e.g. 649/bus/mo
  growthRate: number; // e.g. 899/bus/mo
  enterpriseRate: number; // e.g. 1599/bus/mo starting
  updatedAt?: string;
  updatedBy?: string;
}

export type ServiceStatus = 'Good' | 'Due' | 'Overdue';

export interface OwnerProfile {
  id: string; // matches auth UID or owner document ID
  uid: string;
  name: string;
  email: string;
  companyName: string;
  planType: PlanType;
  subscriptionTier?: SubscriptionTierId;
  subscriptionPlanName?: string; // 'Starter' | 'Growth' | 'Enterprise'
  subscriptionSelectedAt?: string;
  activeBusesCount: number;
  todayRevenue: number; // for SaaS
  walletBalance?: number; // for SaaS pending payout wallet
  saasFeePerBus?: number; // e.g. 649/bus/mo (derived from tier)
  nextPayoutDate: string; // for Lease & SaaS settlement
  nextPayoutAmount: number; // for Lease & SaaS settlement
  avgDailyRiders: number;
  city: string;
  phone?: string;
  isAdmin?: boolean;
  createdAt?: string;
}

export interface Bus {
  id: string;
  ownerId: string;
  regNumber: string; // e.g. KA 01 F 4291
  model: string; // e.g. Ashok Leyland Viking 52s
  capacity: number; // e.g. 48
  routeAssigned: string; // e.g. "Bengaluru - Mysuru"
  lastServiceDate: string; // YYYY-MM-DD
  nextServiceDue: string; // YYYY-MM-DD
  status: 'Active' | 'In Maintenance' | 'Idle';
  driverName?: string;
  onTimePercent?: number; // e.g. 94 (94%)
  fuelEfficiencyScore?: number; // e.g. 88 (88/100)
  fuelIncentiveCredit?: number; // e.g. 2000 (₹2,000 credit)
  aiIncentiveRationale?: string; // cached or live generated rationale
  aiRationale?: string; // cached or live generated rationale
  leaseValue?: number; // monthly payout e.g. 85000 (if Lease)
  renewalDate?: string; // YYYY-MM-DD (if Lease)
}

export type PermitType = 'stage_carriage' | 'contract_carriage' | 'tourist_permit' | 'unverified';

export interface RouteItem {
  id: string;
  ownerId: string;
  routeName: string; // e.g. "Bengaluru → Mysuru Express"
  origin: string;
  destination: string;
  distanceKm: number;
  fixedCharge: number; // base charge ₹
  ratePerKm: number; // ₹ / km
  computedFare: number; // recalculated live: (distanceKm * ratePerKm) + fixedCharge
  tripsPerDay: number;
  permitType?: PermitType; // 'stage_carriage' | 'contract_carriage' | 'tourist_permit' | 'unverified'
  permitNumber?: string; // Optional RTO permit reference number
}

export interface EarningsEntry {
  id: string;
  ownerId: string;
  day: string; // "Mon", "Tue", etc.
  date: string; // YYYY-MM-DD
  ticketRevenue: number;
  cashAmount: number;
  upiAmount: number;
  cardAmount: number;
}

export interface PayoutEntry {
  id: string;
  ownerId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  status: 'Paid' | 'Scheduled' | 'Processing';
  referenceNo: string;
  bankAccount: string;
}

export interface MaintenanceRecord {
  id: string;
  ownerId: string;
  busId: string;
  busReg: string;
  serviceType: string;
  serviceDate: string;
  nextDueDate: string;
  cost: number;
  notes: string;
  mechanicShop?: string;
}

export type DriverStatus = 'Active' | 'On Leave' | 'Off Duty' | 'Relief' | 'profile incomplete';

export type LicenseStatus = 'Valid' | 'Expiring Soon' | 'Expired';

export interface Driver {
  id: string;
  ownerId: string;
  employeeId: string; // e.g. "DRV-101"
  name: string;
  phone: string;
  emergencyContact?: string;
  bloodGroup?: string; // e.g. "O+", "B+", "A+"
  status: DriverStatus; // Active | On Leave | Off Duty | Relief
  licenseNumber: string; // e.g. "KA01 20180004921"
  licenseType: string; // e.g. "Heavy Transport Vehicle (HMV/HTV)" or "Commercial Passenger PSV"
  badgeNumber?: string; // e.g. "KA-PSV-8492"
  licenseExpiryDate: string; // YYYY-MM-DD
  assignedBusId?: string;
  assignedBusReg?: string; // e.g. "KA 01 F 4291"
  assignedRouteId?: string;
  assignedRouteName?: string; // e.g. "Bengaluru → Mysuru Express"
  shiftTiming?: string; // e.g. "Morning Shift (06:00 - 14:00)"
  experienceYears?: number;
  joiningDate?: string; // YYYY-MM-DD
  safetyScore?: number; // 0 - 100
  tripsCompleted?: number;
  notes?: string;
  createdAt?: string;
}

