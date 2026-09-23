import { ServiceStatus, LicenseStatus, PermitType } from '../types';

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
 * License validity calculation:
 * - 'Expired': Date is past
 * - 'Expiring Soon': Within 45 days of expiry
 * - 'Valid': More than 45 days of validity remaining
 */
export function getLicenseValidityInfo(expiryDateStr: string): {
  status: LicenseStatus;
  daysRemaining: number;
  label: string;
  isUrgent: boolean;
} {
  if (!expiryDateStr) {
    return { status: 'Expired', daysRemaining: -999, label: 'No Expiry Date', isUrgent: true };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    const daysAgo = Math.abs(daysRemaining);
    return {
      status: 'Expired',
      daysRemaining,
      label: `Expired ${daysAgo === 0 ? 'today' : `${daysAgo}d ago`}`,
      isUrgent: true
    };
  } else if (daysRemaining <= 45) {
    return {
      status: 'Expiring Soon',
      daysRemaining,
      label: `Expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
      isUrgent: true
    };
  } else {
    return {
      status: 'Valid',
      daysRemaining,
      label: `Valid (${daysRemaining} days left)`,
      isUrgent: false
    };
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

/**
 * Named constant for anomaly threshold on collections.
 * Flags any day that is more than 25% below the trailing 4-week average for the same weekday.
 */
export const ANOMALY_THRESHOLD_PERCENT = 25;

export interface AnomalyAnalysis {
  isAnomaly: boolean;
  expectedAvg: number;
  sampleCount: number;
  percentDrop: number;
  priorDates: string[];
}

/**
 * Compare target day's ticket revenue against the owner's trailing 4-week average for the same weekday.
 */
export function computeWeekdayAnomaly(
  targetEntry: { date: string; ticketRevenue: number },
  allEntries: { date: string; ticketRevenue: number }[],
  thresholdPercent: number = ANOMALY_THRESHOLD_PERCENT
): AnomalyAnalysis {
  const targetDate = new Date(targetEntry.date);
  if (isNaN(targetDate.getTime())) {
    return { isAnomaly: false, expectedAvg: targetEntry.ticketRevenue, sampleCount: 0, percentDrop: 0, priorDates: [] };
  }

  // Find prior entries from earlier weeks on the same weekday (7, 14, 21, 28 days prior)
  const priorMatches: { date: string; ticketRevenue: number }[] = [];
  allEntries.forEach(entry => {
    if (entry.date === targetEntry.date) return;
    const entryDate = new Date(entry.date);
    if (isNaN(entryDate.getTime())) return;

    const diffMs = targetDate.getTime() - entryDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && diffDays <= 28 && diffDays % 7 === 0) {
      priorMatches.push(entry);
    }
  });

  if (priorMatches.length === 0) {
    return { isAnomaly: false, expectedAvg: targetEntry.ticketRevenue, sampleCount: 0, percentDrop: 0, priorDates: [] };
  }

  const sum = priorMatches.reduce((acc, curr) => acc + (curr.ticketRevenue || 0), 0);
  const expectedAvg = Math.round(sum / priorMatches.length);
  const drop = expectedAvg - targetEntry.ticketRevenue;
  const percentDrop = Math.round((drop / expectedAvg) * 100);

  return {
    isAnomaly: percentDrop > thresholdPercent,
    expectedAvg,
    sampleCount: priorMatches.length,
    percentDrop,
    priorDates: priorMatches.map(p => p.date)
  };
}

/**
 * Calculate days remaining until a specified target date (YYYY-MM-DD).
 * Returns null if invalid or 'Paid Out Today'.
 */
export function getDaysUntil(dateStr?: string): number | null {
  if (!dateStr || dateStr.toLowerCase().includes('paid')) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Universal client-side CSV export helper.
 */
export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const escapeCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
  * Route Permit Classification and Fare Regulation Helper
  */
export interface PermitTypeConfig {
  type: PermitType;
  label: string;
  shortLabel: string;
  isFareEditable: boolean;
  isUnverified: boolean;
  regulatoryNotice: string;
  badgeClass: string;
  badgeDotClass: string;
}

export function getPermitTypeConfig(permitType?: PermitType): PermitTypeConfig {
  switch (permitType) {
    case 'stage_carriage':
      return {
        type: 'stage_carriage',
        label: 'Stage Carriage Permit',
        shortLabel: 'Stage Carriage (STA)',
        isFareEditable: false,
        isUnverified: false,
        regulatoryNotice: 'Set by State Transport Authority — not editable',
        badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
        badgeDotClass: 'bg-blue-500'
      };
    case 'contract_carriage':
      return {
        type: 'contract_carriage',
        label: 'Contract Carriage Permit',
        shortLabel: 'Contract Carriage',
        isFareEditable: true,
        isUnverified: false,
        regulatoryNotice: 'Operator-managed dynamic distance & fixed fare pricing',
        badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
        badgeDotClass: 'bg-emerald-500'
      };
    case 'tourist_permit':
      return {
        type: 'tourist_permit',
        label: 'Tourist Permit (All-India / State)',
        shortLabel: 'Tourist Permit',
        isFareEditable: true,
        isUnverified: false,
        regulatoryNotice: 'Operator-managed commercial & package pricing',
        badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
        badgeDotClass: 'bg-purple-500'
      };
    case 'unverified':
    default:
      return {
        type: 'unverified',
        label: 'Unverified Permit Status',
        shortLabel: 'Unverified Permit',
        isFareEditable: false,
        isUnverified: true,
        regulatoryNotice: 'Regulatory permit classification unconfirmed — fare editing locked',
        badgeClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/30',
        badgeDotClass: 'bg-amber-500'
      };
  }
}
