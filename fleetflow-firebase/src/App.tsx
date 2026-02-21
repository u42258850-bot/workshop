import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Truck,
  Users,
  MapPin,
  Wrench,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Receipt,
  Gauge,
  Loader2,
  Database,
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
} from 'recharts';

// ── Firebase imports ──────────────────────────────────────────
import { signIn, register, logout, listenAuth, FleetUser, UserRole } from './firebase/auth';
import { listenVehicles, addVehicle, updateVehicle, Vehicle, VehicleStatus } from './firebase/vehicles';
import { listenDrivers, Driver } from './firebase/drivers';
import { listenTrips, createTrip, completeTrip, cancelTrip, Trip } from './firebase/trips';
import { listenMaintenanceLogs, createMaintenanceLog, updateMaintenanceStatus, MaintenanceLog } from './firebase/maintenance';
import { listenExpenses, logExpense, ExpenseRecord } from './firebase/expenses';
import { getDashboardStats, getFinancialSummary, DashboardStats, FinancialSummary } from './firebase/analytics';
import { seedDatabase } from './firebase/seed';

// ── UI Components (keep original) ────────────────────────────
import { Card, CardHeader, CardContent, Badge } from './components/UI';

// ─────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Available': return <Badge variant="success">Available</Badge>;
    case 'In Shop': return <Badge variant="warning">In Shop</Badge>;
    case 'On Trip': return <Badge variant="info">On Trip</Badge>;
    case 'Out of Service': return <Badge variant="error">Retired</Badge>;
    case 'Dispatched': return <Badge variant="info">Dispatched</Badge>;
    case 'Completed': return <Badge variant="success">Completed</Badge>;
    case 'Cancelled': return <Badge variant="error">Cancelled</Badge>;
    case 'Pending': return <Badge variant="warning">Pending</Badge>;
    case 'In Progress': return <Badge variant="info">In Progress</Badge>;
    default: return <Badge>{status}</Badge>;
  }
};

// ─────────────────────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────────────────────

