import { doc, getDoc, setDoc, deleteDoc, writeBatch, getDocs, collection, query, where } from 'firebase/firestore';
import { db, auth } from './firebase';
import { OwnerProfile, Bus, RouteItem, EarningsEntry, PayoutEntry, MaintenanceRecord, Driver, PlanType } from '../types';
import { calculateFare } from './utils';

export const DEMO_SaaS_EMAIL = "demo.saas@tranzit.in";
export const DEMO_LEASE_EMAIL = "demo.lease@tranzit.in";

export const DEMO_SaaS_UID = "owner-saas-demo-uid";
export const DEMO_LEASE_UID = "owner-lease-demo-uid";

export function getRelativeDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

export function formatEmailToName(email: string): string {
  if (!email) return "Fleet Operator";
  const namePart = email.split('@')[0].trim();

  const lower = namePart.toLowerCase();
  if (lower === 'pgbalaadithya' || lower === 'balaadithya' || lower === 'bala_adithya' || lower === 'bala.adithya') {
    return "Bala Adithya";
  }

  if (lower.startsWith('pg') && lower.length > 2) {
    const rest = lower.slice(2);
    return rest.charAt(0).toUpperCase() + rest.slice(1);
  }

  const cleaned = namePart.replace(/[0-9]/g, ' ').trim();
  const words = (cleaned || namePart).split(/[._\-\s]+/).filter(Boolean);
  if (words.length === 0) return "Fleet Operator";
  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export async function createEmptyOwnerProfile(
  ownerId: string,
  email: string,
  planType: PlanType = 'SaaS',
  customProfile?: Partial<OwnerProfile>
): Promise<OwnerProfile> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const properName = customProfile?.name?.trim() || formatEmailToName(cleanEmail);
  const defaultCompany = customProfile?.companyName?.trim() || `${properName} Logistics`;

  const ownerProfile: OwnerProfile = {
    id: ownerId,
    uid: ownerId,
    name: properName,
    email: cleanEmail,
    companyName: defaultCompany,
    planType: planType,
    city: customProfile?.city?.trim() || "Bengaluru",
    phone: customProfile?.phone?.trim() || "+91 98000 00000",
    activeBusesCount: customProfile?.activeBusesCount ?? 0,
    todayRevenue: 0,
    walletBalance: 0,
    saasFeePerBus: 4500,
    nextPayoutDate: customProfile?.nextPayoutDate || "",
    nextPayoutAmount: 0,
    avgDailyRiders: 0,
    createdAt: new Date().toISOString(),
    ...customProfile
  };

  await setDoc(doc(db, 'owners', ownerId), ownerProfile);
  return ownerProfile;
}

