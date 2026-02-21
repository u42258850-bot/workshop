// ============================================================
// src/firebase/maintenance.ts
// Maintenance Logs — Firestore CRUD
// Collection: "maintenance_logs"
// When a maintenance log is created, vehicle status → "In Shop"
// ============================================================

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";
import { setVehicleStatus } from "./vehicles";

export type MaintenanceStatus = "Pending" | "In Progress" | "Completed";

export interface MaintenanceLog {
  id: string;
  vehicle_id: string;
  vehicle_name?: string;
  description: string;
  date: string;
  status: MaintenanceStatus;
  cost?: number;
  createdAt?: any;
}

const COL = "maintenance_logs";

// ── CREATE MAINTENANCE LOG ────────────────────────────────────
export async function createMaintenanceLog(
  data: Pick<MaintenanceLog, "vehicle_id" | "vehicle_name" | "description" | "date">
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const ref = await addDoc(collection(db, COL), {
      ...data,
      status: "Pending" as MaintenanceStatus,
      createdAt: serverTimestamp(),
    });

    // Set vehicle to "In Shop"
    await setVehicleStatus(data.vehicle_id, "In Shop");

    return { success: true, id: ref.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── GET ALL LOGS ──────────────────────────────────────────────
export async function getMaintenanceLogs(): Promise<MaintenanceLog[]> {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MaintenanceLog));
}

// ── UPDATE LOG STATUS ─────────────────────────────────────────
export async function updateMaintenanceStatus(
  logId: string,
  status: MaintenanceStatus,
  vehicleId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, COL, logId), { status });

    // If completed, mark vehicle as Available again
    if (status === "Completed" && vehicleId) {
      await setVehicleStatus(vehicleId, "Available");
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── REAL-TIME LISTENER ────────────────────────────────────────
export function listenMaintenanceLogs(
  callback: (logs: MaintenanceLog[]) => void
): Unsubscribe {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MaintenanceLog)));
  });
}
