/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Wrench, 
  Fuel, 
  BarChart3, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Search,
  Filter,
  Calendar,
  ShieldCheck,
  Package,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

type UserRole = 'Fleet Manager' | 'Dispatcher' | 'Safety Officer' | 'Financial Analyst' | 'Admin';
type Page = 'dashboard' | 'vehicles' | 'drivers' | 'trips' | 'maintenance' | 'fuel' | 'analytics' | 'login';
type VehicleStatus = 'Available' | 'On Trip' | 'In Shop' | 'Retired';
type TripStatus = 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';

interface Vehicle {
  id: number;
  name: string;
  model: string;
  license_plate: string;
  max_load: number;
  odometer: number;
  status: VehicleStatus;
}

interface Driver {
  id: number;
  name: string;
  license_number: string;
  license_expiry: string;
  status: string;
  safety_score: number;
}

interface Trip {
  id: number;
  vehicle_id: number;
  driver_id: number;
  vehicle_name: string;
  driver_name: string;
  cargo_weight: number;
  status: TripStatus;
  start_date: string;
  end_date?: string;
  start_odometer: number;
  end_odometer?: number;
}

interface Stats {
  activeFleet: number;
  maintenanceAlerts: number;
  utilizationRate: number;
  pendingCargo: number;
}

// --- Components ---

const StatusPill = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    'Available': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'On Trip': 'bg-blue-50 text-blue-600 border-blue-200',
    'In Shop': 'bg-amber-50 text-amber-600 border-amber-200',
    'Retired': 'bg-zinc-100 text-zinc-600 border-zinc-200',
    'Dispatched': 'bg-blue-50 text-blue-600 border-blue-200',
    'Completed': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'Draft': 'bg-zinc-100 text-zinc-600 border-zinc-200',
    'Cancelled': 'bg-rose-50 text-rose-600 border-rose-200',
    'On Duty': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'Off Duty': 'bg-zinc-100 text-zinc-600 border-zinc-200',
    'Suspended': 'bg-rose-50 text-rose-600 border-rose-200',
  };

  return (
    <span className={cn(
      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
      colors[status] || 'bg-zinc-100 text-zinc-600 border-zinc-200'
    )}>
      {status}
    </span>
  );
};

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <div className={cn("bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden", className)} {...props}>
    {children}
  </div>
);

