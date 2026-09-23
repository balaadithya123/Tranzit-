import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { TierPricingConfig, SubscriptionTierId, OwnerProfile } from '../types';

export const DEFAULT_TIER_PRICING: TierPricingConfig = {
  starterRate: 649,
  growthRate: 899,
  enterpriseRate: 1599,
  updatedAt: new Date().toISOString(),
  updatedBy: 'Platform System'
};

export interface PlanTierDefinition {
  id: SubscriptionTierId;
  name: string;
  busRangeLabel: string;
  minBuses: number;
  maxBuses: number | null; // null for 21+
  isPopular?: boolean;
  isContactSales?: boolean;
  tagline: string;
  features: string[];
}

export const PLAN_TIERS: PlanTierDefinition[] = [
  {
    id: 'starter',
    name: 'Starter',
    busRangeLabel: '1–5 Buses',
    minBuses: 1,
    maxBuses: 5,
    tagline: 'Essential route tracking and ticket collection for emerging bus fleets.',
    features: [
      'Fleet tracking for up to 5 buses',
      'Real-time passenger fare collection',
      'Daily ticket & cash vs digital logs',
      'Basic maintenance reminder alerts',
      'Standard email & chat assistance'
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    busRangeLabel: '6–20 Buses',
    minBuses: 6,
    maxBuses: 20,
    isPopular: true,
    tagline: 'High-volume telemetry and automated perks for established fleet operators.',
    features: [
      'Scale smoothly from 6 to 20 buses',
      'AI-powered driver fuel & incentive scoring',
      'Multi-route fare schedule optimization',
      'RTO commercial permit audit alerts',
      'Priority settlement reconciliation',
      '24/7 dedicated fleet support'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    busRangeLabel: '21+ Buses',
    minBuses: 21,
    maxBuses: null,
    isContactSales: true,
    tagline: 'Custom telemetry, depot integrations, and bespoke terms for large fleets.',
    features: [
      'Unlimited fleet expansion (21+ buses)',
      'Direct ERP, Fastag & fuel sensor sync',
      'Dedicated regional account manager',
      'Custom SLA & depot dispatch software',
      'Bespoke volume discounts and invoicing'
    ]
  }
];

/**
 * Check if the given user is platform administrator.
 * Strictly respects owner.isAdmin property without hardcoding email addresses.
 */
export function isPlatformAdmin(owner: OwnerProfile | null | undefined): boolean {
  if (!owner) return false;
  return owner.isAdmin === true;
}

/**
 * Determine which tier matches the given bus fleet count
 */
export function getMatchingTier(busCount: number): PlanTierDefinition {
  const count = Math.max(0, busCount);
  if (count <= 5) {
    return PLAN_TIERS[0]; // Starter (1-5, or 0 clean fleet)
  }
  if (count <= 20) {
    return PLAN_TIERS[1]; // Growth (6-20)
  }
  return PLAN_TIERS[2]; // Enterprise (21+)
}

/**
 * Get current rate for a tier from the pricing config
 */
export function getRateForTier(tierId: SubscriptionTierId, pricing: TierPricingConfig): number {
  switch (tierId) {
    case 'starter':
      return pricing.starterRate || DEFAULT_TIER_PRICING.starterRate;
    case 'growth':
      return pricing.growthRate || DEFAULT_TIER_PRICING.growthRate;
    case 'enterprise':
      return pricing.enterpriseRate || DEFAULT_TIER_PRICING.enterpriseRate;
    default:
      return DEFAULT_TIER_PRICING.growthRate;
  }
}

/**
 * Real-time subscription to platform tier rates from Firestore
 */
export function subscribeToTierPricing(onUpdate: (pricing: TierPricingConfig) => void): () => void {
  const pricingRef = doc(db, 'platform_settings', 'pricing');

  const unsubscribe = onSnapshot(pricingRef, async (snap) => {
    if (snap.exists()) {
      const data = snap.data() as TierPricingConfig;
      // Auto-update legacy seeded defaults (799 / 649 / 499) to new rates (649 / 899 / 1599)
      if (data.starterRate === 799 && data.growthRate === 649 && data.enterpriseRate === 499) {
        setDoc(pricingRef, DEFAULT_TIER_PRICING, { merge: true }).catch(() => {});
        onUpdate(DEFAULT_TIER_PRICING);
        return;
      }
      onUpdate({
        starterRate: data.starterRate ?? DEFAULT_TIER_PRICING.starterRate,
        growthRate: data.growthRate ?? DEFAULT_TIER_PRICING.growthRate,
        enterpriseRate: data.enterpriseRate ?? DEFAULT_TIER_PRICING.enterpriseRate,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy
      });
    } else {
      // Seed initial default pricing
      try {
        await setDoc(pricingRef, DEFAULT_TIER_PRICING);
      } catch (err) {
        console.warn('Could not seed default platform pricing:', err);
      }
      onUpdate(DEFAULT_TIER_PRICING);
    }
  }, (err) => {
    console.warn('Notice reading platform pricing from Firestore:', err);
    onUpdate(DEFAULT_TIER_PRICING);
  });

  return unsubscribe;
}

/**
 * Update tier pricing by platform admin only
 */
export async function updateTierPricingByAdmin(
  newRates: { starterRate: number; growthRate: number; enterpriseRate: number },
  adminEmail: string
): Promise<void> {
  const pricingRef = doc(db, 'platform_settings', 'pricing');
  const payload: TierPricingConfig = {
    starterRate: Number(newRates.starterRate),
    growthRate: Number(newRates.growthRate),
    enterpriseRate: Number(newRates.enterpriseRate),
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmail || 'Platform Administrator'
  };

  await setDoc(pricingRef, payload, { merge: true });
}

/**
 * Record owner's plan selection in Firestore
 */
export async function recordPlanSelection(
  ownerId: string,
  tier: PlanTierDefinition,
  perBusRate: number
): Promise<{ tierId: SubscriptionTierId; planName: string; perBusRate: number }> {
  const ownerRef = doc(db, 'owners', ownerId);

  const updatePayload = {
    subscriptionTier: tier.id,
    subscriptionPlanName: tier.name,
    saasFeePerBus: perBusRate,
    subscriptionSelectedAt: new Date().toISOString()
  };

  await setDoc(ownerRef, updatePayload, { merge: true });

  return {
    tierId: tier.id,
    planName: tier.name,
    perBusRate
  };
}