export async function seedUserData(
  ownerId: string, 
  email: string, 
  planType: PlanType = 'SaaS', 
  customProfile?: Partial<OwnerProfile>
): Promise<OwnerProfile> {
  const batch = writeBatch(db);
  const isSaaS = planType === 'SaaS';
  const cleanEmail = (email || '').trim().toLowerCase();
  const isDemoSaaS = cleanEmail === DEMO_SaaS_EMAIL.toLowerCase();
  const isDemoLease = cleanEmail === DEMO_LEASE_EMAIL.toLowerCase();

  const defaultName = isDemoSaaS 
    ? "Rajesh Sharma" 
    : isDemoLease 
    ? "Vikramaditya Verma" 
    : formatEmailToName(cleanEmail);

  const defaultCompany = isDemoSaaS 
    ? "Shree Royal Travels" 
    : isDemoLease 
    ? "Verma Fleet Operations" 
    : `${defaultName} Logistics`;

  const ownerProfile: OwnerProfile = {
    id: ownerId,
    uid: ownerId,
    name: customProfile?.name?.trim() || defaultName,
    email: cleanEmail || (isSaaS ? DEMO_SaaS_EMAIL : DEMO_LEASE_EMAIL),
    companyName: customProfile?.companyName?.trim() || defaultCompany,
    planType: planType,
    activeBusesCount: customProfile?.activeBusesCount ?? 3,
    todayRevenue: customProfile?.todayRevenue ?? (isSaaS ? 48250 : 0),
    walletBalance: customProfile?.walletBalance ?? (isSaaS ? 185400 : 0),
    saasFeePerBus: 4500,
    nextPayoutDate: isSaaS ? getRelativeDateStr(5) : getRelativeDateStr(14),
    nextPayoutAmount: isSaaS ? 185400 : 255000,
    avgDailyRiders: isSaaS ? 1240 : 1580,
    city: customProfile?.city?.trim() || (isDemoLease ? "Hubballi" : "Bengaluru"),
    phone: customProfile?.phone?.trim() || "+91 98450 12345"
  };

  batch.set(doc(db, 'owners', ownerId), ownerProfile);

  // Buses
  const buses: Bus[] = isSaaS
    ? [
        {
          id: `${ownerId}-bus-1`,
          ownerId: ownerId,
          regNumber: "KA 01 F 4291",
          model: "Ashok Leyland Viking 52s",
          capacity: 52,
          routeAssigned: "Bengaluru → Mysuru Express",
          lastServiceDate: getRelativeDateStr(-30),
          nextServiceDue: getRelativeDateStr(30),
          status: "Active",
          driverName: "Ramesh Kumar",
          onTimePercent: 94,
          fuelEfficiencyScore: 92,
          fuelIncentiveCredit: 2000
        },
        {
          id: `${ownerId}-bus-2`,
          ownerId: ownerId,
          regNumber: "KA 05 FA 8812",
          model: "Tata LPO 1618 Sleeper",
          capacity: 48,
          routeAssigned: "Bengaluru → Hosur Commuter",
          lastServiceDate: getRelativeDateStr(-60),
          nextServiceDue: getRelativeDateStr(5),
          status: "Active",
          driverName: "Siddharth Gowda",
          onTimePercent: 88,
          fuelEfficiencyScore: 81,
          fuelIncentiveCredit: 1500
        },
        {
          id: `${ownerId}-bus-3`,
          ownerId: ownerId,
          regNumber: "KA 53 M 1049",
          model: "Eicher Skyline Pro 40",
          capacity: 40,
          routeAssigned: "Mysuru → Hassan Intercity",
          lastServiceDate: getRelativeDateStr(-90),
          nextServiceDue: getRelativeDateStr(-10), // Overdue
          status: "In Maintenance",
          driverName: "Manjunath Naidu",
          onTimePercent: 96,
          fuelEfficiencyScore: 95,
          fuelIncentiveCredit: 2500
        }
      ]
    : [
        {
          id: `${ownerId}-bus-1`,
          ownerId: ownerId,
          regNumber: "KA 25 C 7701",
          model: "Volvo B11R Multi-Axle Sleeper",
          capacity: 53,
          routeAssigned: "Hubballi → Bengaluru Express",
          lastServiceDate: getRelativeDateStr(-25),
          nextServiceDue: getRelativeDateStr(35),
          status: "Active",
          driverName: "Prakash Patel",
          onTimePercent: 96,
          fuelEfficiencyScore: 91,
          fuelIncentiveCredit: 2200,
          leaseValue: 95000,
          renewalDate: getRelativeDateStr(180)
        },
        {
          id: `${ownerId}-bus-2`,
          ownerId: ownerId,
          regNumber: "KA 25 C 7702",
          model: "Scania Metrolink HD",
          capacity: 49,
          routeAssigned: "Hubballi → Pune Intercity",
          lastServiceDate: getRelativeDateStr(-50),
          nextServiceDue: getRelativeDateStr(10),
          status: "Active",
          driverName: "Anil Deshmukh",
          onTimePercent: 89,
          fuelEfficiencyScore: 84,
          fuelIncentiveCredit: 1600,
          leaseValue: 85000,
          renewalDate: getRelativeDateStr(120)
        },
        {
          id: `${ownerId}-bus-3`,
          ownerId: ownerId,
          regNumber: "KA 25 C 7703",
          model: "Tata Starbus Ultra AC",
          capacity: 42,
          routeAssigned: "Dharwad → Belagavi Shuttle",
          lastServiceDate: getRelativeDateStr(-85),
          nextServiceDue: getRelativeDateStr(-5), // Overdue
          status: "In Maintenance",
          driverName: "Ganesh Kulkarni",
          onTimePercent: 92,
          fuelEfficiencyScore: 88,
          fuelIncentiveCredit: 1800,
          leaseValue: 75000,
          renewalDate: getRelativeDateStr(90)
        }
      ];

  for (const b of buses) {
    batch.set(doc(db, "buses", b.id), b);
  }

  // Routes
  const routes: RouteItem[] = isSaaS
    ? [
        {
          id: `${ownerId}-route-1`,
          ownerId: ownerId,
          routeName: "Bengaluru → Mysuru Express",
          origin: "Bengaluru (Kalashipalyam)",
          destination: "Mysuru (KSRTC Bus Stand)",
          distanceKm: 145,
          fixedCharge: 50,
          ratePerKm: 2.5,
          computedFare: calculateFare(50, 145, 2.5),
          tripsPerDay: 4,
          permitType: "stage_carriage",
          permitNumber: "KA/STA/SC/2023/8841"
        },
        {
          id: `${ownerId}-route-2`,
          ownerId: ownerId,
          routeName: "Bengaluru → Hosur Commuter",
          origin: "Silk Board, Bengaluru",
          destination: "Hosur Bus Station",
          distanceKm: 38,
          fixedCharge: 25,
          ratePerKm: 2.2,
          computedFare: calculateFare(25, 38, 2.2),
          tripsPerDay: 8,
          permitType: "contract_carriage",
          permitNumber: "KA/CC/BLR/2022/1902"
        },
        {
          id: `${ownerId}-route-3`,
          ownerId: ownerId,
          routeName: "Mysuru → Hassan Intercity",
          origin: "Mysuru Central",
          destination: "Hassan Bus Stop",
          distanceKm: 118,
          fixedCharge: 40,
          ratePerKm: 2.4,
          computedFare: calculateFare(40, 118, 2.4),
          tripsPerDay: 3,
          permitType: "tourist_permit",
          permitNumber: "AITP/KA/2024/7123"
        }
      ]
    : [
        {
          id: `${ownerId}-route-1`,
          ownerId: ownerId,
          routeName: "Hubballi → Bengaluru Express",
          origin: "Old Bus Stand, Hubballi",
          destination: "Majestic, Bengaluru",
          distanceKm: 410,
          fixedCharge: 100,
          ratePerKm: 2.8,
          computedFare: calculateFare(100, 410, 2.8),
          tripsPerDay: 2,
          permitType: "stage_carriage",
          permitNumber: "KA/STA/SC/2022/4119"
        },
        {
          id: `${ownerId}-route-2`,
          ownerId: ownerId,
          routeName: "Hubballi → Pune Intercity",
          origin: "Gokul Road Hubballi",
          destination: "Swargate Pune",
          distanceKm: 440,
          fixedCharge: 120,
          ratePerKm: 2.9,
          computedFare: calculateFare(120, 440, 2.9),
          tripsPerDay: 2,
          permitType: "contract_carriage",
          permitNumber: "AITP/KA/2023/9012"
        },
        {
          id: `${ownerId}-route-3`,
          ownerId: ownerId,
          routeName: "Dharwad → Belagavi Shuttle",
          origin: "CBT Dharwad",
          destination: "CBT Belagavi",
          distanceKm: 76,
          fixedCharge: 30,
          ratePerKm: 2.3,
          computedFare: calculateFare(30, 76, 2.3),
          tripsPerDay: 6,
          permitType: "stage_carriage",
          permitNumber: "KA/STA/SC/2024/1188"
        }
      ];

  for (const r of routes) {
    batch.set(doc(db, "routes", r.id), r);
  }

  // Earnings for SaaS
  if (isSaaS) {
    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const baselineByDay = [
      { day: 'Sun', base: 51000, cash: 15000, upi: 30000, card: 6000 },
      { day: 'Mon', base: 42500, cash: 12000, upi: 26500, card: 4000 },
      { day: 'Tue', base: 45200, cash: 13500, upi: 27200, card: 4500 },
      { day: 'Wed', base: 42000, cash: 11000, upi: 27000, card: 4000 },
      { day: 'Thu', base: 46100, cash: 12500, upi: 28600, card: 5000 },
      { day: 'Fri', base: 52400, cash: 15000, upi: 31400, card: 6000 },
      { day: 'Sat', base: 58900, cash: 18200, upi: 33700, card: 7000 },
    ];

    for (let offset = -28; offset <= 0; offset++) {
      const dateStr = getRelativeDateStr(offset);
      const dayIdx = new Date(dateStr).getDay();
      const baseInfo = baselineByDay[dayIdx];
      const dayName = offset === 0 ? 'Today' : weekdayNames[dayIdx];
      const id = `${ownerId}-e-${offset + 28}`;

      let rev = baseInfo.base;
      let cash = baseInfo.cash;
      let upi = baseInfo.upi;
      let card = baseInfo.card;

      if (offset < -6) {
        const variance = ((Math.abs(offset * 13) % 7) - 3) * 500;
        rev += variance;
        upi += variance;
      }

      if (offset === -4) {
        rev = Math.round(baseInfo.base * 0.68);
        cash = Math.round(baseInfo.cash * 0.6);
        upi = Math.round(baseInfo.upi * 0.7);
        card = rev - cash - upi;
      }

      const entry: EarningsEntry = {
        id,
        ownerId: ownerId,
        day: dayName,
        date: dateStr,
        ticketRevenue: rev,
        cashAmount: cash,
        upiAmount: upi,
        cardAmount: card
      };
      batch.set(doc(db, "earnings", id), entry);
    }
  }

  // Payouts for Lease
  if (!isSaaS) {
    const payouts: PayoutEntry[] = [
      { id: `${ownerId}-p-1`, ownerId: ownerId, date: getRelativeDateStr(14), amount: 255000, status: "Scheduled", referenceNo: "SCH-AUTO-01", bankAccount: "HDFC Bank (•••• 4921)" },
      { id: `${ownerId}-p-2`, ownerId: ownerId, date: getRelativeDateStr(-16), amount: 255000, status: "Paid", referenceNo: "TXN-AUTO-882", bankAccount: "HDFC Bank (•••• 4921)" },
      { id: `${ownerId}-p-3`, ownerId: ownerId, date: getRelativeDateStr(-46), amount: 255000, status: "Paid", referenceNo: "TXN-AUTO-419", bankAccount: "HDFC Bank (•••• 4921)" },
      { id: `${ownerId}-p-4`, ownerId: ownerId, date: getRelativeDateStr(-76), amount: 255000, status: "Paid", referenceNo: "TXN-AUTO-105", bankAccount: "HDFC Bank (•••• 4921)" },
    ];
    for (const p of payouts) {
      batch.set(doc(db, "payouts", p.id), p);
    }
  }

  // Maintenance
  const maintenanceRecords: MaintenanceRecord[] = isSaaS
    ? [
        {
          id: `${ownerId}-m-1`,
          ownerId: ownerId,
          busId: `${ownerId}-bus-1`,
          busReg: "KA 01 F 4291",
          serviceType: "Engine Oil & Filter Change",
          serviceDate: getRelativeDateStr(-30),
          nextDueDate: getRelativeDateStr(30),
          cost: 8500,
          notes: "Shell Rimula R4 15W40 oil used. All filters replaced.",
          mechanicShop: "Sri Lakshmi Motors, Peenya"
        },
        {
          id: `${ownerId}-m-2`,
          ownerId: ownerId,
          busId: `${ownerId}-bus-2`,
          busReg: "KA 05 FA 8812",
          serviceType: "Brake Lining & Drum Resurfacing",
          serviceDate: getRelativeDateStr(-60),
          nextDueDate: getRelativeDateStr(5),
          cost: 14200,
          notes: "Front and rear brake pads replaced. Tested brake force.",
          mechanicShop: "Tata Authorized Service Center"
        },
        {
          id: `${ownerId}-m-3`,
          ownerId: ownerId,
          busId: `${ownerId}-bus-3`,
          busReg: "KA 53 M 1049",
          serviceType: "Clutch Plate & Pressure Assembly",
          serviceDate: getRelativeDateStr(-90),
          nextDueDate: getRelativeDateStr(-10),
          cost: 19800,
          notes: "Overdue for 15,000km scheduled service.",
          mechanicShop: "Eicher Motors Workshop"
        }
      ]
    : [
        {
          id: `${ownerId}-m-1`,
          ownerId: ownerId,
          busId: `${ownerId}-bus-1`,
          busReg: "KA 25 C 7701",
          serviceType: "Air Suspension Calibration & Alignment",
          serviceDate: getRelativeDateStr(-25),
          nextDueDate: getRelativeDateStr(35),
          cost: 18000,
          notes: "Handled by Tranzit Central Fleet Depot.",
          mechanicShop: "Tranzit Hubballi Depot"
        },
        {
          id: `${ownerId}-m-2`,
          ownerId: ownerId,
          busId: `${ownerId}-bus-2`,
          busReg: "KA 25 C 7702",
          serviceType: "AC Compressor & Belt Replacement",
          serviceDate: getRelativeDateStr(-50),
          nextDueDate: getRelativeDateStr(10),
          cost: 24500,
          notes: "Scheduled checkup completed.",
          mechanicShop: "Tranzit Hubballi Depot"
        }
      ];

  for (const m of maintenanceRecords) {
    batch.set(doc(db, "maintenance", m.id), m);
  }

  // Drivers
  const drivers: Driver[] = isSaaS
    ? [
        {
          id: `${ownerId}-drv-1`,
          ownerId: ownerId,
          employeeId: "DRV-101",
          name: "Ramesh Kumar",
          phone: "+91 98451 22340",
          emergencyContact: "+91 98451 88710 (Spouse - Sunita)",
          bloodGroup: "B+",
          status: "Active",
          licenseNumber: "KA01 20160004921",
          licenseType: "Heavy Commercial Transport (HMV/HTV)",
          badgeNumber: "KA-PSV-8492",
          licenseExpiryDate: getRelativeDateStr(240),
          assignedBusId: `${ownerId}-bus-1`,
          assignedBusReg: "KA 01 F 4291",
          assignedRouteId: `${ownerId}-route-1`,
          assignedRouteName: "Bengaluru → Mysuru Express",
          shiftTiming: "Morning Shift (06:00 - 14:30)",
          experienceYears: 11,
          joiningDate: "2021-04-15",
          safetyScore: 97,
          tripsCompleted: 840,
          notes: "Senior intercity pilot. Trained for emergency night braking and eco-driving."
        },
        {
          id: `${ownerId}-drv-2`,
          ownerId: ownerId,
          employeeId: "DRV-102",
          name: "Siddharth Gowda",
          phone: "+91 94480 33491",
          emergencyContact: "+91 94480 11200 (Brother - Chetan)",
          bloodGroup: "O+",
          status: "Active",
          licenseNumber: "KA05 20190019284",
          licenseType: "Heavy Passenger Commercial (HMV/PSV)",
          badgeNumber: "KA-PSV-6102",
          licenseExpiryDate: getRelativeDateStr(18),
          assignedBusId: `${ownerId}-bus-2`,
          assignedBusReg: "KA 05 FA 8812",
          assignedRouteId: `${ownerId}-route-2`,
          assignedRouteName: "Bengaluru → Hosur Commuter",
          shiftTiming: "Split Commuter (07:30 - 11:30 & 16:30 - 20:30)",
          experienceYears: 6,
          joiningDate: "2023-01-10",
          safetyScore: 92,
          tripsCompleted: 520,
          notes: "Commercial license renewal submitted at Jayanagar RTO counter."
        },
        {
          id: `${ownerId}-drv-3`,
          ownerId: ownerId,
          employeeId: "DRV-103",
          name: "Manjunath Naidu",
          phone: "+91 97314 99120",
          emergencyContact: "+91 97314 77411 (Son - Praveen)",
          bloodGroup: "A+",
          status: "On Leave",
          licenseNumber: "KA53 20150007812",
          licenseType: "Heavy Transport Vehicle (HMV/HTV)",
          badgeNumber: "KA-PSV-4911",
          licenseExpiryDate: getRelativeDateStr(420),
          assignedBusId: `${ownerId}-bus-3`,
          assignedBusReg: "KA 53 M 1049",
          assignedRouteId: `${ownerId}-route-3`,
          assignedRouteName: "Mysuru → Hassan Intercity",
          shiftTiming: "Day Shift (09:00 - 17:00)",
          experienceYears: 14,
          joiningDate: "2020-08-01",
          safetyScore: 99,
          tripsCompleted: 1120,
          notes: "Assigned bus is in scheduled maintenance. On approved medical leave."
        },
        {
          id: `${ownerId}-drv-4`,
          ownerId: ownerId,
          employeeId: "DRV-104",
          name: "Raghavendra Rao",
          phone: "+91 98860 41258",
          emergencyContact: "+91 98860 11990 (Wife - Lakshmi)",
          bloodGroup: "AB+",
          status: "Relief",
          licenseNumber: "KA04 20170023419",
          licenseType: "Heavy Commercial Passenger (PSV)",
          badgeNumber: "KA-PSV-9014",
          licenseExpiryDate: getRelativeDateStr(190),
          assignedBusId: "",
          assignedBusReg: "Standby / Relief Pool",
          assignedRouteId: "",
          assignedRouteName: "All Routes (Standby Coverage)",
          shiftTiming: "Flexible Rotational Dispatch",
          experienceYears: 9,
          joiningDate: "2022-11-15",
          safetyScore: 95,
          tripsCompleted: 340,
          notes: "Designated standby pilot for peak weekend operations and emergency replacement."
        }
      ]
    : [
        {
          id: `${ownerId}-drv-1`,
          ownerId: ownerId,
          employeeId: "DRV-201",
          name: "Prakash Patel",
          phone: "+91 98230 45610",
          emergencyContact: "+91 98230 99810 (Wife - Meena)",
          bloodGroup: "O+",
          status: "Active",
          licenseNumber: "KA25 20140003189",
          licenseType: "Heavy Transport Multi-Axle (HMV/HTV)",
          badgeNumber: "KA-PSV-7104",
          licenseExpiryDate: getRelativeDateStr(310),
          assignedBusId: `${ownerId}-bus-1`,
          assignedBusReg: "KA 25 C 7701",
          assignedRouteId: `${ownerId}-route-1`,
          assignedRouteName: "Hubballi → Bengaluru Express",
          shiftTiming: "Night Sleeper Express (21:00 - 06:00)",
          experienceYears: 15,
          joiningDate: "2019-06-01",
          safetyScore: 98,
          tripsCompleted: 1450,
          notes: "Multi-axle Volvo certified driver with zero accident record across 5 years."
        },
        {
          id: `${ownerId}-drv-2`,
          ownerId: ownerId,
          employeeId: "DRV-202",
          name: "Anil Deshmukh",
          phone: "+91 97650 31289",
          emergencyContact: "+91 97650 88210 (Brother - Sanjay)",
          bloodGroup: "B+",
          status: "Active",
          licenseNumber: "KA25 20180014290",
          licenseType: "Heavy Passenger Transport (HMV/PSV)",
          badgeNumber: "KA-PSV-5520",
          licenseExpiryDate: getRelativeDateStr(22),
          assignedBusId: `${ownerId}-bus-2`,
          assignedBusReg: "KA 25 C 7702",
          assignedRouteId: `${ownerId}-route-2`,
          assignedRouteName: "Hubballi → Pune Intercity",
          shiftTiming: "Interstate Day Express (06:30 - 16:30)",
          experienceYears: 8,
          joiningDate: "2021-09-12",
          safetyScore: 91,
          tripsCompleted: 680,
          notes: "Interstate route driver. Medical fitness certificate renewed last month."
        },
        {
          id: `${ownerId}-drv-3`,
          ownerId: ownerId,
          employeeId: "DRV-203",
          name: "Ganesh Kulkarni",
          phone: "+91 94220 77154",
          emergencyContact: "+91 94220 33410 (Father - Narayan)",
          bloodGroup: "A+",
          status: "Off Duty",
          licenseNumber: "KA26 20160009823",
          licenseType: "Heavy Commercial Transport (HMV)",
          badgeNumber: "KA-PSV-3891",
          licenseExpiryDate: getRelativeDateStr(160),
          assignedBusId: `${ownerId}-bus-3`,
          assignedBusReg: "KA 25 C 7703",
          assignedRouteId: `${ownerId}-route-3`,
          assignedRouteName: "Dharwad → Belagavi Shuttle",
          shiftTiming: "Regular Shift (08:00 - 17:00)",
          experienceYears: 10,
          joiningDate: "2020-02-18",
          safetyScore: 94,
          tripsCompleted: 910,
          notes: "Scheduled weekly rest day."
        },
        {
          id: `${ownerId}-drv-4`,
          ownerId: ownerId,
          employeeId: "DRV-204",
          name: "Suresh Jadhav",
          phone: "+91 99701 88421",
          emergencyContact: "+91 99701 22109 (Spouse - Rekha)",
          bloodGroup: "O-",
          status: "Relief",
          licenseNumber: "KA28 20170044192",
          licenseType: "Heavy Commercial Transport (HMV/HTV)",
          badgeNumber: "KA-PSV-8201",
          licenseExpiryDate: getRelativeDateStr(290),
          assignedBusId: "",
          assignedBusReg: "Standby / Relief Pool",
          assignedRouteId: "",
          assignedRouteName: "Hubballi Hub Relievers",
          shiftTiming: "On-Call Relief Shift",
          experienceYears: 7,
          joiningDate: "2023-05-10",
          safetyScore: 96,
          tripsCompleted: 290,
          notes: "Backup driver for overnight sleeper services."
        }
      ];

  for (const d of drivers) {
    batch.set(doc(db, "drivers", d.id), d);
  }

  await batch.commit();
  return ownerProfile;
}

