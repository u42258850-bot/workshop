// ============================================================
// src/firebase/vehicles.ts
// Vehicle Registry — full CRUD + real-time listener
// Collection: "vehicles"
// ============================================================

import {
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, serverTimestamp, getDoc, Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";

export type VehicleStatus = "Available" | "On Trip" | "In Shop" | "Retired";

export interface Vehicle {
  id: string;
  name: string;
  model: string;
  license_plate: string;
  max_load: number;
  odometer: number;
  status: VehicleStatus;
  createdAt?: any;
}

const COL = "vehicles";

// ── ADD ───────────────────────────────────────────────────────
export async function addVehicle(
  data: Omit<Vehicle, "id" | "createdAt" | "status">
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const ref = await addDoc(collection(db, COL), {
      ...data,
      status: "Available",
      createdAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── GET ALL ───────────────────────────────────────────────────
export async function getVehicles(): Promise<Vehicle[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle));
}

// ── GET ONE ───────────────────────────────────────────────────
export async function getVehicle(id: string): Promise<Vehicle | null> {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Vehicle) : null;
}

// ── UPDATE ────────────────────────────────────────────────────
export async function updateVehicle(id: string, updates: Partial<Vehicle>): Promise<void> {
  await updateDoc(doc(db, COL, id), updates);
}

// ── SET STATUS ────────────────────────────────────────────────
export async function setVehicleStatus(id: string, status: VehicleStatus): Promise<void> {
  await updateDoc(doc(db, COL, id), { status });
}

// ── UPDATE ODOMETER ───────────────────────────────────────────
export async function updateOdometer(id: string, odometer: number): Promise<void> {
  await updateDoc(doc(db, COL, id), { odometer });
}

// ── DELETE ────────────────────────────────────────────────────
export async function deleteVehicle(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, COL, id));
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ── REAL-TIME ─────────────────────────────────────────────────
export function listenVehicles(cb: (v: Vehicle[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, COL), orderBy("createdAt", "desc")),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)))
  );
}