// --- Main App ---

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [financialReport, setFinancialReport] = useState<any[]>([]);
  const [efficiencyData, setEfficiencyData] = useState<any[]>([]);
  const [fuelEfficiencyData, setFuelEfficiencyData] = useState<any[]>([]);
  const [maintenanceRoiData, setMaintenanceRoiData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [showAddFuel, setShowAddFuel] = useState(false);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showCompleteTrip, setShowCompleteTrip] = useState<number | null>(null);
  const [showReport, setShowReport] = useState<any | null>(null);

  useEffect(() => {
    if (currentPage !== 'login') {
      fetchData();
    }
  }, [currentPage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const fetchJson = async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      };

      const [s, v, d, t, m, f, r, e, fe, mr] = await Promise.allSettled([
        fetchJson('/api/stats'),
        fetchJson('/api/vehicles'),
        fetchJson('/api/drivers'),
        fetchJson('/api/trips'),
        fetchJson('/api/maintenance'),
        fetchJson('/api/fuel'),
        fetchJson('/api/reports/financial'),
        fetchJson('/api/analytics/efficiency'),
        fetchJson('/api/analytics/fuel-efficiency'),
        fetchJson('/api/analytics/maintenance-roi')
      ]);

      if (s.status === 'fulfilled') setStats(s.value);
      if (v.status === 'fulfilled') setVehicles(v.value);
      if (d.status === 'fulfilled') setDrivers(d.value);
      if (t.status === 'fulfilled') setTrips(t.value);
      if (m.status === 'fulfilled') setMaintenanceLogs(m.value);
      if (f.status === 'fulfilled') setFuelLogs(f.value);
      if (r.status === 'fulfilled') setFinancialReport(r.value);
      if (e.status === 'fulfilled') setEfficiencyData(e.value);
      if (fe.status === 'fulfilled') setFuelEfficiencyData(fe.value);
      if (mr.status === 'fulfilled') setMaintenanceRoiData(mr.value);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteVehicle = async (id: number) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const deleteDriver = async (id: number) => {
    if (!confirm("Are you sure you want to delete this driver?")) return;
    await fetch(`/api/drivers/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const role = formData.get('role') as UserRole;
    setUserRole(role);
    setCurrentPage('dashboard');
  };

  if (currentPage === 'login') {
    const roles: { id: UserRole; title: string; desc: string; icon: any }[] = [
      { id: 'Fleet Manager', title: 'Fleet Manager', desc: 'Oversee vehicle health & asset lifecycle', icon: Truck },
      { id: 'Dispatcher', title: 'Dispatcher', desc: 'Create trips & assign drivers', icon: Package },
      { id: 'Safety Officer', title: 'Safety Officer', desc: 'Monitor compliance & safety scores', icon: ShieldCheck },
      { id: 'Financial Analyst', title: 'Financial Analyst', desc: 'Audit spend & operational ROI', icon: BarChart3 },
    ];

    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans text-zinc-900">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl"
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-neon-green rounded-2xl mb-4 shadow-lg shadow-neon-green/20">
              <Truck className="text-black w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">FleetFlow Hub</h1>
            <p className="text-zinc-500 mt-2 text-lg">Select your terminal to access the modular logistics network</p>
          </div>

          <form onSubmit={handleLogin} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roles.map((role) => (
              <label key={role.id} className="relative cursor-pointer group">
                <input type="radio" name="role" value={role.id} className="peer sr-only" required />
                <Card className="p-6 border-2 border-transparent peer-checked:border-neon-green peer-checked:bg-neon-green/5 transition-all hover:border-zinc-300 h-full flex flex-col">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-zinc-100 rounded-xl group-hover:bg-neon-green/10 transition-colors">
                      <role.icon className="w-6 h-6 text-zinc-600 group-hover:text-neon-green" />
                    </div>
                    <h3 className="font-bold text-lg text-zinc-900">{role.title}</h3>
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed flex-1">{role.desc}</p>
                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Terminal Access</span>
                    <div className="w-6 h-6 rounded-full border-2 border-zinc-200 peer-checked:border-neon-green flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-neon-green opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Card>
              </label>
            ))}
            
            <div className="md:col-span-2 mt-4">
              <button 
                type="submit"
                className="w-full py-4 bg-neon-green text-black font-bold rounded-xl hover:brightness-110 transition-all shadow-lg shadow-neon-green/20 flex items-center justify-center gap-2 text-lg"
              >
                Initialize Session <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </form>
          
          <p className="text-center text-zinc-400 text-xs mt-12">
            Secure Terminal Access • v2.4.0 • Enterprise Edition
          </p>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard, roles: ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst', 'Admin'] },
    { id: 'vehicles', label: 'Vehicle Registry', icon: Truck, roles: ['Fleet Manager', 'Dispatcher', 'Admin'] },
    { id: 'drivers', label: 'Driver Profiles', icon: Users, roles: ['Dispatcher', 'Safety Officer', 'Admin'] },
    { id: 'trips', label: 'Trip Dispatcher', icon: Package, roles: ['Dispatcher', 'Admin'] },
    { id: 'maintenance', label: 'Service Logs', icon: Wrench, roles: ['Fleet Manager', 'Admin'] },
    { id: 'fuel', label: 'Fuel & Expenses', icon: Fuel, roles: ['Financial Analyst', 'Admin'] },
    { id: 'analytics', label: 'Operational Reports', icon: BarChart3, roles: ['Fleet Manager', 'Financial Analyst', 'Admin'] },
  ];

  const filteredNavItems = navItems.filter(item => userRole === 'Admin' || item.roles.includes(userRole!));

  return (
    <div className="min-h-screen bg-zinc-50 flex font-sans text-zinc-900">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-zinc-200 transition-all duration-300 flex flex-col z-50",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-neon-green rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-neon-green/10">
            <Truck className="text-black w-6 h-6" />
          </div>
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight text-zinc-900">FleetFlow</span>}
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id as Page)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all group",
                currentPage === item.id 
                  ? "bg-neon-green/10 text-neon-green font-bold" 
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", currentPage === item.id ? "text-neon-green" : "text-zinc-500 group-hover:text-zinc-700")} />
              {isSidebarOpen && <span>{item.label}</span>}
              {currentPage === item.id && isSidebarOpen && (
                <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-1.5 rounded-full bg-neon-green" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-200">
          <button 
            onClick={() => setCurrentPage('login')}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-zinc-500 hover:bg-rose-50 hover:text-rose-600 transition-all"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-zinc-900">
              {navItems.find(i => i.id === currentPage)?.label}
            </h2>
            {userRole && (
              <div className="ml-4 px-3 py-1 bg-zinc-100 rounded-full border border-zinc-200 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-neon-green" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{userRole}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search assets, trips..." 
                className="pl-10 pr-4 py-2 bg-zinc-100 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:ring-2 focus:ring-neon-green outline-none w-64"
              />
            </div>
            <div className="w-8 h-8 rounded-full bg-neon-green flex items-center justify-center text-black font-bold text-xs">
              AD
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-zinc-50">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {currentPage === 'dashboard' && (
                <div className="space-y-8">
                  {/* Role-Specific Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-zinc-900">Welcome back, {userRole}</h1>
                      <p className="text-zinc-500">Here's what's happening with your fleet today.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-all flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </button>
                      {userRole === 'Dispatcher' && (
                        <button onClick={() => setShowAddTrip(true)} className="px-4 py-2 bg-neon-green text-black rounded-lg text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-neon-green/10 flex items-center gap-2">
                          <Plus className="w-4 h-4" /> New Dispatch
                        </button>
                      )}
                      {userRole === 'Fleet Manager' && (
                        <button onClick={() => setShowAddVehicle(true)} className="px-4 py-2 bg-neon-green text-black rounded-lg text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-neon-green/10 flex items-center gap-2">
                          <Plus className="w-4 h-4" /> Add Asset
                        </button>
                      )}
                    </div>
                  </div>

                  {/* KPIs - Dynamic based on role */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {userRole === 'Fleet Manager' || userRole === 'Admin' ? (
                      <>
                        <Card className="p-6 border-zinc-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-50 rounded-xl"><Truck className="w-6 h-6 text-blue-600" /></div>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">+12%</span>
                          </div>
                          <p className="text-sm font-medium text-zinc-500">Active Fleet</p>
                          <h3 className="text-2xl font-bold mt-1 text-zinc-900">{stats?.activeFleet || 0} <span className="text-sm font-normal text-zinc-400">Vehicles</span></h3>
                        </Card>
                        <Card className="p-6 border-zinc-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-amber-50 rounded-xl"><Wrench className="w-6 h-6 text-amber-600" /></div>
                          </div>
                          <p className="text-sm font-medium text-zinc-500">Maintenance Alerts</p>
                          <h3 className="text-2xl font-bold mt-1 text-zinc-900">{stats?.maintenanceAlerts || 0} <span className="text-sm font-normal text-zinc-400">In Shop</span></h3>
                        </Card>
                        <Card className="p-6 border-zinc-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-neon-green/10 rounded-xl"><BarChart3 className="w-6 h-6 text-neon-green" /></div>
                          </div>
                          <p className="text-sm font-medium text-zinc-500">Utilization Rate</p>
                          <h3 className="text-2xl font-bold mt-1 text-zinc-900">{stats?.utilizationRate || 0}%</h3>
                          <div className="w-full bg-zinc-100 h-1.5 rounded-full mt-4">
                            <div className="bg-neon-green h-full rounded-full shadow-[0_0_10px_rgba(57,255,20,0.2)]" style={{ width: `${stats?.utilizationRate || 0}%` }} />
                          </div>
                        </Card>
                        <Card className="p-6 border-zinc-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-rose-50 rounded-xl"><ShieldCheck className="w-6 h-6 text-rose-600" /></div>
                          </div>
                          <p className="text-sm font-medium text-zinc-500">Safety Compliance</p>
                          <h3 className="text-2xl font-bold mt-1 text-zinc-900">98.2%</h3>
                        </Card>
                      </>
                    ) : userRole === 'Dispatcher' ? (
                      <>
                        <Card className="p-6 border-zinc-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-50 rounded-xl"><Package className="w-6 h-6 text-blue-600" /></div>
                          </div>
                          <p className="text-sm font-medium text-zinc-500">Active Trips</p>
                          <h3 className="text-2xl font-bold mt-1 text-zinc-900">{trips.filter(t => t.status === 'Dispatched').length} <span className="text-sm font-normal text-zinc-400">Live</span></h3>
                        </Card>
                        <Card className="p-6 border-zinc-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-50 rounded-xl"><Users className="w-6 h-6 text-emerald-600" /></div>
                          </div>
                          <p className="text-sm font-medium text-zinc-500">Available Drivers</p>
                          <h3 className="text-2xl font-bold mt-1 text-zinc-900">{drivers.filter(d => d.status === 'On Duty').length} <span className="text-sm font-normal text-zinc-400">Ready</span></h3>
                        </Card>
                        <Card className="p-6 border-zinc-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-amber-50 rounded-xl"><Truck className="w-6 h-6 text-amber-600" /></div>
                          </div>
                          <p className="text-sm font-medium text-zinc-500">Available Vehicles</p>
                          <h3 className="text-2xl font-bold mt-1 text-zinc-900">{vehicles.filter(v => v.status === 'Available').length} <span className="text-sm font-normal text-zinc-400">Ready</span></h3>
                        </Card>
                        <Card className="p-6 border-zinc-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-rose-50 rounded-xl"><Package className="w-6 h-6 text-rose-600" /></div>
                          </div>
                          <p className="text-sm font-medium text-zinc-500">Pending Cargo</p>
                          <h3 className="text-2xl font-bold mt-1 text-zinc-900">{stats?.pendingCargo || 0} <span className="text-sm font-normal text-zinc-400">Shipments</span></h3>
                        </Card>
                      </>
                    ) : userRole === 'Safety Officer' ? (
                      <>
                        <Card className="p-6 border-zinc-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-50 rounded-xl"><ShieldCheck className="w-6 h-6 text-emerald-600" /></div>
                          </div>
                          <p className="text-sm font-medium text-zinc-500">Avg Safety Score</p>
                          <h3 className="text-2xl font-bold mt-1 text-zinc-900">92.4 <span className="text-sm font-normal text-zinc-400">/ 100</span></h3>
                        </Card>
                        <Card className="p-6 border-zinc-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-rose-50 rounded-xl"><AlertTriangle className="w-6 h-6 text-rose-600" /></div>
                          </div>
                          <p className="text-sm font-medium text-zinc-500">Expiring Licenses</p>
                          <h3 className="text-2xl font-bold mt-1 text-zinc-900">{drivers.filter(d => new Date(d.license_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length} <span className="text-sm font-normal text-zinc-400">Drivers</span></h3>
                        </Card>
                        <Card className="p-6 border-zinc-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-50 rounded-xl"><Users className="w-6 h-6 text-blue-600" /></div>
                          </div>
                          <p className="text-sm font-medium text-zinc-500">Active Drivers</p>
                          <h3 className="text-2xl font-bold mt-1 text-zinc-900">{drivers.length} <span className="text-sm font-normal text-zinc-400">Total</span></h3>
                        </Card>
                        <Card className="p-6 border-zinc-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-zinc-50 rounded-xl"><Clock className="w-6 h-6 text-zinc-600" /></div>
                          </div>
                          <p className="text-sm font-medium text-zinc-500">Safety Incidents</p>
                          <h3 className="text-2xl font-bold mt-1 text-zinc-900">0 <span className="text-sm font-normal text-zinc-400">This Month</span></h3>
                        </Card>
                      </>
                    ) : (
                      <>
                        <Card className="p-6 border-zinc-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-rose-50 rounded-xl"><Fuel className="w-6 h-6 text-rose-600" /></div>
                          </div>
                          <p className="text-sm font-medium text-zinc-500">Total Fuel Spend</p>
                          <h3 className="text-2xl font-bold mt-1 text-zinc-900">₹{fuelLogs.reduce((acc, log) => acc + log.cost, 0).toLocaleString()}</h3>
                        </Card>
                        <Card className="p-6 border-zinc-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-amber-50 rounded-xl"><Wrench className="w-6 h-6 text-amber-600" /></div>
                          </div>
                          <p className="text-sm font-medium text-zinc-500">Maintenance Cost</p>
                          <h3 className="text-2xl font-bold mt-1 text-zinc-900">₹{maintenanceLogs.reduce((acc, log) => acc + log.cost, 0).toLocaleString()}</h3>
                        </Card>
                        <Card className="p-6 border-zinc-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-50 rounded-xl"><BarChart3 className="w-6 h-6 text-emerald-600" /></div>
                          </div>
                          <p className="text-sm font-medium text-zinc-500">Estimated Revenue</p>
                          <h3 className="text-2xl font-bold mt-1 text-zinc-900">₹{(fuelLogs.reduce((acc, log) => acc + log.cost, 0) * 2.5).toLocaleString()}</h3>
                        </Card>
                        <Card className="p-6 border-zinc-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-50 rounded-xl"><LayoutDashboard className="w-6 h-6 text-blue-600" /></div>
                          </div>
                          <p className="text-sm font-medium text-zinc-500">Cost per KM</p>
                          <h3 className="text-2xl font-bold mt-1 text-zinc-900">₹14.20</h3>
                        </Card>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Chart - Dynamic based on role */}
                    <Card className="lg:col-span-2 p-6 border-zinc-200">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="font-bold text-zinc-900">
                          {userRole === 'Financial Analyst' ? 'Fuel Efficiency Trends' : 
                           userRole === 'Safety Officer' ? 'Driver Safety Scores' : 
                           'Operational Efficiency'}
                        </h4>
                        <select className="text-xs border-zinc-200 rounded-lg bg-zinc-50 text-zinc-600 px-2 py-1 outline-none">
                          <option>Last 7 Days</option>
                          <option>Last 30 Days</option>
                        </select>
                      </div>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          {userRole === 'Financial Analyst' ? (
                            <LineChart data={fuelEfficiencyData.length > 0 ? fuelEfficiencyData : [
                              { date: 'Mon', efficiency: 8.2 },
                              { date: 'Tue', efficiency: 8.5 },
                              { date: 'Wed', efficiency: 7.9 },
                              { date: 'Thu', efficiency: 9.1 },
                              { date: 'Fri', efficiency: 8.8 },
                              { date: 'Sat', efficiency: 8.4 },
                              { date: 'Sun', efficiency: 8.6 },
                            ]}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                              <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                              <Line type="monotone" dataKey="efficiency" name="KM/L" stroke="#39FF14" strokeWidth={3} dot={{ r: 4, fill: '#39FF14' }} />
                            </LineChart>
                          ) : userRole === 'Safety Officer' ? (
                            <BarChart data={drivers.slice(0, 7).map(d => ({ name: d.name.split(' ')[0], score: d.safety_score }))}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                              <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                              <Bar dataKey="score" name="Safety Score" fill="#39FF14" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          ) : (
                            <LineChart data={efficiencyData.length > 0 ? efficiencyData : [
                              { date: 'Mon', count: 45 },
                              { date: 'Tue', count: 52 },
                              { date: 'Wed', count: 48 },
                              { date: 'Thu', count: 61 },
                              { date: 'Fri', count: 55 },
                              { date: 'Sat', count: 32 },
                              { date: 'Sun', count: 28 },
                            ]}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                              <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                              <Line type="monotone" dataKey="count" name="Trips" stroke="#39FF14" strokeWidth={3} dot={{ r: 4, fill: '#39FF14' }} />
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    {/* Recent Activity - Dynamic based on role */}
                    <Card className="p-6 border-zinc-200">
                      <h4 className="font-bold text-zinc-900 mb-6">
                        {userRole === 'Fleet Manager' ? 'Recent Service Logs' : 
                         userRole === 'Financial Analyst' ? 'Recent Fuel Expenses' : 
                         userRole === 'Safety Officer' ? 'Driver Compliance' : 
                         'Recent Dispatch Logs'}
                      </h4>
                      <div className="space-y-6">
                        {userRole === 'Fleet Manager' ? (
                          maintenanceLogs.slice(0, 5).map((log) => (
                            <div key={log.id} className="flex gap-4">
                              <div className="shrink-0 w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-100">
                                <Wrench className="w-5 h-5 text-amber-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-zinc-900 truncate">{log.description}</p>
                                <p className="text-xs text-zinc-500 mt-0.5">Vehicle: {log.vehicle_name}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">₹{log.cost}</span>
                                  <span className="text-[10px] text-zinc-400">• {new Date(log.date).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : userRole === 'Financial Analyst' ? (
                          fuelLogs.slice(0, 5).map((log) => (
                            <div key={log.id} className="flex gap-4">
                              <div className="shrink-0 w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-100">
                                <Fuel className="w-5 h-5 text-rose-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-zinc-900 truncate">Fuel Refill: {log.liters}L</p>
                                <p className="text-xs text-zinc-500 mt-0.5">Vehicle: {log.vehicle_name}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">₹{log.cost}</span>
                                  <span className="text-[10px] text-zinc-400">• {new Date(log.date).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          trips.slice(0, 5).map((trip) => (
                            <div key={trip.id} className="flex gap-4">
                              <div className="shrink-0 w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-100">
                                <Clock className="w-5 h-5 text-zinc-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-zinc-900 truncate">{trip.vehicle_name} Dispatched</p>
                                <p className="text-xs text-zinc-500 mt-0.5">Driver: {trip.driver_name}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <StatusPill status={trip.status} />
                                  <span className="text-[10px] text-zinc-400">Active</span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        {(userRole === 'Fleet Manager' ? maintenanceLogs : userRole === 'Financial Analyst' ? fuelLogs : trips).length === 0 && (
                          <div className="text-center py-8 text-zinc-400">
                            <Clock className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No recent activity</p>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => setCurrentPage(userRole === 'Fleet Manager' ? 'maintenance' : userRole === 'Financial Analyst' ? 'fuel' : 'trips')}
                        className="w-full mt-6 py-2 text-sm font-bold text-neon-green hover:bg-neon-green/5 rounded-lg transition-colors"
                      >
                        View All Logs
                      </button>
                    </Card>
                  </div>
                </div>
              )}

              {currentPage === 'vehicles' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-zinc-900">Vehicle Registry</h3>
                      <p className="text-zinc-500">Manage your physical fleet assets</p>
                    </div>
                    <button 
                      onClick={() => setShowAddVehicle(true)}
                      className="bg-neon-green text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-neon-green/10"
                    >
                      <Plus className="w-4 h-4" /> Add Vehicle
                    </button>
                  </div>

                  <Card className="border-zinc-200">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-200">
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Asset Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Plate ID</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Capacity</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Odometer</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {vehicles.map((vehicle) => (
                            <tr key={vehicle.id} className="hover:bg-zinc-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                                    <Truck className="w-4 h-4 text-zinc-500" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-zinc-900">{vehicle.name}</p>
                                    <p className="text-xs text-zinc-500">{vehicle.model}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm font-mono text-zinc-500">{vehicle.license_plate}</td>
                              <td className="px-6 py-4 text-sm text-zinc-500">{vehicle.max_load} kg</td>
                              <td className="px-6 py-4 text-sm text-zinc-500">{vehicle.odometer.toLocaleString()} km</td>
                              <td className="px-6 py-4"><StatusPill status={vehicle.status} /></td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => deleteVehicle(vehicle.id)}
                                  className="text-zinc-400 hover:text-rose-500 p-1 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {currentPage === 'drivers' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-zinc-900">Driver Profiles</h3>
                      <p className="text-zinc-500">Human resource and compliance management</p>
                    </div>
                    <button 
                      onClick={() => setShowAddDriver(true)}
                      className="bg-neon-green text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-neon-green/10"
                    >
                      <Plus className="w-4 h-4" /> Register Driver
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {drivers.map((driver) => (
                      <Card key={driver.id} className="p-6 border-zinc-200">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-900 font-bold border border-zinc-200">
                              {driver.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <h4 className="font-bold text-zinc-900">{driver.name}</h4>
                              <p className="text-xs text-zinc-500">ID: {driver.license_number}</p>
                            </div>
                          </div>
                          <StatusPill status={driver.status} />
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500 flex items-center gap-2"><Calendar className="w-4 h-4" /> License Expiry</span>
                            <span className={cn(
                              "font-medium",
                              new Date(driver.license_expiry) < new Date() ? "text-rose-600" : "text-zinc-700"
                            )}>{driver.license_expiry}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Safety Score</span>
                            <span className="font-bold text-neon-green">{driver.safety_score}/100</span>
                          </div>
                          <div className="w-full bg-zinc-100 h-2 rounded-full">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all shadow-[0_0_8px_rgba(57,255,20,0.2)]",
                                driver.safety_score > 80 ? "bg-neon-green" : driver.safety_score > 50 ? "bg-amber-500" : "bg-rose-500"
                              )} 
                              style={{ width: `${driver.safety_score}%` }} 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-6">
                          <button 
                            onClick={() => deleteDriver(driver.id)}
                            className="py-2 text-xs font-bold text-zinc-400 bg-zinc-800 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                          <button className="py-2 text-xs font-bold text-black bg-neon-green hover:brightness-110 rounded-lg transition-colors">
                            Manage
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {currentPage === 'trips' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-zinc-900">Trip Dispatcher</h3>
                      <p className="text-zinc-500">Coordinate movement from Point A to Point B</p>
                    </div>
                    <button 
                      onClick={() => setShowAddTrip(true)}
                      className="bg-neon-green text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-neon-green/10"
                    >
                      <Plus className="w-4 h-4" /> New Trip
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Active Trips */}
                    <div className="lg:col-span-2 space-y-4">
                      <h4 className="font-bold text-zinc-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-neon-green" /> Active Dispatches
                      </h4>
                      {trips.filter(t => t.status === 'Dispatched').map((trip) => (
                        <Card key={trip.id} className="p-6 border-zinc-200">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                                <Truck className="w-6 h-6 text-zinc-400" />
                              </div>
                              <div>
                                <h5 className="font-bold text-zinc-900">{trip.vehicle_name}</h5>
                                <p className="text-xs text-zinc-500">Assigned to {trip.driver_name}</p>
                              </div>
                            </div>
                            <StatusPill status={trip.status} />
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-6">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Cargo Weight</p>
                              <p className="text-sm font-bold text-zinc-700">{trip.cargo_weight} kg</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Start Time</p>
                              <p className="text-sm font-bold text-zinc-700">{new Date(trip.start_date).toLocaleTimeString()}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Start Odo</p>
                              <p className="text-sm font-bold text-zinc-700">{trip.start_odometer} km</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => setShowCompleteTrip(trip.id)}
                              className="flex-1 py-2 bg-neon-green text-black rounded-lg text-sm font-bold hover:brightness-110 transition-colors"
                            >
                              Mark Completed
                            </button>
                            <button 
                              onClick={() => alert("Live route tracking is only available for GPS-equipped vehicles.")}
                              className="px-4 py-2 border border-zinc-200 text-zinc-500 rounded-lg text-sm font-bold hover:bg-zinc-50 transition-colors"
                            >
                              View Route
                            </button>
                          </div>
                        </Card>
                      ))}
                      {trips.filter(t => t.status === 'Dispatched').length === 0 && (
                        <Card className="p-12 text-center border-dashed border-zinc-200 bg-transparent">
                          <Package className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                          <p className="text-zinc-400">No active trips at the moment</p>
                        </Card>
                      )}
                    </div>

                    {/* Dispatch Form */}
                    <Card className="p-6 h-fit sticky top-8 border-zinc-200">
                      <h4 className="font-bold text-zinc-900 mb-6">Quick Dispatch</h4>
                      <form className="space-y-4" onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const data = {
                          vehicle_id: Number(formData.get('vehicle_id')),
                          driver_id: Number(formData.get('driver_id')),
                          cargo_weight: Number(formData.get('cargo_weight'))
                        };
                        
                        try {
                          const res = await fetch('/api/trips', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                          });
                          if (res.ok) {
                            fetchData();
                            (e.target as HTMLFormElement).reset();
                          } else {
                            const err = await res.json();
                            alert(err.error || "Failed to dispatch");
                          }
                        } catch (err) {
                          alert("Network error");
                        }
                      }}>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Select Vehicle</label>
                          <select name="vehicle_id" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green">
                            <option value="">Select Available...</option>
                            {vehicles.filter(v => v.status === 'Available').map(v => (
                              <option key={v.id} value={v.id}>{v.name} ({v.max_load}kg)</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Select Driver</label>
                          <select name="driver_id" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green">
                            <option value="">Select On Duty...</option>
                            {drivers.filter(d => d.status === 'On Duty').map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Cargo Weight (kg)</label>
                          <input name="cargo_weight" type="number" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green" placeholder="0" />
                        </div>
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                          <p className="text-[11px] text-amber-700 leading-relaxed">
                            System will validate cargo weight against vehicle capacity and driver license validity before dispatch.
                          </p>
                        </div>
                        <button type="submit" className="w-full py-3 bg-neon-green text-black rounded-lg font-bold hover:brightness-110 transition-all shadow-lg shadow-neon-green/10">
                          Dispatch Now
                        </button>
                      </form>
                    </Card>
                  </div>
                </div>
              )}

              {currentPage === 'maintenance' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-zinc-900">Service Logs</h3>
                      <p className="text-zinc-500">Preventative and reactive health tracking</p>
                    </div>
                    <button 
                      onClick={() => setShowAddMaintenance(true)}
                      className="bg-neon-green text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-neon-green/10"
                    >
                      <Plus className="w-4 h-4" /> Log Service
                    </button>
                  </div>

                  <Card className="border-zinc-200">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-200">
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Vehicle</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {maintenanceLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                              <td className="px-6 py-4 font-bold text-zinc-900">{log.vehicle_name}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{log.description}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{log.date}</td>
                              <td className="px-6 py-4 text-sm font-bold text-rose-600">₹{log.cost.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {currentPage === 'fuel' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-zinc-900">Fuel & Expenses</h3>
                      <p className="text-zinc-500">Record liters, cost, and date per asset</p>
                    </div>
                    <button 
                      onClick={() => setShowAddFuel(true)}
                      className="bg-neon-green text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-neon-green/10"
                    >
                      <Plus className="w-4 h-4" /> Log Fuel
                    </button>
                  </div>

                  <Card className="border-zinc-200">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-200">
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Vehicle</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Liters</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {fuelLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                              <td className="px-6 py-4 font-bold text-zinc-900">{log.vehicle_name}</td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{log.liters} L</td>
                              <td className="px-6 py-4 text-sm text-zinc-600">{log.date}</td>
                              <td className="px-6 py-4 text-sm font-bold text-emerald-600">₹{log.cost.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {currentPage === 'analytics' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-zinc-900">Operational Analytics</h3>
                      <p className="text-zinc-500">Data-driven decision making for your fleet</p>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => alert("Filter functionality coming soon!")}
                        className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-bold text-zinc-500 hover:bg-zinc-50 transition-colors flex items-center gap-2"
                      >
                        <Filter className="w-4 h-4" /> Filter
                      </button>
                      <button 
                        onClick={() => alert("PDF Export is being generated...")}
                        className="px-4 py-2 bg-white border border-zinc-200 text-zinc-900 rounded-lg text-sm font-bold hover:bg-zinc-50 transition-colors flex items-center gap-2"
                      >
                        <BarChart3 className="w-4 h-4" /> Export PDF
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className="p-6 border-zinc-200">
                      <h4 className="font-bold text-zinc-900 mb-6">Fuel Efficiency by Vehicle</h4>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={fuelEfficiencyData.length > 0 ? fuelEfficiencyData : [
                            { name: 'Van-01', efficiency: 12.5 },
                            { name: 'Van-02', efficiency: 11.8 },
                            { name: 'Truck-01', efficiency: 4.2 },
                            { name: 'Truck-02', efficiency: 3.9 },
                            { name: 'Bike-01', efficiency: 35.0 },
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} label={{ value: 'km / L', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 12 } }} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <Bar dataKey="efficiency" fill="#39FF14" radius={[4, 4, 0, 0]}>
                              {fuelEfficiencyData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#39FF14' : '#10b981'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <Card className="p-6 border-zinc-200">
                      <h4 className="font-bold text-zinc-900 mb-6">Maintenance ROI Distribution</h4>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={maintenanceRoiData.length > 0 ? maintenanceRoiData : [
                                { name: 'Preventative', value: 65 },
                                { name: 'Reactive', value: 25 },
                                { name: 'Overhaul', value: 10 },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              <Cell fill="#39FF14" />
                              <Cell fill="#f59e0b" />
                              <Cell fill="#ef4444" />
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-neon-green" />
                          <span className="text-xs text-zinc-500">Preventative</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-amber-500" />
                          <span className="text-xs text-zinc-500">Reactive</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-rose-500" />
                          <span className="text-xs text-zinc-500">Overhaul</span>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <Card className="border-zinc-200">
                    <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
                      <h4 className="font-bold text-zinc-900">Financial Audit Log</h4>
                      <button 
                        onClick={() => alert("Full Ledger access requires Senior Manager permissions.")}
                        className="text-neon-green text-sm font-bold hover:underline"
                      >
                        View Full Ledger
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-zinc-50 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                            <th className="px-6 py-4">Vehicle</th>
                            <th className="px-6 py-4">Fuel Cost</th>
                            <th className="px-6 py-4">Maintenance</th>
                            <th className="px-6 py-4">Total Op Cost</th>
                            <th className="px-6 py-4">Revenue</th>
                            <th className="px-6 py-4 text-right">ROI</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 text-sm">
                          {financialReport.map(v => (
                            <tr key={v.id} className="hover:bg-zinc-50 transition-colors">
                              <td className="px-6 py-4 font-bold text-zinc-900">{v.name}</td>
                              <td className="px-6 py-4 text-zinc-600">₹{v.total_fuel_cost.toLocaleString()}</td>
                              <td className="px-6 py-4 text-zinc-600">₹{v.total_maintenance_cost.toLocaleString()}</td>
                              <td className="px-6 py-4 font-medium text-zinc-700">₹{v.total_operational_cost.toLocaleString()}</td>
                              <td className="px-6 py-4 text-emerald-600 font-bold">₹{(v.total_operational_cost * 2.5).toLocaleString()}</td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => setShowReport(v)}
                                  className="px-3 py-1 bg-neon-green/10 text-neon-green rounded-md font-bold hover:bg-neon-green/20 transition-colors"
                                >
                                  View Report
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {/* Redundant placeholders removed */}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showAddVehicle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddVehicle(false)} className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white border border-zinc-200 rounded-2xl shadow-2xl w-full max-w-md p-8 text-zinc-900">
              <h3 className="text-xl font-bold mb-6">Add New Vehicle</h3>
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const rawData = Object.fromEntries(formData.entries());
                
                const payload = {
                  ...rawData,
                  max_load: Number(rawData.max_load),
                  odometer: Number(rawData.odometer)
                };

                try {
                  const res = await fetch('/api/vehicles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });
                  
                  if (res.ok) {
                    setShowAddVehicle(false);
                    await fetchData();
                  } else {
                    const err = await res.json();
                    alert(err.error || "Failed to register vehicle");
                  }
                } catch (err) {
                  alert("Network error occurred while saving asset.");
                }
              }}>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Vehicle Name</label>
                  <input name="name" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green" placeholder="Van-05" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Model</label>
                  <input name="model" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green" placeholder="Ford Transit" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">License Plate</label>
                  <input name="license_plate" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green" placeholder="XYZ-123" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Max Load (kg)</label>
                    <input name="max_load" type="number" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green" placeholder="1000" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Odometer (km)</label>
                    <input name="odometer" type="number" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green" placeholder="0" />
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-neon-green text-black rounded-xl font-bold hover:brightness-110 transition-all">Save Asset</button>
              </form>
            </motion.div>
          </div>
        )}

        {showAddDriver && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddDriver(false)} className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white border border-zinc-200 rounded-2xl shadow-2xl w-full max-w-md p-8 text-zinc-900">
              <h3 className="text-xl font-bold mb-6">Register New Driver</h3>
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData.entries());
                try {
                  const res = await fetch('/api/drivers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                  });
                  if (res.ok) {
                    setShowAddDriver(false);
                    await fetchData();
                  } else {
                    const err = await res.json();
                    alert(err.error || "Failed to register driver");
                  }
                } catch (err) {
                  alert("Network error occurred while registering driver.");
                }
              }}>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Full Name</label>
                  <input name="name" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green" placeholder="Alex Smith" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">License Number</label>
                  <input name="license_number" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green" placeholder="DL-99999" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">License Expiry</label>
                  <input name="license_expiry" type="date" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green" />
                </div>
                <button type="submit" className="w-full py-3 bg-neon-green text-black rounded-xl font-bold hover:brightness-110 transition-all">Register Driver</button>
              </form>
            </motion.div>
          </div>
        )}

        {showAddMaintenance && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddMaintenance(false)} className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white border border-zinc-200 rounded-2xl shadow-2xl w-full max-w-md p-8 text-zinc-900">
              <h3 className="text-xl font-bold mb-6">Log Service Record</h3>
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData.entries());
                const res = await fetch('/api/maintenance', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                });
                if (res.ok) { setShowAddMaintenance(false); fetchData(); }
              }}>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Vehicle</label>
                  <select name="vehicle_id" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green">
                    <option value="">Select Vehicle...</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Description</label>
                  <input name="description" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green" placeholder="Oil Change" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Cost (₹)</label>
                    <input name="cost" type="number" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green" placeholder="500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Type</label>
                    <select name="type" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green">
                      <option value="Routine">Routine</option>
                      <option value="Preventative">Preventative</option>
                      <option value="Reactive">Reactive</option>
                      <option value="Overhaul">Overhaul</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Date</label>
                  <input name="date" type="date" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green" />
                </div>
                <button type="submit" className="w-full py-3 bg-neon-green text-black rounded-xl font-bold hover:brightness-110 transition-all">Save Log</button>
              </form>
            </motion.div>
          </div>
        )}

        {showAddFuel && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddFuel(false)} className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white border border-zinc-200 rounded-2xl shadow-2xl w-full max-w-md p-8 text-zinc-900">
              <h3 className="text-xl font-bold mb-6">Log Fuel Expense</h3>
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData.entries());
                const res = await fetch('/api/fuel', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                });
                if (res.ok) { setShowAddFuel(false); fetchData(); }
              }}>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Vehicle</label>
                  <select name="vehicle_id" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green">
                    <option value="">Select Vehicle...</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Liters</label>
                    <input name="liters" type="number" step="0.01" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green" placeholder="40" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Cost (₹)</label>
                    <input name="cost" type="number" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green" placeholder="4000" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Date</label>
                  <input name="date" type="date" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green" />
                </div>
                <button type="submit" className="w-full py-3 bg-neon-green text-black rounded-xl font-bold hover:brightness-110 transition-all">Save Expense</button>
              </form>
            </motion.div>
          </div>
        )}

        {showAddTrip && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddTrip(false)} className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white border border-zinc-200 rounded-2xl shadow-2xl w-full max-w-md p-8 text-zinc-900">
              <h3 className="text-xl font-bold mb-6">New Dispatch</h3>
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  vehicle_id: Number(formData.get('vehicle_id')),
                  driver_id: Number(formData.get('driver_id')),
                  cargo_weight: Number(formData.get('cargo_weight'))
                };
                const res = await fetch('/api/trips', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                });
                if (res.ok) { setShowAddTrip(false); fetchData(); }
                else {
                  const err = await res.json();
                  alert(err.error || "Failed to dispatch");
                }
              }}>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Select Vehicle</label>
                  <select name="vehicle_id" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green">
                    <option value="">Select Available...</option>
                    {vehicles.filter(v => v.status === 'Available').map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.max_load}kg)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Select Driver</label>
                  <select name="driver_id" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green">
                    <option value="">Select On Duty...</option>
                    {drivers.filter(d => d.status === 'On Duty').map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Cargo Weight (kg)</label>
                  <input name="cargo_weight" type="number" required className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green" placeholder="0" />
                </div>
                <button type="submit" className="w-full py-3 bg-neon-green text-black rounded-xl font-bold hover:brightness-110 transition-all">Dispatch Now</button>
              </form>
            </motion.div>
          </div>
        )}

        {showCompleteTrip && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCompleteTrip(null)} className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white border border-zinc-200 rounded-2xl shadow-2xl w-full max-w-md p-8 text-zinc-900">
              <h3 className="text-xl font-bold mb-6">Complete Trip</h3>
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const rawData = Object.fromEntries(formData.entries());
                
                const payload = {
                  end_odometer: Number(rawData.end_odometer)
                };

                try {
                  const res = await fetch(`/api/trips/${showCompleteTrip}/complete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });
                  
                  if (res.ok) {
                    setShowCompleteTrip(null);
                    await fetchData();
                  } else {
                    const err = await res.json();
                    alert(err.error || "Failed to complete trip");
                  }
                } catch (err) {
                  alert("Network error occurred while completing trip.");
                }
              }}>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Final Odometer (km)</label>
                  <input 
                    name="end_odometer" 
                    type="number" 
                    required 
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 outline-none focus:ring-2 focus:ring-neon-green" 
                    placeholder="Enter final reading" 
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-neon-green text-black rounded-xl font-bold hover:brightness-110 transition-all">Complete Dispatch</button>
              </form>
            </motion.div>
          </div>
        )}

        {showReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowReport(null)} className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white border border-zinc-200 rounded-2xl shadow-2xl w-full max-w-4xl p-0 overflow-hidden flex flex-col max-h-[90vh] text-zinc-900">
              <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                  <h3 className="text-xl font-bold">Operational Report: {showReport.name}</h3>
                  <p className="text-sm text-zinc-500">License Plate: {showReport.license_plate}</p>
                </div>
                <button onClick={() => setShowReport(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Map Section */}
                <div className="space-y-4">
                  <h4 className="font-bold text-zinc-900 flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-neon-green" /> Last Known Location
                  </h4>
                  <div className="w-full h-64 bg-zinc-100 rounded-xl overflow-hidden border border-zinc-200 relative">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://www.google.com/maps/embed/v1/place?key=REPLACE_WITH_YOUR_GOOGLE_MAPS_API_KEY&q=${encodeURIComponent(showReport.name + " Fleet Location")}&zoom=12`}
                      allowFullScreen
                    ></iframe>
                    {/* Fallback Overlay if API Key is missing (which it is in this demo) */}
                    <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center shadow-sm mb-3">
                        <Truck className="w-6 h-6 text-neon-green" />
                      </div>
                      <p className="font-bold text-zinc-900">Live Tracking Map</p>
                      <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                        In a production environment, this would display the real-time GPS coordinates of {showReport.name}.
                      </p>
                      <div className="mt-4 px-4 py-2 bg-neon-green text-black text-xs font-bold rounded-lg">
                        Simulating GPS Signal...
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="p-4 bg-blue-50 border-blue-100">
                    <p className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Total Fuel Cost</p>
                    <p className="text-xl font-bold text-zinc-900">₹{showReport.total_fuel_cost.toLocaleString()}</p>
                  </Card>
                  <Card className="p-4 bg-rose-50 border-rose-100">
                    <p className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">Maintenance Cost</p>
                    <p className="text-xl font-bold text-zinc-900">₹{showReport.total_maintenance_cost.toLocaleString()}</p>
                  </Card>
                  <Card className="p-4 bg-emerald-50 border-emerald-100">
                    <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Estimated Revenue</p>
                    <p className="text-xl font-bold text-zinc-900">₹{(showReport.total_operational_cost * 2.5).toLocaleString()}</p>
                  </Card>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-zinc-900">Performance Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border border-zinc-200 bg-zinc-50 rounded-xl">
                      <p className="text-xs text-zinc-500">Utilization Rate</p>
                      <p className="text-lg font-bold">84%</p>
                    </div>
                    <div className="p-4 border border-zinc-200 bg-zinc-50 rounded-xl">
                      <p className="text-xs text-zinc-500">Avg. Cost per KM</p>
                      <p className="text-lg font-bold">₹12.40</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-zinc-200 bg-zinc-50 flex justify-end gap-3">
                <button onClick={() => setShowReport(null)} className="px-6 py-2 border border-zinc-200 text-zinc-500 rounded-lg font-bold hover:bg-zinc-100 transition-all">
                  Close
                </button>
                <button 
                  onClick={() => alert("Report PDF is being prepared for download...")}
                  className="px-6 py-2 bg-neon-green text-black rounded-lg font-bold hover:brightness-110 transition-all shadow-lg shadow-neon-green/10"
                >
                  Download PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
