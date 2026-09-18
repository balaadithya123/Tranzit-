import { doc, setDoc, getDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { OwnerProfile, Bus, RouteItem, EarningsEntry, PayoutEntry, MaintenanceRecord, Driver } from '../types';
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

export async function seedInitialFirestoreData(force = false) {
  try {
    // Check if SaaS demo owner exists or if bus metrics need backfilling
    const saasRef = doc(db, 'owners', DEMO_SaaS_UID);
    const saasSnap = await getDoc(saasRef);
    const bus1Snap = await getDoc(doc(db, 'buses', 'bus-saas-1'));
    const histSnap = await getDoc(doc(db, 'earnings', 'e-hist-28'));
    const route1Snap = await getDoc(doc(db, 'routes', 'route-saas-1'));

    if (!saasSnap.exists() || !bus1Snap.exists() || !histSnap.exists() || !route1Snap.exists() || route1Snap.data()?.permitType === undefined || bus1Snap.data()?.onTimePercent === undefined || force) {
      console.log("Seeding or backfilling initial Firestore data for Tranzit...");

      const batch = writeBatch(db);

      const todayStr = getRelativeDateStr(0);

      // 1. SaaS Owner
      const saasOwner: OwnerProfile = {
        id: DEMO_SaaS_UID,
        uid: DEMO_SaaS_UID,
        name: "Rajesh Sharma",
        email: DEMO_SaaS_EMAIL,
        companyName: "Shree Royal Travels",
        planType: "SaaS",
        activeBusesCount: 3,
        todayRevenue: 48250,
        walletBalance: 185400,
        saasFeePerBus: 4500,
        nextPayoutDate: getRelativeDateStr(5),
        nextPayoutAmount: 185400,
        avgDailyRiders: 1240,
        city: "Bengaluru",
        phone: "+91 98450 12345"
      };
      batch.set(saasRef, saasOwner);

      // SaaS Buses
      const saasBuses: Bus[] = [
        {
          id: "bus-saas-1",
          ownerId: DEMO_SaaS_UID,
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
          id: "bus-saas-2",
          ownerId: DEMO_SaaS_UID,
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
          id: "bus-saas-3",
          ownerId: DEMO_SaaS_UID,
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
      ];

      for (const bus of saasBuses) {
        batch.set(doc(db, "buses", bus.id), bus);
      }

      // SaaS Routes (Simplified: Fare = distance * ratePerKm + fixedCharge)
      const saasRoutes: RouteItem[] = [
        {
          id: "route-saas-1",
          ownerId: DEMO_SaaS_UID,
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
          id: "route-saas-2",
          ownerId: DEMO_SaaS_UID,
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
          id: "route-saas-3",
          ownerId: DEMO_SaaS_UID,
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
      ];

      for (const r of saasRoutes) {
        batch.set(doc(db, "routes", r.id), r);
      }

      // SaaS Earnings: Trailing 4 weeks (28 days) + current week with an intentional anomaly day
      const saasEarnings: EarningsEntry[] = [];
      const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      // Historical baseline averages by weekday
      const baselineByDay = [
        { day: 'Sun', base: 51000, cash: 15000, upi: 30000, card: 6000 },
        { day: 'Mon', base: 42500, cash: 12000, upi: 26500, card: 4000 },
        { day: 'Tue', base: 45200, cash: 13500, upi: 27200, card: 4500 },
        { day: 'Wed', base: 42000, cash: 11000, upi: 27000, card: 4000 },
        { day: 'Thu', base: 46100, cash: 12500, upi: 28600, card: 5000 },
        { day: 'Fri', base: 52400, cash: 15000, upi: 31400, card: 6000 },
        { day: 'Sat', base: 58900, cash: 18200, upi: 33700, card: 7000 },
      ];

      // Populate trailing 28 days
      for (let offset = -28; offset <= 0; offset++) {
        const dateStr = getRelativeDateStr(offset);
        const dayIdx = new Date(dateStr).getDay();
        const baseInfo = baselineByDay[dayIdx];
        const dayName = offset === 0 ? 'Today' : weekdayNames[dayIdx];
        const id = offset < -6 ? `e-hist-${Math.abs(offset)}` : `e-${offset + 7}`;

        let rev = baseInfo.base;
        let cash = baseInfo.cash;
        let upi = baseInfo.upi;
        let card = baseInfo.card;

        // Slight natural variance between weeks
        if (offset < -6) {
          const variance = ((Math.abs(offset * 13) % 7) - 3) * 500;
          rev += variance;
          upi += variance;
        }

        // Deliberate Collections Anomaly: 4 days ago (e.g. Wednesday/Thursday drop >25% due to road waterlogging/strike)
        if (offset === -4) {
          rev = Math.round(baseInfo.base * 0.68); // ~32% drop below expected
          cash = Math.round(baseInfo.cash * 0.6);
          upi = Math.round(baseInfo.upi * 0.7);
          card = rev - cash - upi;
        }

        saasEarnings.push({
          id,
          ownerId: DEMO_SaaS_UID,
          day: dayName,
          date: dateStr,
          ticketRevenue: rev,
          cashAmount: cash,
          upiAmount: upi,
          cardAmount: card
        });
      }

      for (const e of saasEarnings) {
        batch.set(doc(db, "earnings", e.id), e);
      }

      // SaaS Maintenance
      const saasMaintenance: MaintenanceRecord[] = [
        {
          id: "m-1",
          ownerId: DEMO_SaaS_UID,
          busId: "bus-saas-1",
          busReg: "KA 01 F 4291",
          serviceType: "Engine Oil & Filter Change",
          serviceDate: getRelativeDateStr(-30),
          nextDueDate: getRelativeDateStr(30),
          cost: 8500,
          notes: "Shell Rimula R4 15W40 oil used. All filters replaced.",
          mechanicShop: "Sri Lakshmi Motors, Peenya"
        },
        {
          id: "m-2",
          ownerId: DEMO_SaaS_UID,
          busId: "bus-saas-2",
          busReg: "KA 05 FA 8812",
          serviceType: "Brake Lining & Drum Resurfacing",
          serviceDate: getRelativeDateStr(-60),
          nextDueDate: getRelativeDateStr(5),
          cost: 14200,
          notes: "Front and rear brake pads replaced. Tested brake force.",
          mechanicShop: "Tata Authorized Service Center"
        },
        {
          id: "m-3",
          ownerId: DEMO_SaaS_UID,
          busId: "bus-saas-3",
          busReg: "KA 53 M 1049",
          serviceType: "Clutch Plate & Pressure Assembly",
          serviceDate: getRelativeDateStr(-90),
          nextDueDate: getRelativeDateStr(-10),
          cost: 19800,
          notes: "Overdue for 15,000km scheduled service.",
          mechanicShop: "Eicher Motors Workshop"
        }
      ];

      for (const m of saasMaintenance) {
        batch.set(doc(db, "maintenance", m.id), m);
      }

      // 2. Lease Owner
      const leaseRef = doc(db, 'owners', DEMO_LEASE_UID);
      const leaseOwner: OwnerProfile = {
        id: DEMO_LEASE_UID,
        uid: DEMO_LEASE_UID,
        name: "Vikramaditya Verma",
        email: DEMO_LEASE_EMAIL,
        companyName: "Verma Fleet Operations",
        planType: "Lease",
        activeBusesCount: 3,
        todayRevenue: 0,
        nextPayoutDate: getRelativeDateStr(14),
        nextPayoutAmount: 255000,
        avgDailyRiders: 1580,
        city: "Hubballi",
        phone: "+91 97312 88900"
      };
      batch.set(leaseRef, leaseOwner);

      // Lease Buses
      const leaseBuses: Bus[] = [
        {
          id: "bus-lease-1",
          ownerId: DEMO_LEASE_UID,
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
          id: "bus-lease-2",
          ownerId: DEMO_LEASE_UID,
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
          id: "bus-lease-3",
          ownerId: DEMO_LEASE_UID,
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

      for (const bus of leaseBuses) {
        batch.set(doc(db, "buses", bus.id), bus);
      }

      // Lease Payout History
      const payouts: PayoutEntry[] = [
        { id: "p-1", ownerId: DEMO_LEASE_UID, date: getRelativeDateStr(14), amount: 255000, status: "Scheduled", referenceNo: "SCH-AUTO-01", bankAccount: "HDFC Bank (•••• 4921)" },
        { id: "p-2", ownerId: DEMO_LEASE_UID, date: getRelativeDateStr(-16), amount: 255000, status: "Paid", referenceNo: "TXN-AUTO-882", bankAccount: "HDFC Bank (•••• 4921)" },
        { id: "p-3", ownerId: DEMO_LEASE_UID, date: getRelativeDateStr(-46), amount: 255000, status: "Paid", referenceNo: "TXN-AUTO-419", bankAccount: "HDFC Bank (•••• 4921)" },
        { id: "p-4", ownerId: DEMO_LEASE_UID, date: getRelativeDateStr(-76), amount: 255000, status: "Paid", referenceNo: "TXN-AUTO-105", bankAccount: "HDFC Bank (•••• 4921)" },
      ];

      for (const p of payouts) {
        batch.set(doc(db, "payouts", p.id), p);
      }

      // Lease Maintenance
      const leaseMaintenance: MaintenanceRecord[] = [
        {
          id: "lm-1",
          ownerId: DEMO_LEASE_UID,
          busId: "bus-lease-1",
          busReg: "KA 25 C 7701",
          serviceType: "Air Suspension Calibration & Alignment",
          serviceDate: "2026-08-20",
          nextDueDate: "2026-10-20",
          cost: 18000,
          notes: "Handled by Tranzit Central Fleet Depot.",
          mechanicShop: "Tranzit Hubballi Depot"
        },
        {
          id: "lm-2",
          ownerId: DEMO_LEASE_UID,
          busId: "bus-lease-2",
          busReg: "KA 25 C 7702",
          serviceType: "AC Compressor & Belt Replacement",
          serviceDate: "2026-07-15",
          nextDueDate: "2026-09-22",
          cost: 24500,
          notes: "Scheduled checkup completed.",
          mechanicShop: "Tranzit Hubballi Depot"
        }
      ];

      for (const lm of leaseMaintenance) {
        batch.set(doc(db, "maintenance", lm.id), lm);
      }

      await batch.commit();
      console.log("Firestore seeding completed successfully!");
    }

    // Check if drivers exist, if not seed them
    const drv1Snap = await getDoc(doc(db, 'drivers', 'drv-saas-1'));
    if (!drv1Snap.exists() || force) {
      console.log("Seeding driver records into Firestore...");
      const driverBatch = writeBatch(db);

      const demoDrivers: Driver[] = [
        // SaaS Drivers
        {
          id: "drv-saas-1",
          ownerId: DEMO_SaaS_UID,
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
          assignedBusId: "bus-saas-1",
          assignedBusReg: "KA 01 F 4291",
          assignedRouteId: "route-saas-1",
          assignedRouteName: "Bengaluru → Mysuru Express",
          shiftTiming: "Morning Shift (06:00 - 14:30)",
          experienceYears: 11,
          joiningDate: "2021-04-15",
          safetyScore: 97,
          tripsCompleted: 840,
          notes: "Senior intercity pilot. Trained for emergency night braking and eco-driving."
        },
        {
          id: "drv-saas-2",
          ownerId: DEMO_SaaS_UID,
          employeeId: "DRV-102",
          name: "Siddharth Gowda",
          phone: "+91 94480 33491",
          emergencyContact: "+91 94480 11200 (Brother - Chetan)",
          bloodGroup: "O+",
          status: "Active",
          licenseNumber: "KA05 20190019284",
          licenseType: "Heavy Passenger Commercial (HMV/PSV)",
          badgeNumber: "KA-PSV-6102",
          licenseExpiryDate: getRelativeDateStr(18), // Expiring in 18 days!
          assignedBusId: "bus-saas-2",
          assignedBusReg: "KA 05 FA 8812",
          assignedRouteId: "route-saas-2",
          assignedRouteName: "Bengaluru → Hosur Commuter",
          shiftTiming: "Split Commuter (07:30 - 11:30 & 16:30 - 20:30)",
          experienceYears: 6,
          joiningDate: "2023-01-10",
          safetyScore: 92,
          tripsCompleted: 520,
          notes: "Commercial license renewal submitted at Jayanagar RTO counter."
        },
        {
          id: "drv-saas-3",
          ownerId: DEMO_SaaS_UID,
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
          assignedBusId: "bus-saas-3",
          assignedBusReg: "KA 53 M 1049",
          assignedRouteId: "route-saas-3",
          assignedRouteName: "Mysuru → Hassan Intercity",
          shiftTiming: "Day Shift (09:00 - 17:00)",
          experienceYears: 14,
          joiningDate: "2020-08-01",
          safetyScore: 99,
          tripsCompleted: 1120,
          notes: "Assigned bus KA 53 M 1049 is in scheduled maintenance. On approved medical leave."
        },
        {
          id: "drv-saas-4",
          ownerId: DEMO_SaaS_UID,
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
          notes: "Designated standby pilot for peak weekend passenger operations and emergency replacement."
        },

        // Lease Drivers
        {
          id: "drv-lease-1",
          ownerId: DEMO_LEASE_UID,
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
          assignedBusId: "bus-lease-1",
          assignedBusReg: "KA 25 C 7701",
          assignedRouteId: "route-lease-1",
          assignedRouteName: "Hubballi → Bengaluru Express",
          shiftTiming: "Night Sleeper Express (21:00 - 06:00)",
          experienceYears: 15,
          joiningDate: "2019-06-01",
          safetyScore: 98,
          tripsCompleted: 1450,
          notes: "Multi-axle Volvo certified driver with zero accident record across 5 years."
        },
        {
          id: "drv-lease-2",
          ownerId: DEMO_LEASE_UID,
          employeeId: "DRV-202",
          name: "Anil Deshmukh",
          phone: "+91 97650 31289",
          emergencyContact: "+91 97650 88210 (Brother - Sanjay)",
          bloodGroup: "B+",
          status: "Active",
          licenseNumber: "KA25 20180014290",
          licenseType: "Heavy Passenger Transport (HMV/PSV)",
          badgeNumber: "KA-PSV-5520",
          licenseExpiryDate: getRelativeDateStr(22), // Expiring soon in 22 days!
          assignedBusId: "bus-lease-2",
          assignedBusReg: "KA 25 C 7702",
          assignedRouteId: "route-lease-2",
          assignedRouteName: "Hubballi → Pune Intercity",
          shiftTiming: "Interstate Day Express (06:30 - 16:30)",
          experienceYears: 8,
          joiningDate: "2021-09-12",
          safetyScore: 91,
          tripsCompleted: 680,
          notes: "Interstate route driver. Medical fitness certificate renewed last month."
        },
        {
          id: "drv-lease-3",
          ownerId: DEMO_LEASE_UID,
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
          assignedBusId: "bus-lease-3",
          assignedBusReg: "KA 25 C 7703",
          assignedRouteId: "route-lease-3",
          assignedRouteName: "Dharwad → Belagavi Shuttle",
          shiftTiming: "Regular Shift (08:00 - 17:00)",
          experienceYears: 10,
          joiningDate: "2020-02-18",
          safetyScore: 94,
          tripsCompleted: 910,
          notes: "Scheduled weekly rest day."
        },
        {
          id: "drv-lease-4",
          ownerId: DEMO_LEASE_UID,
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

      for (const d of demoDrivers) {
        driverBatch.set(doc(db, "drivers", d.id), d);
      }

      await driverBatch.commit();
      console.log("Driver seeding completed successfully!");
    }
  } catch (err) {
    console.error("Error seeding initial Firestore data:", err);
  }
}
