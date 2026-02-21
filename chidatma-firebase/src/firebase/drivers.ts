// ============================================================
// src/firebase/drivers.ts
// Driver Profiles — full CRUD + real-time listener
// Collection: "drivers"
// ============================================================

import {
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp, getDoc, Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";

export type DriverStatus = "On Duty" | "On Trip" | "Off Duty" | "Suspended";

export interface Driver {
  id: string;
  name: string;
  license_number: string;
  license_expiry: string;   // "YYYY-MM-DD"
  status: DriverStatus;
  safety_score: number;
  createdAt?: any;
}

const COL = "drivers";

// ── ADD ───────────────────────────────────────────────────────
export async function addDriver(
  data: Omit<Driver, "id" | "createdAt" | "status" | "safety_score">
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const ref = await addDoc(collection(db, COL), {
      ...data,
      status: "On Duty",
      safety_score: 100,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── GET ALL ───────────────────────────────────────────────────
export async function getDrivers(): Promise<Driver[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Driver));
}

// ── GET ONE ───────────────────────────────────────────────────
export async function getDriver(id: string): Promise<Driver | null> {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Driver) : null;
}

// ── SET STATUS ────────────────────────────────────────────────
export async function setDriverStatus(id: string, status: DriverStatus): Promise<void> {
  await updateDoc(doc(db, COL, id), { status });
}

// ── DELETE ────────────────────────────────────────────────────
export async function deleteDriver(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, COL, id));
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── REAL-TIME ─────────────────────────────────────────────────
export function listenDrivers(cb: (d: Driver[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, COL), orderBy("createdAt", "desc")),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Driver))
  ));
}