export async function deleteAllUserData(ownerId: string, email?: string): Promise<void> {
  const collections = ['buses', 'routes', 'earnings', 'payouts', 'maintenance', 'drivers'];
  const idsToDelete = new Set<string>();
  
  if (ownerId) {
    idsToDelete.add(ownerId);
    idsToDelete.add(ownerId.toLowerCase());
  }

  if (auth.currentUser?.uid) {
    idsToDelete.add(auth.currentUser.uid);
  }

  const effectiveEmail = (email || auth.currentUser?.email || '').toLowerCase().trim();
  if (effectiveEmail) {
    idsToDelete.add(`owner-${effectiveEmail.replace(/[^a-zA-Z0-9]/g, '_')}`);
    idsToDelete.add(effectiveEmail);
    idsToDelete.add(effectiveEmail.replace(/[^a-zA-Z0-9]/g, '_'));
  }

  // 1. Delete owner documents by direct ID
  for (const id of Array.from(idsToDelete)) {
    try {
      await deleteDoc(doc(db, 'owners', id));
    } catch (e) {
      console.warn(`Owner doc deletion notice for ${id}:`, e);
    }
  }

  // 2. Scan owners collection to delete any docs matching email or ownerId
  try {
    const allOwners = await getDocs(collection(db, 'owners'));
    for (const d of allOwners.docs) {
      const data = d.data();
      const docEmail = (data.email || '').toLowerCase().trim();
      const docOwnerId = (data.id || data.uid || '').toLowerCase().trim();
      if (
        idsToDelete.has(d.id) ||
        (effectiveEmail && docEmail === effectiveEmail) ||
        (ownerId && docOwnerId === ownerId.toLowerCase())
      ) {
        try {
          await deleteDoc(d.ref);
          idsToDelete.add(d.id);
        } catch (delErr) {
          console.warn(`Failed to delete owner ${d.id}:`, delErr);
        }
      }
    }
  } catch (ownerScanErr) {
    console.warn("Owner collection scan notice:", ownerScanErr);
  }

  // 3. Delete all sub-records across collections
  for (const collName of collections) {
    for (const id of Array.from(idsToDelete)) {
      try {
        const snap = await getDocs(query(collection(db, collName), where('ownerId', '==', id)));
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (e) {
        console.warn(`Collection ${collName} deletion notice for ${id}:`, e);
      }
    }

    // Also check for email field in records if present
    if (effectiveEmail) {
      try {
        const emailSnap = await getDocs(query(collection(db, collName), where('email', '==', effectiveEmail)));
        if (!emailSnap.empty) {
          const batch = writeBatch(db);
          emailSnap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (emailCollErr) {
        // Safe to ignore if field doesn't exist
      }
    }
  }
}

export async function wipeAllDatabaseData(): Promise<number> {
  const collections = ['owners', 'buses', 'routes', 'earnings', 'payouts', 'maintenance', 'drivers'];
  let totalDeleted = 0;

  for (const collName of collections) {
    try {
      const snap = await getDocs(collection(db, collName));
      const batchSize = 400;
      let batch = writeBatch(db);
      let count = 0;

      for (const d of snap.docs) {
        batch.delete(d.ref);
        count++;
        totalDeleted++;
        if (count >= batchSize) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
    } catch (err) {
      console.error(`Error wiping collection ${collName}:`, err);
    }
  }
  return totalDeleted;
}

export async function seedInitialFirestoreData(force = false) {
  // Only execute when user is authenticated to adhere to Firestore security rules
  if (!auth.currentUser) {
    return;
  }
  try {
    const uid = auth.currentUser.uid;
    const snap = await getDoc(doc(db, 'owners', uid));
    if (!snap.exists() || force) {
      await seedUserData(uid, auth.currentUser.email || DEMO_SaaS_EMAIL, 'SaaS');
    }
  } catch (err) {
    console.warn("Firestore seed check notice:", err);
  }
}