const Login = ({ onLogin }: { onLogin: (user: FleetUser) => void }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('manager@fleetflow.in');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('Fleet Manager');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const roles: UserRole[] = ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isRegistering) {
      if (!name.trim()) { setError('Full name is required.'); setLoading(false); return; }
      const result = await register(name, email, password, role);
      if (result.success && result.user) {
        onLogin(result.user);
      } else {
        setError(result.error || 'Registration failed.');
      }
    } else {
      const result = await signIn(email, password);
      if (result.success && result.user) {
        onLogin(result.user);
      } else {
        setError(result.error || 'Sign in failed.');
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email first.'); return; }
    const { forgotPassword } = await import('./firebase/auth');
    const result = await forgotPassword(email);
    if (result.success) {
      setResetSent(true);
      setError('');
    } else {
      setError(result.error || 'Failed to send reset email.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-900 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
            <Truck className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 italic">FleetFlow India</h1>
          <p className="text-slate-500 font-medium">Smart Logistics for the Indian Subcontinent</p>
        </div>

        <Card className="p-8 border-slate-200">
          <div className="flex border-b border-slate-100 mb-6">
            <button onClick={() => { setIsRegistering(false); setError(''); }}
              className={`flex-1 pb-3 text-sm font-bold transition-all ${!isRegistering ? 'text-blue-900 border-b-2 border-orange-500' : 'text-slate-400'}`}>
              Sign In
            </button>
            <button onClick={() => { setIsRegistering(true); setError(''); }}
              className={`flex-1 pb-3 text-sm font-bold transition-all ${isRegistering ? 'text-blue-900 border-b-2 border-orange-500' : 'text-slate-400'}`}>
              Register
            </button>
          </div>

          {error && <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-sm rounded-lg border border-rose-200">{error}</div>}
          {resetSent && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-200">✅ Password reset email sent! Check your inbox.</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-900"
                  placeholder="e.g. Rahul Sharma" required />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-900"
                placeholder="name@company.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-900"
                placeholder="••••••••" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Role</label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => (
                  <button key={r} type="button" onClick={() => setRole(r)}
                    className={`px-3 py-2 rounded-lg border text-[10px] font-bold transition-all uppercase tracking-wider ${role === r ? 'bg-blue-900 border-blue-800 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-900 text-white font-semibold py-3 rounded-lg hover:bg-blue-800 transition-all shadow-md mt-4 flex items-center justify-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isRegistering ? 'Create Account' : 'Sign In'}
            </button>
            {!isRegistering && (
              <div className="text-center">
                <button type="button" onClick={handleForgotPassword}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors">
                  Forgot Password?
                </button>
              </div>
            )}
          </form>
        </Card>
        <p className="text-center mt-8 text-slate-400 text-sm">© 2026 FleetFlow Logistics Systems. All rights reserved.</p>
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────

const Sidebar = ({ activeTab, setActiveTab, user, onLogout }: {
  activeTab: string; setActiveTab: (t: string) => void; user: FleetUser; onLogout: () => void;
}) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'] },
    { id: 'vehicles', icon: Truck, label: 'Vehicle Registry', roles: ['Fleet Manager', 'Dispatcher'] },
    { id: 'trips', icon: MapPin, label: 'Trip Dispatcher', roles: ['Fleet Manager', 'Dispatcher'] },
    { id: 'maintenance', icon: Wrench, label: 'Maintenance', roles: ['Fleet Manager', 'Dispatcher'] },
    { id: 'expenses', icon: Receipt, label: 'Trip & Expense', roles: ['Fleet Manager', 'Financial Analyst'] },
    { id: 'performance', icon: Gauge, label: 'Performance', roles: ['Fleet Manager', 'Safety Officer'] },
    { id: 'analytics', icon: BarChart3, label: 'Analytics', roles: ['Fleet Manager', 'Financial Analyst'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-screen flex flex-col sticky top-0 shadow-sm">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center shadow-md">
            <Truck className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-blue-900">FleetFlow</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredItems.map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === item.id ? 'bg-blue-900 text-white font-medium shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-900'}`}>
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="mb-4 px-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Current Session</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
            <span className="text-xs text-slate-600 font-medium">{user.role}</span>
          </div>
        </div>
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all">
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────────────────────

const Header = ({ title, user }: { title: string; user: FleetUser }) => (
  <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
    <h1 className="text-lg font-bold text-slate-900">{title}</h1>
    <div className="flex items-center gap-4">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder="Search fleet..."
          className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm text-slate-700 focus:ring-2 focus:ring-blue-900 w-64 outline-none" />
      </div>
      <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-white"></span>
      </button>
      <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-slate-900">{user.name}</p>
          <p className="text-[10px] text-blue-700 font-bold">{user.role}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-white font-bold text-xs shadow-sm">
          {user.avatar}
        </div>
      </div>
    </div>
  </header>
);

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────

const Dashboard = ({ setActiveTab }: { setActiveTab: (t: string) => void }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [groupBy, setGroupBy] = useState('none');
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  useEffect(() => {
    getDashboardStats().then(setStats);
    const unsub = listenVehicles(setVehicles);
    return unsub;
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    const result = await seedDatabase();
    setSeedMsg(result.message);
    if (result.success) getDashboardStats().then(setStats);
    setSeeding(false);
    setTimeout(() => setSeedMsg(''), 5000);
  };

  if (!stats) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
    </div>
  );

  const kpis = [
    { label: 'Active Fleet', value: stats.activeFleet, sub: 'Vehicles on trip', icon: Truck, color: 'text-blue-700', bg: 'bg-blue-50' },
    { label: 'Maintenance', value: stats.maintenanceAlerts, sub: 'Vehicles in shop', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Utilization', value: `${stats.utilizationRate}%`, sub: 'Fleet assigned', icon: BarChart3, color: 'text-blue-700', bg: 'bg-blue-50' },
    { label: 'Pending Cargo', value: stats.pendingCargo, sub: 'Waiting assignment', icon: Clock, color: 'text-slate-600', bg: 'bg-slate-100' },
  ];

  const filteredVehicles = vehicles
    .filter(v =>
      (v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.license_plate.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (filterStatus === 'All' || v.status === filterStatus)
    )
    .sort((a, b) => sortBy === 'name' ? a.name.localeCompare(b.name) : b.max_load - a.max_load);

  return (
    <div className="space-y-6">
      {seedMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-200">{seedMsg}</div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Quick Actions</h2>
        <div className="flex gap-3">
          <button onClick={handleSeed} disabled={seeding}
            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-200 transition-all text-sm border border-slate-200 disabled:opacity-60">
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            Seed Demo Data
          </button>
          <button onClick={() => setActiveTab('trips')}
            className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800 transition-all shadow-md">
            <Plus className="w-4 h-4" /> New Trip
          </button>
          <button onClick={() => setActiveTab('vehicles')}
            className="bg-white text-blue-900 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50 transition-all border border-slate-200 shadow-sm">
            <Plus className="w-4 h-4" /> New Vehicle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className={`w-12 h-12 ${kpi.bg} rounded-xl flex items-center justify-center border border-slate-100`}>
                  <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">{kpi.label}</p>
                  <h3 className="text-2xl font-bold text-slate-900">{kpi.value}</h3>
                  <p className="text-xs text-slate-400">{kpi.sub}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { label: 'Total Revenue', value: `₹${(stats.totalRevenue / 100000).toFixed(1)}L`, icon: ArrowUpRight, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: 'Current Month' },
          { label: 'Fuel Spend', value: `₹${(stats.fuelSpend / 100000).toFixed(1)}L`, icon: ArrowDownRight, color: 'text-rose-600', bg: 'bg-rose-50', sub: 'Current Month' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + i * 0.1 }}>
            <Card className="bg-gradient-to-br from-white to-slate-50 border-blue-100">
              <CardContent className="flex items-center justify-between py-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 ${stat.bg} rounded-full flex items-center justify-center`}>
                    <stat.icon className={`w-7 h-7 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                    <h3 className="text-3xl font-bold text-slate-900">{stat.value}</h3>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">{stat.sub}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-bold text-slate-900">Fleet Overview (Live)</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search fleet..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:ring-1 focus:ring-blue-900 outline-none w-48" />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-lg px-3 py-1.5 outline-none">
              <option value="All">All Status</option>
              <option value="Available">Available</option>
              <option value="On Trip">On Trip</option>
              <option value="In Shop">In Shop</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-lg px-3 py-1.5 outline-none">
              <option value="name">Sort by Name</option>
              <option value="load">Sort by Load</option>
            </select>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-wider">Region</th>
                <th className="px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{v.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">{v.license_plate}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{v.type}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{v.region}</td>
                  <td className="px-6 py-4">{getStatusBadge(v.status)}</td>
                </tr>
              ))}
              {filteredVehicles.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm">No vehicles found. Add vehicles or seed demo data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// VEHICLE REGISTRY
// ─────────────────────────────────────────────────────────────

const VehicleRegistry = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    license_plate: '', max_load: '', odometer: '', type: 'Truck', name: '', region: 'North'
  });

  useEffect(() => {
    const unsub = listenVehicles(setVehicles);
    return unsub;
  }, []);

  const openAdd = () => { setEditingVehicle(null); setFormData({ license_plate: '', max_load: '', odometer: '', type: 'Truck', name: '', region: 'North' }); setError(''); setIsModalOpen(true); };
  const openEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormData({ license_plate: v.license_plate, max_load: String(v.max_load), odometer: String(v.odometer), type: v.type, name: v.name, region: v.region });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      ...formData,
      max_load: parseInt(formData.max_load),
      odometer: parseInt(formData.odometer),
      type: formData.type as any,
      status: 'Available' as VehicleStatus,
    };

    let result;
    if (editingVehicle) {
      result = await updateVehicle(editingVehicle.id, payload);
    } else {
      result = await addVehicle(payload);
    }

    if (result.success) {
      setIsModalOpen(false);
    } else {
      setError(result.error || 'Operation failed.');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Vehicle Registry</h2>
          <p className="text-slate-500">Manage your physical assets and fleet health.</p>
        </div>
        <button onClick={openAdd} className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800 transition-all shadow-md">
          <Plus className="w-4 h-4" /> Add Vehicle
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-slate-900">{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
            {error && <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-sm rounded-lg border border-rose-200">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Model Name</label>
                  <input required type="text" placeholder="e.g. Tata Prima"
                    className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-900 p-2"
                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">License Plate</label>
                  <input required type="text" placeholder="MH-12-AB-1234"
                    className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-900 p-2"
                    value={formData.license_plate} onChange={e => setFormData({ ...formData, license_plate: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Payload (kg)</label>
                  <input required type="number" className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-900 p-2"
                    value={formData.max_load} onChange={e => setFormData({ ...formData, max_load: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Odometer (km)</label>
                  <input required type="number" className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-900 p-2"
                    value={formData.odometer} onChange={e => setFormData({ ...formData, odometer: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Type</label>
                  <select className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-900 p-2"
                    value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                    <option value="Truck">Truck</option><option value="Van">Van</option><option value="Bike">Bike</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Region</label>
                  <select className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-900 p-2"
                    value={formData.region} onChange={e => setFormData({ ...formData, region: e.target.value })}>
                    <option>North</option><option>South</option><option>East</option><option>West</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingVehicle ? 'Update' : 'Register'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {['Vehicle', 'License Plate', 'Type', 'Region', 'Max Load', 'Status', 'Actions'].map(h => (
                  <th key={h} className={`px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-700 border border-blue-100"><Truck className="w-5 h-5" /></div>
                      <span className="font-bold text-slate-900">{v.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-slate-500">{v.license_plate}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{v.type}</td>
                  <td className="px-6 py-4"><Badge variant="default">{v.region}</Badge></td>
                  <td className="px-6 py-4 text-sm text-slate-600">{v.max_load.toLocaleString()} kg</td>
                  <td className="px-6 py-4">{getStatusBadge(v.status)}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(v)} className="text-slate-400 hover:text-blue-900 font-bold text-sm transition-colors">Edit</button>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400 text-sm">No vehicles yet. Click "Add Vehicle" or seed demo data from Dashboard.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// TRIP DISPATCHER
// ─────────────────────────────────────────────────────────────

const TripDispatcher = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ vehicle_id: '', driver_id: '', cargo_weight: '', origin: '', destination: '', estimated_fuel_cost: '' });

  useEffect(() => {
    const u1 = listenTrips(setTrips);
    const u2 = listenVehicles(setVehicles);
    const u3 = listenDrivers(setDrivers);
    return () => { u1(); u2(); u3(); };
  }, []);

  const availableVehicles = vehicles.filter(v => v.status === 'Available');
  const availableDrivers = drivers.filter(d => d.status === 'Off Duty');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await createTrip({
      vehicle_id: formData.vehicle_id,
      driver_id: formData.driver_id,
      cargo_weight: parseFloat(formData.cargo_weight),
      origin: formData.origin,
      destination: formData.destination,
      estimated_fuel_cost: parseFloat(formData.estimated_fuel_cost),
    });
    if (result.success) {
      setIsModalOpen(false);
      setFormData({ vehicle_id: '', driver_id: '', cargo_weight: '', origin: '', destination: '', estimated_fuel_cost: '' });
    } else {
      setError(result.error || 'Dispatch failed.');
    }
    setLoading(false);
  };

  const handleComplete = async (id: string) => {
    if (!confirm('Mark this trip as Completed?')) return;
    await completeTrip(id);
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this trip?')) return;
    await cancelTrip(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Trip Dispatcher</h2>
          <p className="text-slate-500">Assign vehicles and drivers to new delivery routes.</p>
        </div>
        <button onClick={() => { setIsModalOpen(true); setError(''); }}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800 transition-all shadow-md">
          <Plus className="w-4 h-4" /> Create Trip
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-slate-900">New Trip Dispatch</h3>
            {error && <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-sm rounded-lg border border-rose-200">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle ({availableVehicles.length} available)</label>
                <select required className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-900 p-2"
                  value={formData.vehicle_id} onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}>
                  <option value="">Select Available Vehicle</option>
                  {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.name} (max {v.max_load.toLocaleString()}kg)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Driver ({availableDrivers.length} available)</label>
                <select required className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-900 p-2"
                  value={formData.driver_id} onChange={e => setFormData({ ...formData, driver_id: e.target.value })}>
                  <option value="">Select Available Driver</option>
                  {availableDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cargo Weight (kg)</label>
                <input required type="number" className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-900 p-2"
                  value={formData.cargo_weight} onChange={e => setFormData({ ...formData, cargo_weight: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Origin</label>
                  <input required type="text" placeholder="City / Address"
                    className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-900 p-2"
                    value={formData.origin} onChange={e => setFormData({ ...formData, origin: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
                  <input required type="text" placeholder="City / Address"
                    className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-900 p-2"
                    value={formData.destination} onChange={e => setFormData({ ...formData, destination: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Fuel Cost (₹)</label>
                <input required type="number" className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-900 p-2"
                  value={formData.estimated_fuel_cost} onChange={e => setFormData({ ...formData, estimated_fuel_cost: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 shadow-md flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />} Dispatch
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-900 text-white border-none shadow-lg">
          <CardContent className="flex items-center justify-between">
            <div><p className="text-blue-100 text-sm">Available Fleet</p><h3 className="text-3xl font-bold">{availableVehicles.length}</h3></div>
            <Truck className="w-10 h-10 text-blue-300 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-orange-500 text-white border-none shadow-lg">
          <CardContent className="flex items-center justify-between">
            <div><p className="text-orange-50 text-sm">Ready Drivers</p><h3 className="text-3xl font-bold">{availableDrivers.length}</h3></div>
            <Users className="w-10 h-10 text-orange-200 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-slate-800 text-white border-none shadow-lg">
          <CardContent className="flex items-center justify-between">
            <div><p className="text-slate-300 text-sm">Active Trips</p><h3 className="text-3xl font-bold">{trips.filter(t => t.status === 'Dispatched').length}</h3></div>
            <MapPin className="w-10 h-10 text-slate-500 opacity-50" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {['Trip ID', 'Route', 'Vehicle', 'Driver', 'Load', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trips.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm text-slate-500">#{t.id.slice(-6).toUpperCase()}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{t.origin}</span>
                      <span className="text-xs text-slate-500">to {t.destination}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">{t.vehicle_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">{t.driver_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{t.cargo_weight.toLocaleString()} kg</td>
                  <td className="px-6 py-4">{getStatusBadge(t.status)}</td>
                  <td className="px-6 py-4">
                    {t.status === 'Dispatched' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleComplete(t.id)} className="text-xs text-emerald-600 hover:text-emerald-700 font-bold border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-50 transition-colors">✓ Complete</button>
                        <button onClick={() => handleCancel(t.id)} className="text-xs text-rose-500 hover:text-rose-600 font-bold border border-rose-200 px-2 py-1 rounded hover:bg-rose-50 transition-colors">✕ Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {trips.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400 text-sm">No trips yet. Create your first dispatch.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MAINTENANCE
// ─────────────────────────────────────────────────────────────

const Maintenance = () => {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ vehicle_id: '', vehicle_name: '', description: '', date: '' });

  useEffect(() => {
    const u1 = listenMaintenanceLogs(setLogs);
    const u2 = listenVehicles(setVehicles);
    return () => { u1(); u2(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const selectedVehicle = vehicles.find(v => v.id === formData.vehicle_id);
    await createMaintenanceLog({ ...formData, vehicle_name: selectedVehicle?.name || '' });
    setIsModalOpen(false);
    setFormData({ vehicle_id: '', vehicle_name: '', description: '', date: '' });
    setLoading(false);
  };

  const handleStatusUpdate = async (log: MaintenanceLog, newStatus: any) => {
    await updateMaintenanceStatus(log.id, newStatus, log.vehicle_id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Maintenance</h2>
          <p className="text-slate-500">Track and schedule vehicle service logs.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800 transition-all shadow-md">
          <Plus className="w-4 h-4" /> Create New Service
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-slate-900">Schedule Service</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle</label>
                <select required className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-900 p-2"
                  value={formData.vehicle_id} onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}>
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Issue / Service Description</label>
                <textarea required rows={3}
                  className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-900 p-3"
                  value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input required type="date" className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-900 p-2"
                  value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 shadow-md flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />} Schedule
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {['Vehicle', 'Issue/Service', 'Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className={`px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-wider ${h === 'Status' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{log.vehicle_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{log.description}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{log.date}</td>
                  <td className="px-6 py-4 text-right">{getStatusBadge(log.status)}</td>
                  <td className="px-6 py-4">
                    {log.status === 'Pending' && (
                      <button onClick={() => handleStatusUpdate(log, 'In Progress')} className="text-xs text-blue-600 hover:text-blue-700 font-bold border border-blue-200 px-2 py-1 rounded hover:bg-blue-50 transition-colors">Start</button>
                    )}
                    {log.status === 'In Progress' && (
                      <button onClick={() => handleStatusUpdate(log, 'Completed')} className="text-xs text-emerald-600 font-bold border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-50 transition-colors">Complete</button>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">No maintenance logs yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// TRIP EXPENSES
// ─────────────────────────────────────────────────────────────

const TripExpenses = () => {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ trip_id: '', driver_name: '', fuel_cost: '', misc_expense: '' });

  useEffect(() => {
    const u1 = listenExpenses(setExpenses);
    const u2 = listenTrips(setTrips);
    return () => { u1(); u2(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await logExpense({
      trip_id: formData.trip_id,
      driver_name: formData.driver_name,
      fuel_cost: parseFloat(formData.fuel_cost),
      misc_expense: parseFloat(formData.misc_expense),
      date: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(false);
    setFormData({ trip_id: '', driver_name: '', fuel_cost: '', misc_expense: '' });
    setLoading(false);
  };

  const totalFuel = expenses.reduce((s, e) => s + e.fuel_cost, 0);
  const totalMisc = expenses.reduce((s, e) => s + e.misc_expense, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Trip & Expense</h2>
          <p className="text-slate-500">Monitor fuel and miscellaneous costs per trip.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800 transition-all shadow-md">
          <Plus className="w-4 h-4" /> Log Expense
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="flex items-center gap-3"><Receipt className="w-8 h-8 text-orange-500" /><div><p className="text-xs text-slate-400">Total Fuel</p><p className="text-xl font-bold text-slate-900">₹{totalFuel.toLocaleString()}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3"><Receipt className="w-8 h-8 text-blue-500" /><div><p className="text-xs text-slate-400">Total Misc</p><p className="text-xl font-bold text-slate-900">₹{totalMisc.toLocaleString()}</p></div></CardContent></Card>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-slate-900">Log Trip Expense</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Trip</label>
                <select required className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-900 p-2"
                  value={formData.trip_id} onChange={e => {
                    const trip = trips.find(t => t.id === e.target.value);
                    setFormData({ ...formData, trip_id: e.target.value, driver_name: trip?.driver_name || '' });
                  }}>
                  <option value="">Select Trip</option>
                  {trips.map(t => <option key={t.id} value={t.id}>#{t.id.slice(-6).toUpperCase()} – {t.origin} → {t.destination}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Driver</label>
                <input readOnly type="text" className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-sm outline-none p-2" value={formData.driver_name} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fuel Cost (₹)</label>
                  <input required type="number" className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-900 p-2"
                    value={formData.fuel_cost} onChange={e => setFormData({ ...formData, fuel_cost: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Misc Expense (₹)</label>
                  <input required type="number" className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-900 p-2"
                    value={formData.misc_expense} onChange={e => setFormData({ ...formData, misc_expense: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 shadow-md flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />} Log Expense
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {['Trip ID', 'Driver', 'Fuel Cost', 'Misc Expense', 'Date'].map((h, i) => (
                  <th key={h} className={`px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-wider ${i === 4 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-slate-500">#{exp.trip_id.slice(-6).toUpperCase()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{exp.driver_name}</td>
                  <td className="px-6 py-4 text-sm text-blue-700 font-medium">₹{exp.fuel_cost.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-orange-600 font-medium">₹{exp.misc_expense.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-400 text-right">{exp.date}</td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">No expenses logged yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PERFORMANCE
// ─────────────────────────────────────────────────────────────

const Performance = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    const unsub = listenDrivers(setDrivers);
    return unsub;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Performance</h2>
        <p className="text-slate-500">Driver safety scores and operational metrics.</p>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {['Name', 'License', 'Expiry', 'Completion Rate', 'Safety Score', 'Complaints'].map(h => (
                  <th key={h} className={`px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-wider ${h === 'Complaints' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{d.name}</td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-500">{d.license_number}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{d.license_expiry}</td>
                  <td className="px-6 py-4 text-sm text-blue-700 font-bold">{d.completion_rate}%</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-900" style={{ width: `${d.safety_score}%` }}></div>
                      </div>
                      <span className="text-xs font-bold text-blue-900">{d.safety_score}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Badge variant={d.complaints === 0 ? 'success' : 'error'}>{d.complaints}</Badge>
                  </td>
                </tr>
              ))}
              {drivers.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-sm">No drivers found. Seed demo data from Dashboard.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────

const Analytics = () => {
  const [summary, setSummary] = useState<FinancialSummary[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    getFinancialSummary().then(setSummary);
    getDashboardStats().then(setStats);
  }, []);

  if (!stats) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-900" /></div>;

  const metrics = [
    { label: 'Total Fuel Cost', value: `₹${(stats.fuelSpend / 100000).toFixed(1)}L`, icon: Receipt, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Fleet ROI', value: '18.4%', icon: ArrowUpRight, color: 'text-blue-700', bg: 'bg-blue-50' },
    { label: 'Utilization Rate', value: `${stats.utilizationRate}%`, icon: Gauge, color: 'text-slate-600', bg: 'bg-slate-100' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
        <p className="text-slate-500">Financial performance and operational efficiency.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="flex items-center gap-4">
              <div className={`w-12 h-12 ${m.bg} rounded-xl flex items-center justify-center`}><m.icon className={`w-6 h-6 ${m.color}`} /></div>
              <div><p className="text-sm text-slate-500 font-medium">{m.label}</p><h3 className="text-2xl font-bold text-slate-900">{m.value}</h3></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h3 className="font-bold text-slate-900">Revenue vs Profit</h3></CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                  <Bar dataKey="revenue" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="net_profit" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><h3 className="font-bold text-slate-900">Fuel Cost Trend</h3></CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="fuel_cost" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><h3 className="font-bold text-slate-900">Financial Summary</h3></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {['Month', 'Revenue', 'Fuel Cost', 'Maintenance', 'Net Profit'].map((h, i) => (
                  <th key={h} className={`px-6 py-4 text-xs font-bold text-blue-900 uppercase tracking-wider ${i === 4 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.map((row) => (
                <tr key={row.month} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{row.month}</td>
                  <td className="px-6 py-4 text-sm text-blue-700 font-medium">₹{row.revenue.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-rose-600">₹{row.fuel_cost.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-orange-600">₹{row.maintenance.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-bold text-right">₹{row.net_profit.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState<FleetUser | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = listenAuth((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-blue-900 rounded-2xl flex items-center justify-center shadow-lg">
            <Truck className="text-white w-6 h-6" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-blue-900" />
        </div>
      </div>
    );
  }

  if (!user) return <Login onLogin={setUser} />;

  const tabTitle: Record<string, string> = {
    dashboard: 'Dashboard', vehicles: 'Vehicle Registry', trips: 'Trip Dispatcher',
    maintenance: 'Maintenance', expenses: 'Trip & Expense', performance: 'Performance', analytics: 'Analytics',
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard setActiveTab={setActiveTab} />;
      case 'vehicles': return <VehicleRegistry />;
      case 'trips': return <TripDispatcher />;
      case 'maintenance': return <Maintenance />;
      case 'expenses': return <TripExpenses />;
      case 'performance': return <Performance />;
      case 'analytics': return <Analytics />;
      default: return <div className="flex flex-col items-center justify-center h-64 text-slate-400"><Settings className="w-12 h-12 mb-4 opacity-20" /><p>Module under development</p></div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} />
      <main className="flex-1 flex flex-col min-w-0">
        <Header title={tabTitle[activeTab] || activeTab} user={user} />
        <div className="p-8 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
