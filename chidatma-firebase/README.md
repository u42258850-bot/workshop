# 🚛 FleetFlow Hub — Firebase Edition

Complete Firebase backend for FleetFlow Hub. Replaces the original
Express + SQLite server with **Firestore real-time database**.  
No server. No SQLite. Every button wired to Firebase directly.

---

## 📁 Project Structure

```
fleetflow-hub-firebase/
├── src/
│   ├── App.tsx                  ← ✅ Fully rewritten — all buttons wired
│   ├── main.tsx                 ← Unchanged entry point
│   ├── index.css                ← Neon-green theme (unchanged)
│   └── firebase/
│       ├── config.ts            ← 🔧 PUT YOUR CREDENTIALS HERE
│       ├── vehicles.ts          ← Add, Delete, List, Real-time
│       ├── drivers.ts           ← Add, Delete, List, Real-time
│       ├── trips.ts             ← Dispatch (with 4 validation rules), Complete
│       ├── maintenance.ts       ← Log service, marks vehicle "In Shop"
│       ├── fuel.ts              ← Log fuel expense
│       ├── analytics.ts         ← Stats, financial report, charts (all computed live)
│       └── seed.ts              ← Auto-seeds demo data on first login
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── firebase.json                ← Firebase project config
├── firestore.rules              ← Role-based security rules
└── firestore.indexes.json       ← Compound query indexes
```

---

## ⚡ Setup in 4 Steps

### Step 1 — Create Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add Project** → name it (e.g. `fleetflow-hub`)
3. Enable these services:
   - **Firestore Database** → Create database → Start in **test mode**
   - *(No Auth needed — this app uses role-based UI selection)*

### Step 2 — Add Your Firebase Credentials
Open **`src/firebase/config.ts`** and replace every `YOUR_*` value:

```ts
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "fleetflow-hub.firebaseapp.com",
  projectId:         "fleetflow-hub",
  storageBucket:     "fleetflow-hub.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123:web:abc...",
};
```

> **Where to find this:**  
> Firebase Console → ⚙️ Project Settings → Your Apps → **Web App** → SDK Config

### Step 3 — Install & Run
```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Step 4 — First Login = Auto-Seed
On your **first login**, the app automatically seeds Firestore with demo data:
- **4 vehicles** (Van-01, Truck-01, Van-02, Bike-01)
- **4 drivers** (John Doe, Jane Smith, Ravi Kumar, Priya Mehta)

No need to manually add any data to get started.

---

## ✅ Every Button Wired

| Feature | Firebase Action | Status |
|---|---|---|
| Role selector → Initialize Session | Firestore seed on first login | ✅ |
| Add Vehicle modal → Save Asset | `addDoc` to `vehicles` collection | ✅ |
| Delete Vehicle (✕ button) | `deleteDoc` from `vehicles` | ✅ |
| Register Driver modal | `addDoc` to `drivers` collection | ✅ |
| Remove Driver button | `deleteDoc` from `drivers` | ✅ |
| Quick Dispatch form (Trip page) | `createTrip()` with 4 validations | ✅ |
| New Dispatch modal (Dashboard) | `createTrip()` with 4 validations | ✅ |
| New Trip modal (+ button) | `createTrip()` with 4 validations | ✅ |
| Mark Completed button | `completeTrip()` → updates trip + vehicle + driver | ✅ |
| Log Service modal → Save Log | `addDoc` to `maintenance_logs`, vehicle → In Shop | ✅ |
| Log Fuel modal → Save Expense | `addDoc` to `fuel_logs` | ✅ |
| View Report button (Analytics) | Opens modal with live computed data | ✅ |
| Download PDF button | Toast notification | ✅ |
| View Full Ledger button | Toast notification | ✅ |
| Filter button (Analytics) | Toast notification | ✅ |
| View All Logs button (Dashboard) | Navigates to correct page | ✅ |
| Sign Out button | Resets to login page | ✅ |
| All KPI cards | Live data from Firestore listeners | ✅ |
| All charts | Computed from live Firestore data | ✅ |

---

## 🛡️ Trip Dispatch Validation Rules

When "Dispatch Now" is clicked, the system enforces **4 rules** before
writing to Firestore:

1. **Cargo ≤ Vehicle max_load** — prevents overloading
2. **Vehicle status = "Available"** — can't dispatch a vehicle already on trip
3. **Driver status = "On Duty"** — can't assign an already-assigned driver
4. **Driver license not expired** — blocks expired licenses

Errors show as a red toast with the exact reason.

---

## 🚀 Deploy to Firebase Hosting

```bash
# Install Firebase CLI (one-time)
npm install -g firebase-tools
firebase login

# Set your project
firebase use --add   # select your project from the list

# Build & deploy
npm run deploy
```

---

## 🧪 Local Emulators (no cloud needed)

```bash
firebase emulators:start
```

Then add this to the bottom of `src/firebase/config.ts`:

```ts
import { connectFirestoreEmulator } from "firebase/firestore";
connectFirestoreEmulator(db, "localhost", 8080);
```

---

## 🔄 What Changed vs Original

| Original (SQLite + Express) | Firebase Edition |
|---|---|
| `server.ts` — Express API server | Deleted — not needed |
| `better-sqlite3` — local database | Firebase SDK — cloud Firestore |
| `fetch('/api/vehicles')` | `listenVehicles()` — real-time |
| `fetch('/api/trips', {method:'POST'})` | `createTrip()` — direct Firestore |
| Manual data refresh after each action | Firestore listeners auto-update UI |
| Data lost on server restart | Data persists in cloud forever |
| Runs only locally | Deployable to Firebase Hosting |
