// ============================================================
// src/firebase/fuel.ts
// Fuel & Expenses — add, list, real-time
// Collection: "fuel_logs"
// ============================================================

import {
  collection, addDoc, getDocs, query, orderBy,
  onSnapshot, serverTimestamp, Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";

export interface FuelLog {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  liters: number;
  cost: number;
  date: string;
  createdAt?: any;
}

const COL = "fuel_logs";

// ── ADD LOG ───────────────────────────────────────────────────
export async function addFuelLog(data: {
  vehicle_id: string;
  vehicle_name: string;
  liters: number;
  cost: number;
  date: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const ref = await addDoc(collection(db, COL), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── GET ALL ───────────────────────────────────────────────────
export async function getFuelLogs(): Promise<FuelLog[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FuelLog));
}

// ── REAL-TIME ─────────────────────────────────────────────────
export function listenFuelLogs(cb: (logs: FuelLog[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, COL), orderBy("createdAt", "desc")),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as FuelLog)))
  );
}
