import { ServiceStatus } from '../types';

/**
 * Format Indian Rupee currency: e.g. 255000 -> "₹2,55,000"
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Calculate service status from lastServiceDate and nextServiceDue
 */
export function getServiceStatus(nextServiceDueStr: string): ServiceStatus {
  if (!nextServiceDueStr) return 'Good';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const due = new Date(nextServiceDueStr);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return 'Overdue';
  } else if (diffDays <= 14) {
    return 'Due';
  } else {
    return 'Good';
  }
}

/**
 * Recalculate route fare:
 * Fare = (distance in km × per-km rate) + fixed charge
 */
export function calculateFare(
  fixedCharge: number,
  distanceKm: number,
  ratePerKm: number = 2.5
): number {
  const raw = distanceKm * ratePerKm + fixedCharge;
  return Math.round(raw);
}
