// ============================================================
// src/firebase/analytics.ts
// Dashboard stats and analytics data — computed from Firestore
// ============================================================

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./config";

export interface DashboardStats {
  activeFleet: number;
  maintenanceAlerts: number;
  utilizationRate: number;
  pendingCargo: number;
  totalRevenue: number;
  fuelSpend: number;
}

export interface FinancialSummary {
  month: string;
  revenue: number;
  fuel_cost: number;
  maintenance: number;
  net_profit: number;
}

// ── DASHBOARD STATS ───────────────────────────────────────────
export async function getDashboardStats(): Promise<DashboardStats> {
  const [onTripSnap, inShopSnap, allVehiclesSnap, pendingSnap, expensesSnap] =
    await Promise.all([
      getDocs(query(collection(db, "vehicles"), where("status", "==", "On Trip"))),
      getDocs(query(collection(db, "vehicles"), where("status", "==", "In Shop"))),
      getDocs(collection(db, "vehicles")),
      getDocs(query(collection(db, "trips"), where("status", "==", "Draft"))),
      getDocs(collection(db, "expenses")),
    ]);

  const totalVehicles = allVehiclesSnap.size;
  const onTrip = onTripSnap.size;
  const inShop = inShopSnap.size;
  const utilized = onTrip + inShop;

  // Sum fuel spend from real expense records
  const fuelSpend = expensesSnap.docs.reduce((sum, d) => {
    const data = d.data();
    return sum + (data.fuel_cost || 0);
  }, 0);

  // Revenue: estimated from dispatched trip fuel costs (as proxy)
  const tripsSnap = await getDocs(
    query(collection(db, "trips"), where("status", "in", ["Dispatched", "Completed"]))
  );
  const estimatedRevenue = tripsSnap.docs.reduce((sum, d) => {
    const data = d.data();
    return sum + (data.estimated_fuel_cost || 0) * 3; // 3× markup estimate
  }, 0);

  return {
    activeFleet: onTrip,
    maintenanceAlerts: inShop,
    utilizationRate:
      totalVehicles > 0 ? Math.round((utilized / totalVehicles) * 100) : 0,
    pendingCargo: pendingSnap.size,
    totalRevenue: Math.max(estimatedRevenue, 1250000), // fallback floor for demo
    fuelSpend: Math.max(fuelSpend, 450000), // fallback floor for demo
  };
}

// ── FINANCIAL SUMMARY (last 3 months) ────────────────────────
// In a real app, you'd aggregate this monthly in Cloud Functions.
// This returns realistic seed data + live calculations.
export async function getFinancialSummary(): Promise<FinancialSummary[]> {
  const expensesSnap = await getDocs(collection(db, "expenses"));
  const totalFuel = expensesSnap.docs.reduce(
    (sum, d) => sum + (d.data().fuel_cost || 0),
    0
  );

  // Distribute across months with realistic proportions
  const base = [
    { month: "Jan", rev: 4500000, fuel: 1200000, maint: 350000 },
    { month: "Feb", rev: 5200000, fuel: 1400000, maint: 420000 },
    { month: "Mar", rev: 4800000, fuel: 1300000, maint: 380000 },
  ];

  return base.map((b) => ({
    month: b.month,
    revenue: b.rev,
    fuel_cost: b.fuel + Math.round(totalFuel / 3), // add live data
    maintenance: b.maint,
    net_profit: b.rev - b.fuel - b.maint - Math.round(totalFuel / 3),
  }));
}
