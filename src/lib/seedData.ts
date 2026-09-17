import { doc, setDoc, getDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { OwnerProfile, Bus, RouteItem, EarningsEntry, PayoutEntry, MaintenanceRecord } from '../types';
import { calculateFare } from './utils';

export const DEMO_SaaS_EMAIL = "demo.saas@tranzit.in";
export const DEMO_LEASE_EMAIL = "demo.lease@tranzit.in";

export const DEMO_SaaS_UID = "owner-saas-demo-uid";
export const DEMO_LEASE_UID = "owner-lease-demo-uid";

export async function seedInitialFirestoreData(force = false) {
  try {
    // Check if SaaS demo owner exists or if bus metrics need backfilling
    const saasRef = doc(db, 'owners', DEMO_SaaS_UID);
    const saasSnap = await getDoc(saasRef);
    const bus1Snap = await getDoc(doc(db, 'buses', 'bus-saas-1'));

    if (!saasSnap.exists() || !bus1Snap.exists() || bus1Snap.data()?.onTimePercent === undefined || force) {
      console.log("Seeding or backfilling initial Firestore data for Tranzit...");

      const batch = writeBatch(db);

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
        nextPayoutDate: "2026-09-20",
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
          lastServiceDate: "2026-08-10",
          nextServiceDue: "2026-10-15",
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
          lastServiceDate: "2026-07-01",
          nextServiceDue: "2026-09-20",
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
          lastServiceDate: "2026-06-15",
          nextServiceDue: "2026-08-30", // Overdue
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
          tripsPerDay: 4
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
          tripsPerDay: 8
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
          tripsPerDay: 3
        }
      ];

      for (const r of saasRoutes) {
        batch.set(doc(db, "routes", r.id), r);
      }

      // SaaS Earnings (7 days)
      const saasEarnings: EarningsEntry[] = [
        { id: "e-1", ownerId: DEMO_SaaS_UID, day: "Mon", date: "2026-09-10", ticketRevenue: 42500, cashAmount: 12000, upiAmount: 26500, cardAmount: 4000 },
        { id: "e-2", ownerId: DEMO_SaaS_UID, day: "Tue", date: "2026-09-11", ticketRevenue: 45200, cashAmount: 13500, upiAmount: 27200, cardAmount: 4500 },
        { id: "e-3", ownerId: DEMO_SaaS_UID, day: "Wed", date: "2026-09-12", ticketRevenue: 41800, cashAmount: 11000, upiAmount: 26800, cardAmount: 4000 },
        { id: "e-4", ownerId: DEMO_SaaS_UID, day: "Thu", date: "2026-09-13", ticketRevenue: 46100, cashAmount: 12500, upiAmount: 28600, cardAmount: 5000 },
        { id: "e-5", ownerId: DEMO_SaaS_UID, day: "Fri", date: "2026-09-14", ticketRevenue: 52400, cashAmount: 15000, upiAmount: 31400, cardAmount: 6000 },
        { id: "e-6", ownerId: DEMO_SaaS_UID, day: "Sat", date: "2026-09-15", ticketRevenue: 58900, cashAmount: 18200, upiAmount: 33700, cardAmount: 7000 },
        { id: "e-7", ownerId: DEMO_SaaS_UID, day: "Sun", date: "2026-09-16", ticketRevenue: 48250, cashAmount: 14000, upiAmount: 28250, cardAmount: 6000 }
      ];

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
          serviceDate: "2026-08-10",
          nextDueDate: "2026-10-15",
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
          serviceDate: "2026-07-01",
          nextDueDate: "2026-09-20",
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
          serviceDate: "2026-06-15",
          nextDueDate: "2026-08-30",
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
        nextPayoutDate: "2026-10-01",
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
          lastServiceDate: "2026-08-20",
          nextServiceDue: "2026-10-20",
          status: "Active",
          leaseValue: 95000,
          renewalDate: "2027-03-31"
        },
        {
          id: "bus-lease-2",
          ownerId: DEMO_LEASE_UID,
          regNumber: "KA 25 C 7702",
          model: "Scania Metrolink HD",
          capacity: 49,
          routeAssigned: "Hubballi → Pune Intercity",
          lastServiceDate: "2026-07-15",
          nextServiceDue: "2026-09-22",
          status: "Active",
          leaseValue: 85000,
          renewalDate: "2027-01-15"
        },
        {
          id: "bus-lease-3",
          ownerId: DEMO_LEASE_UID,
          regNumber: "KA 25 C 7703",
          model: "Tata Starbus Ultra AC",
          capacity: 42,
          routeAssigned: "Dharwad → Belagavi Shuttle",
          lastServiceDate: "2026-06-10",
          nextServiceDue: "2026-08-25", // Overdue
          status: "In Maintenance",
          leaseValue: 75000,
          renewalDate: "2026-11-30"
        }
      ];

      for (const bus of leaseBuses) {
        batch.set(doc(db, "buses", bus.id), bus);
      }

      // Lease Payout History
      const payouts: PayoutEntry[] = [
        { id: "p-1", ownerId: DEMO_LEASE_UID, date: "2026-10-01", amount: 255000, status: "Scheduled", referenceNo: "SCH-20261001-01", bankAccount: "HDFC Bank (•••• 4921)" },
        { id: "p-2", ownerId: DEMO_LEASE_UID, date: "2026-09-01", amount: 255000, status: "Paid", referenceNo: "TXN-20260901-882", bankAccount: "HDFC Bank (•••• 4921)" },
        { id: "p-3", ownerId: DEMO_LEASE_UID, date: "2026-08-01", amount: 255000, status: "Paid", referenceNo: "TXN-20260801-419", bankAccount: "HDFC Bank (•••• 4921)" },
        { id: "p-4", ownerId: DEMO_LEASE_UID, date: "2026-07-01", amount: 255000, status: "Paid", referenceNo: "TXN-20260701-105", bankAccount: "HDFC Bank (•••• 4921)" },
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
  } catch (err) {
    console.error("Error seeding initial Firestore data:", err);
  }
}
