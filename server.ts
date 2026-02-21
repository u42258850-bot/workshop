import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("fleetflow.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    model TEXT,
    license_plate TEXT UNIQUE,
    max_load REAL,
    odometer REAL DEFAULT 0,
    status TEXT DEFAULT 'Available'
  );

  CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    license_number TEXT,
    license_expiry TEXT,
    status TEXT DEFAULT 'On Duty',
    safety_score REAL DEFAULT 100
  );

  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER,
    driver_id INTEGER,
    cargo_weight REAL,
    status TEXT DEFAULT 'Draft',
    start_date TEXT,
    end_date TEXT,
    start_odometer REAL,
    end_odometer REAL,
    FOREIGN KEY(vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY(driver_id) REFERENCES drivers(id)
  );

  CREATE TABLE IF NOT EXISTS maintenance_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER,
    description TEXT,
    cost REAL,
    date TEXT,
    type TEXT DEFAULT 'Routine',
    FOREIGN KEY(vehicle_id) REFERENCES vehicles(id)
  );

  CREATE TABLE IF NOT EXISTS fuel_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER,
    liters REAL,
    cost REAL,
    date TEXT,
    FOREIGN KEY(vehicle_id) REFERENCES vehicles(id)
  );
`);

// Migration: Add type column to maintenance_logs if it doesn't exist
try {
  db.prepare("ALTER TABLE maintenance_logs ADD COLUMN type TEXT DEFAULT 'Routine'").run();
} catch (e) {
  // Column already exists
}

// Seed initial data if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (email, password, role) VALUES (?, ?, ?)").run("admin@fleetflow.com", "admin123", "Manager");
  db.prepare("INSERT INTO vehicles (name, model, license_plate, max_load, odometer, status) VALUES (?, ?, ?, ?, ?, ?)").run("Van-01", "Ford Transit", "ABC-1234", 1500, 12500, "Available");
  db.prepare("INSERT INTO vehicles (name, model, license_plate, max_load, odometer, status) VALUES (?, ?, ?, ?, ?, ?)").run("Truck-01", "Volvo FH", "XYZ-9876", 15000, 45000, "Available");
  db.prepare("INSERT INTO drivers (name, license_number, license_expiry, status) VALUES (?, ?, ?, ?)").run("John Doe", "DL-12345", "2026-12-31", "On Duty");
  db.prepare("INSERT INTO drivers (name, license_number, license_expiry, status) VALUES (?, ?, ?, ?)").run("Jane Smith", "DL-67890", "2025-06-15", "On Duty");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/stats", (req, res) => {
    const activeFleet = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'On Trip'").get() as any;
    const maintenanceAlerts = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'In Shop'").get() as any;
    const totalVehicles = db.prepare("SELECT COUNT(*) as count FROM vehicles").get() as any;
    const pendingCargo = db.prepare("SELECT COUNT(*) as count FROM trips WHERE status = 'Draft'").get() as any;
    
    res.json({
      activeFleet: activeFleet.count,
      maintenanceAlerts: maintenanceAlerts.count,
      utilizationRate: totalVehicles.count > 0 ? Math.round(((totalVehicles.count - (db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'Available'").get() as any).count) / totalVehicles.count) * 100) : 0,
      pendingCargo: pendingCargo.count
    });
  });

  app.get("/api/vehicles", (req, res) => {
    const vehicles = db.prepare("SELECT * FROM vehicles").all();
    res.json(vehicles);
  });

  app.post("/api/vehicles", (req, res) => {
    const { name, model, license_plate, max_load, odometer } = req.body;
    try {
      const result = db.prepare("INSERT INTO vehicles (name, model, license_plate, max_load, odometer) VALUES (?, ?, ?, ?, ?)").run(name, model, license_plate, max_load, odometer);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: "A vehicle with this license plate already exists." });
      }
      res.status(500).json({ error: "Failed to register vehicle" });
    }
  });

  app.get("/api/drivers", (req, res) => {
    const drivers = db.prepare("SELECT * FROM drivers").all();
    res.json(drivers);
  });

  app.post("/api/trips", (req, res) => {
    const { vehicle_id, driver_id, cargo_weight } = req.body;
    
    // Validation
    const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(vehicle_id) as any;
    const driver = db.prepare("SELECT * FROM drivers WHERE id = ?").get(driver_id) as any;

    if (!vehicle || !driver) return res.status(400).json({ error: "Invalid vehicle or driver" });
    if (cargo_weight > vehicle.max_load) return res.status(400).json({ error: "Cargo exceeds capacity" });
    if (new Date(driver.license_expiry) < new Date()) return res.status(400).json({ error: "Driver license expired" });

    const result = db.prepare("INSERT INTO trips (vehicle_id, driver_id, cargo_weight, status, start_date, start_odometer) VALUES (?, ?, ?, 'Dispatched', ?, ?)")
      .run(vehicle_id, driver_id, cargo_weight, new Date().toISOString(), vehicle.odometer);
    
    db.prepare("UPDATE vehicles SET status = 'On Trip' WHERE id = ?").run(vehicle_id);
    db.prepare("UPDATE drivers SET status = 'On Trip' WHERE id = ?").run(driver_id);

    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/trips", (req, res) => {
    const trips = db.prepare(`
      SELECT trips.*, vehicles.name as vehicle_name, drivers.name as driver_name 
      FROM trips 
      JOIN vehicles ON trips.vehicle_id = vehicles.id 
      JOIN drivers ON trips.driver_id = drivers.id
    `).all();
    res.json(trips);
  });

  app.get("/api/analytics/efficiency", (req, res) => {
    const data = db.prepare(`
      SELECT date(start_date) as date, COUNT(*) as count 
      FROM trips 
      WHERE start_date IS NOT NULL 
      GROUP BY date(start_date) 
      ORDER BY date(start_date) DESC 
      LIMIT 7
    `).all();
    res.json(data.reverse());
  });

  app.get("/api/analytics/fuel-efficiency", (req, res) => {
    const data = db.prepare(`
      SELECT v.name, 
             SUM(t.end_odometer - t.start_odometer) / NULLIF(SUM(f.liters), 0) as efficiency
      FROM vehicles v
      LEFT JOIN trips t ON v.id = t.vehicle_id AND t.status = 'Completed'
      LEFT JOIN fuel_logs f ON v.id = f.vehicle_id
      GROUP BY v.id
      HAVING efficiency IS NOT NULL
    `).all();
    res.json(data);
  });

  app.get("/api/analytics/maintenance-roi", (req, res) => {
    const data = db.prepare(`
      SELECT type as name, COUNT(*) as value 
      FROM maintenance_logs 
      GROUP BY type
    `).all();
    res.json(data);
  });

  app.delete("/api/vehicles/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.delete("/api/drivers/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM drivers WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.post("/api/maintenance", (req, res) => {
    const { vehicle_id, description, cost, date, type } = req.body;
    db.prepare("INSERT INTO maintenance_logs (vehicle_id, description, cost, date, type) VALUES (?, ?, ?, ?, ?)").run(vehicle_id, description, cost, date, type || 'Routine');
    db.prepare("UPDATE vehicles SET status = 'In Shop' WHERE id = ?").run(vehicle_id);
    res.json({ success: true });
  });

  app.post("/api/fuel", (req, res) => {
    const { vehicle_id, liters, cost, date } = req.body;
    db.prepare("INSERT INTO fuel_logs (vehicle_id, liters, cost, date) VALUES (?, ?, ?, ?)").run(vehicle_id, liters, cost, date);
    res.json({ success: true });
  });

  app.get("/api/reports/financial", (req, res) => {
    const report = db.prepare(`
      SELECT 
        v.id, v.name, v.license_plate,
        COALESCE(SUM(f.cost), 0) as total_fuel_cost,
        COALESCE(SUM(m.cost), 0) as total_maintenance_cost,
        (COALESCE(SUM(f.cost), 0) + COALESCE(SUM(m.cost), 0)) as total_operational_cost
      FROM vehicles v
      LEFT JOIN fuel_logs f ON v.id = f.vehicle_id
      LEFT JOIN maintenance_logs m ON v.id = m.vehicle_id
      GROUP BY v.id
    `).all();
    res.json(report);
  });

  app.post("/api/drivers", (req, res) => {
    const { name, license_number, license_expiry } = req.body;
    const result = db.prepare("INSERT INTO drivers (name, license_number, license_expiry) VALUES (?, ?, ?)").run(name, license_number, license_expiry);
    res.json({ id: result.lastInsertRowid });
  });

  app.post("/api/trips/:id/complete", (req, res) => {
    const { id } = req.params;
    const { end_odometer } = req.body;
    
    const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(id) as any;
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    if (end_odometer < trip.start_odometer) {
      return res.status(400).json({ error: `Final odometer (${end_odometer}) cannot be less than start odometer (${trip.start_odometer})` });
    }

    db.prepare("UPDATE trips SET status = 'Completed', end_date = ?, end_odometer = ? WHERE id = ?")
      .run(new Date().toISOString(), end_odometer, id);
    
    db.prepare("UPDATE vehicles SET status = 'Available', odometer = ? WHERE id = ?").run(end_odometer, trip.vehicle_id);
    db.prepare("UPDATE drivers SET status = 'On Duty' WHERE id = ?").run(trip.driver_id);

    res.json({ success: true });
  });

  app.get("/api/maintenance", (req, res) => {
    const logs = db.prepare(`
      SELECT maintenance_logs.*, vehicles.name as vehicle_name 
      FROM maintenance_logs 
      JOIN vehicles ON maintenance_logs.vehicle_id = vehicles.id
    `).all();
    res.json(logs);
  });

  app.get("/api/fuel", (req, res) => {
    const logs = db.prepare(`
      SELECT fuel_logs.*, vehicles.name as vehicle_name 
      FROM fuel_logs 
      JOIN vehicles ON fuel_logs.vehicle_id = vehicles.id
    `).all();
    res.json(logs);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
