// ============================================================
// src/firebase/seed.ts
// Run once to populate Firestore with initial demo data.
// Call seedDatabase() from anywhere, e.g., a dev button.
// ============================================================

import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "./config";

const VEHICLES = [
  {
    name: "Tata Prima 4028.S",
    license_plate: "MH-12-AB-1234",
    type: "Truck",
    max_load: 40000,
    odometer: 45000,
    status: "Available",
    region: "West",
  },
  {
    name: "Mahindra Bolero Pik-Up",
    license_plate: "DL-01-XY-5566",
    type: "Van",
    max_load: 1500,
    odometer: 12000,
    status: "In Shop",
    region: "North",
  },
  {
    name: "Ashok Leyland Dost",
    license_plate: "KA-05-MN-9988",
    type: "Van",
    max_load: 2500,
    odometer: 8000,
    status: "Available",
    region: "South",
  },
  {
    name: "Eicher Pro 2049",
    license_plate: "HR-38-PQ-4433",
    type: "Truck",
    max_load: 5000,
    odometer: 15000,
    status: "Available",
    region: "North",
  },
  {
    name: "Tata Ace Gold",
    license_plate: "UP-32-ZZ-1122",
    type: "Van",
    max_load: 750,
    odometer: 5000,
    status: "Available",
    region: "East",
  },
];

const DRIVERS = [
  {
    name: "Rajesh Kumar",
    license_number: "DL-9988776655",
    license_expiry: "2027-12-31",
    status: "Off Duty",
    safety_score: 95,
    completion_rate: 98.5,
    complaints: 1,
  },
  {
    name: "Suresh Singh",
    license_number: "MH-1122334455",
    license_expiry: "2028-06-15",
    status: "Off Duty",
    safety_score: 88,
    completion_rate: 92.0,
    complaints: 0,
  },
  {
    name: "Amit Sharma",
    license_number: "UP-80-AB-4455",
    license_expiry: "2029-01-20",
    status: "Off Duty",
    safety_score: 92,
    completion_rate: 96.0,
    complaints: 0,
  },
  {
    name: "Priya Patel",
    license_number: "GJ-01-CD-7788",
    license_expiry: "2026-05-10",
    status: "Off Duty",
    safety_score: 97,
    completion_rate: 99.0,
    complaints: 0,
  },
];

const MAINTENANCE = [
  {
    vehicle_name: "Mahindra Bolero Pik-Up",
    description: "Engine overhaul and oil change",
    date: "2026-02-10",
    status: "In Progress",
  },
];

export async function seedDatabase(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Check if already seeded
    const existing = await getDocs(collection(db, "vehicles"));
    if (existing.size > 0) {
      return { success: false, message: "Database already has data. Skipping seed." };
    }

    const batch = writeBatch(db);

    // Seed vehicles
    VEHICLES.forEach((v) => {
      const ref = doc(collection(db, "vehicles"));
      batch.set(ref, { ...v, createdAt: new Date() });
    });

    // Seed drivers
    DRIVERS.forEach((d) => {
      const ref = doc(collection(db, "drivers"));
      batch.set(ref, { ...d, createdAt: new Date() });
    });

    await batch.commit();

    // Seed maintenance (in a second batch to get vehicle IDs if needed)
    // For simplicity, using vehicle_name directly
    const mBatch = writeBatch(db);
    MAINTENANCE.forEach((m) => {
      const ref = doc(collection(db, "maintenance_logs"));
      mBatch.set(ref, {
        ...m,
        vehicle_id: "seeded",
        createdAt: new Date(),
      });
    });
    await mBatch.commit();

    return { success: true, message: "✅ Database seeded with demo data!" };
  } catch (err: any) {
    return { success: false, message: `Seed failed: ${err.message}` };
  }
}
