// ============================================================
// src/firebase/seed.ts
// Populates Firestore with demo data identical to the original
// SQLite seed. Call seedIfEmpty() on first load.
// ============================================================

import { collection, getDocs, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db } from "./config";

export async function seedIfEmpty(): Promise<{ seeded: boolean; message: string }> {
  const snap = await getDocs(collection(db, "vehicles"));
  if (snap.size > 0) return { seeded: false, message: "Already has data." };

  const batch = writeBatch(db);

  // ── Vehicles ──────────────────────────────────────────────
  const vehicles = [
    { name: "Van-01",   model: "Ford Transit",  license_plate: "ABC-1234", max_load: 1500,  odometer: 12500, status: "Available" },
    { name: "Truck-01", model: "Volvo FH",      license_plate: "XYZ-9876", max_load: 15000, odometer: 45000, status: "Available" },
    { name: "Van-02",   model: "Mercedes Sprinter", license_plate: "DEF-5678", max_load: 2000, odometer: 8200, status: "Available" },
    { name: "Bike-01",  model: "Royal Enfield", license_plate: "GHI-1111", max_load: 100,   odometer: 4500,  status: "Available" },
  ];
  vehicles.forEach(v => {
    batch.set(doc(collection(db, "vehicles")), { ...v, createdAt: serverTimestamp() });
  });

  // ── Drivers ───────────────────────────────────────────────
  const drivers = [
    { name: "John Doe",     license_number: "DL-12345", license_expiry: "2026-12-31", status: "On Duty", safety_score: 95 },
    { name: "Jane Smith",   license_number: "DL-67890", license_expiry: "2025-06-15", status: "On Duty", safety_score: 88 },
    { name: "Ravi Kumar",   license_number: "DL-33333", license_expiry: "2027-03-20", status: "On Duty", safety_score: 92 },
    { name: "Priya Mehta",  license_number: "DL-44444", license_expiry: "2028-09-01", status: "On Duty", safety_score: 97 },
  ];
  drivers.forEach(d => {
    batch.set(doc(collection(db, "drivers")), { ...d, createdAt: serverTimestamp() });
  });

  await batch.commit();
  return { seeded: true, message: "✅ Demo data loaded!" };
}
