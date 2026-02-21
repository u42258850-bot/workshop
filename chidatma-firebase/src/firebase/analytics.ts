// ============================================================
// src/firebase/analytics.ts
// Stats, financial report, efficiency data — all computed live
// from Firestore collections
// ============================================================

import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "./config";
import { Vehicle } from "./vehicles";
import { FuelLog } from "./fuel";
import { MaintenanceLog } from "./maintenance";
import { Trip } from "./trips";

export interface Stats {
  activeFleet: number;
  maintenanceAlerts: number;
  utilizationRate: number;
  pendingCargo: number;
}

// ── DASHBOARD STATS ───────────────────────────────────────────
export async function getStats(): Promise<Stats> {
  const [onTripSnap, inShopSnap, allSnap, draftSnap] = await Promise.all([
    getDocs(query(collection(db, "vehicles"), where("status", "==", "On Trip"))),
    getDocs(query(collection(db, "vehicles"), where("status", "==", "In Shop"))),
    getDocs(collection(db, "vehicles")),
    getDocs(query(collection(db, "trips"), where("status", "==", "Draft"))),
  ]);

  const total = allSnap.size;
  const available = allSnap.docs.filter(d => d.data().status === "Available").length;

  return {
    activeFleet: onTripSnap.size,
    maintenanceAlerts: inShopSnap.size,
    utilizationRate: total > 0 ? Math.round(((total - available) / total) * 100) : 0,
    pendingCargo: draftSnap.size,
  };
}

// ── FINANCIAL REPORT (per vehicle) ───────────────────────────
export interface FinancialRow {
  id: string;
  name: string;
  license_plate: string;
  total_fuel_cost: number;
  total_maintenance_cost: number;
  total_operational_cost: number;
}

export async function getFinancialReport(
  vehicles: Vehicle[],
  fuelLogs: FuelLog[],
  maintenanceLogs: MaintenanceLog[]
): Promise<FinancialRow[]> {
  return vehicles.map(v => {
    const fuel = fuelLogs.filter(f => f.vehicle_id === v.id).reduce((s, f) => s + f.cost, 0);
    const maint = maintenanceLogs.filter(m => m.vehicle_id === v.id).reduce((s, m) => s + m.cost, 0);
    return {
      id: v.id,
      name: v.name,
      license_plate: v.license_plate,
      total_fuel_cost: fuel,
      total_maintenance_cost: maint,
      total_operational_cost: fuel + maint,
    };
  });
}

// ── EFFICIENCY DATA (trips per day, last 7 days) ──────────────
export function getEfficiencyData(trips: Trip[]) {
  const days: Record<string, number> = {};
  const now = Date.now();
  // initialise last 7 day keys
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    days[label] = 0;
  }
  trips.forEach(t => {
    if (!t.start_date) return;
    const label = new Date(t.start_date).toLocaleDateString("en-US", { weekday: "short" });
    if (label in days) days[label]++;
  });
  return Object.entries(days).map(([date, count]) => ({ date, count }));
}

// ── FUEL EFFICIENCY per vehicle (km / L) ─────────────────────
export function getFuelEfficiencyData(
  vehicles: Vehicle[],
  trips: Trip[],
  fuelLogs: FuelLog[]
) {
  return vehicles.map(v => {
    const completedTrips = trips.filter(t => t.vehicle_id === v.id && t.status === "Completed");
    const totalKm = completedTrips.reduce((s, t) => s + ((t.end_odometer ?? 0) - t.start_odometer), 0);
    const totalLitres = fuelLogs.filter(f => f.vehicle_id === v.id).reduce((s, f) => s + f.liters, 0);
    const efficiency = totalLitres > 0 ? parseFloat((totalKm / totalLitres).toFixed(2)) : 0;
    return { name: v.name, efficiency };
  }).filter(v => v.efficiency > 0);
}

// ── MAINTENANCE ROI DISTRIBUTION ─────────────────────────────
export function getMaintenanceRoiData(maintenanceLogs: MaintenanceLog[]) {
  const counts: Record<string, number> = {};
  maintenanceLogs.forEach(m => {
    counts[m.type] = (counts[m.type] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}
