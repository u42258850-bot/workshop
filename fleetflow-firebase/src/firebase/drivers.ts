// ============================================================
// src/firebase/drivers.ts
// Driver management — Firestore CRUD
// Collection: "drivers"
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
  getDoc,
  where,
} from "firebase/firestore";
import { db } from "./config";

export type DriverStatus = "On Duty" | "Off Duty" | "Suspended";

export interface Driver {
  id: string;
  name: string;
  license_number: string;
  license_expiry: string; // ISO date string "YYYY-MM-DD"
  status: DriverStatus;
  safety_score: number;
  completion_rate: number;
  complaints: number;
  createdAt?: any;
}

const COL = "drivers";

// ── ADD DRIVER ────────────────────────────────────────────────
export async function addDriver(
  data: Omit<Driver, "id" | "createdAt">
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const ref = await addDoc(collection(db, COL), {
      ...data,
      status: "Off Duty",
      safety_score: data.safety_score ?? 100,
      completion_rate: data.completion_rate ?? 100,
      complaints: data.complaints ?? 0,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── GET ALL DRIVERS ───────────────────────────────────────────
export async function getDrivers(): Promise<Driver[]> {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Driver));
}

// ── GET AVAILABLE (OFF DUTY) DRIVERS ─────────────────────────
export async function getAvailableDrivers(): Promise<Driver[]> {
  const q = query(
    collection(db, COL),
    where("status", "==", "Off Duty")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Driver));
}

// ── GET SINGLE DRIVER ─────────────────────────────────────────
export async function getDriver(id: string): Promise<Driver | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Driver;
}

// ── UPDATE DRIVER ─────────────────────────────────────────────
export async function updateDriver(
  id: string,
  updates: Partial<Driver>
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, COL, id), updates);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── SET DRIVER STATUS ─────────────────────────────────────────
export async function setDriverStatus(
  id: string,
  status: DriverStatus
): Promise<void> {
  await updateDoc(doc(db, COL, id), { status });
}

// ── REAL-TIME LISTENER ────────────────────────────────────────
export function listenDrivers(
  callback: (drivers: Driver[]) => void
): Unsubscribe {
  const q = query(collection(db, COL), orderBy("name"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Driver)));
  });
}
