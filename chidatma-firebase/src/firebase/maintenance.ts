// ============================================================
// src/firebase/maintenance.ts
// Service Logs — add, list, real-time
// Collection: "maintenance_logs"
// When logged → vehicle status set to "In Shop"
// ============================================================

import {
  collection, addDoc, getDocs, query, orderBy,
  onSnapshot, serverTimestamp, Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";
import { setVehicleStatus } from "./vehicles";

export type MaintenanceType = "Routine" | "Preventative" | "Reactive" | "Overhaul";

export interface MaintenanceLog {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  description: string;
  cost: number;
  date: string;
  type: MaintenanceType;
  createdAt?: any;
}

const COL = "maintenance_logs";

// ── ADD LOG ───────────────────────────────────────────────────
export async function addMaintenanceLog(data: {
  vehicle_id: string;
  vehicle_name: string;
  description: string;
  cost: number;
  date: string;
  type: MaintenanceType;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const ref = await addDoc(collection(db, COL), {
      ...data,
      createdAt: serverTimestamp(),
    });
    // Mark vehicle as In Shop
    await setVehicleStatus(data.vehicle_id, "In Shop");
    return { success: true, id: ref.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── GET ALL ───────────────────────────────────────────────────
export async function getMaintenanceLogs(): Promise<MaintenanceLog[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceLog));
}

// ── REAL-TIME ─────────────────────────────────────────────────
export function listenMaintenanceLogs(cb: (logs: MaintenanceLog[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, COL), orderBy("createdAt", "desc")),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceLog)))
  );
}
