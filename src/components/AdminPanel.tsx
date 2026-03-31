import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, ClipboardList, Package, Users, Zap, MessageSquare, Settings,
  Search, ArrowLeft, DollarSign, TrendingUp, Filter, Download, Box, Edit2, Trash2,
  CheckCircle, X, Plus
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  deleteDoc, 
  updateDoc, 
  addDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError } from '../lib/error-handling';
import { OperationType } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend, LineChart, Line
} from 'recharts';

interface AdminPanelProps {
  onBack: () => void;
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const { isAdmin, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'users' | 'services' | 'messages' | 'settings'>('dashboard');
  const [items, setItems] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [topProductsData, setTopProductsData] = useState<any[]>([]);
  const [demographicsData, setDemographicsData] = useState<any[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);
  const [monthlySalesData, setMonthlySalesData] = useState<any[]>([]);
  const [customerGrowthData, setCustomerGrowthData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    activeServices: 0,
    growth: 0
  });
  const [recentData, setRecentData] = useState<{
    orders: any[],
    products: any[],
    customers: any[]
  }>({ orders: [], products: [], customers: [] });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');

  useEffect(() => {
    if (editItem) {
      setPhotoUrl(editItem.photoUrl || '');
    } else {
      setPhotoUrl('');
    }
  }, [editItem, showAddModal]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!storage) {
      alert("Firebase Storage is not available. Please check your configuration.");
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPhotoUrl(url);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const searchStr = searchTerm.toLowerCase();
    return (
      (item.name || '').toLowerCase().includes(searchStr) ||
      (item.title || '').toLowerCase().includes(searchStr) ||
      (item.displayName || '').toLowerCase().includes(searchStr) ||
      (item.email || '').toLowerCase().includes(searchStr) ||
      (item.subject || '').toLowerCase().includes(searchStr) ||
      (item.id || '').toLowerCase().includes(searchStr)
    );
  });

  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchStats = async () => {
      if (activeTab !== 'dashboard') return;
      
      try {
        const [productsSnap, ordersSnap, usersSnap, servicesSnap] = await Promise.all([
          getDocs(collection(db, 'products')),
          getDocs(collection(db, 'orders')),
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'services'))
        ]);
        
        let sales = 0;
        ordersSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.status === 'completed') {
            sales += data.total || 0;
          }
        });

        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().split('T')[0];
        }).reverse();

        const dailyRevenue = last7Days.map(date => {
          let daySales = 0;
          let dayOrders = 0;
          ordersSnap.docs.forEach(doc => {
            const orderData = doc.data();
            const orderDate = orderData.createdAt?.toDate?.()?.toISOString().split('T')[0];
            if (orderDate === date && orderData.status === 'completed') {
              daySales += orderData.total || 0;
              dayOrders += 1;
            }
          });
          return { name: date.split('-').slice(1).join('/'), sales: daySales, orders: dayOrders };
        });
        setChartData(dailyRevenue);

        const productSales: Record<string, { name: string, count: number, revenue: number }> = {};
        ordersSnap.docs.forEach(doc => {
          const order = doc.data();
          if (order.status === 'completed' && order.items) {
            order.items.forEach((item: any) => {
              const id = item.id || item.name;
              if (!productSales[id]) {
                productSales[id] = { name: item.name, count: 0, revenue: 0 };
              }
              productSales[id].count += (item.quantity || 1);
              productSales[id].revenue += (item.price || 0) * (item.quantity || 1);
            });
          }
        });
        const topProds = Object.values(productSales)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);
        setTopProductsData(topProds);

        const categoryStats: Record<string, number> = {};
        productsSnap.docs.forEach(doc => {
          const p = doc.data();
          if (p.category) {
            categoryStats[p.category] = (categoryStats[p.category] || 0) + 1;
          }
        });
        const demoData = Object.entries(categoryStats).map(([name, value]) => ({ name, value }));
        setDemographicsData(demoData);

        const statusStats: Record<string, number> = {};
        ordersSnap.docs.forEach(doc => {
          const status = doc.data().status || 'pending';
          statusStats[status] = (statusStats[status] || 0) + 1;
        });
        const statusData = Object.entries(statusStats).map(([name, value]) => ({ name, value }));
        setOrderStatusData(statusData);

        const last6Months = Array.from({ length: 6 }, (_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          return d.toLocaleString('default', { month: 'short' });
        }).reverse();

        const monthlySales = last6Months.map(month => {
          let monthTotal = 0;
          ordersSnap.docs.forEach(doc => {
            const orderData = doc.data();
            const orderMonth = orderData.createdAt?.toDate?.()?.toLocaleString('default', { month: 'short' });
            if (orderMonth === month && orderData.status === 'completed') {
              monthTotal += orderData.total || 0;
            }
          });
          return { name: month, sales: monthTotal };
        });
        setMonthlySalesData(monthlySales);

        const customerGrowth = last7Days.map(date => {
          let newUsers = 0;
          usersSnap.docs.forEach(doc => {
            const userData = doc.data();
            const userDate = userData.createdAt?.toDate?.()?.toISOString().split('T')[0];
            if (userDate === date) {
              newUsers += 1;
            }
          });
          return { name: date.split('-').slice(1).join('/'), users: newUsers };
        });
        setCustomerGrowthData(customerGrowth);

        setStats({
          totalSales: sales,
          totalOrders: ordersSnap.size,
          totalCustomers: usersSnap.size,
          activeServices: servicesSnap.size,
          growth: 0
        });

        setRecentData({
          orders: ordersSnap.docs.slice(0, 5).map(doc => ({ id: doc.id, ...doc.data() })),
          products: productsSnap.docs.slice(0, 5).map(doc => ({ id: doc.id, ...doc.data() })),
          customers: usersSnap.docs.slice(0, 5).map(doc => ({ id: doc.id, ...doc.data() }))
        });
      } catch (error) {
        console.error("Error fetching stats", error);
      }
    };
    fetchStats();

    if (activeTab !== 'dashboard' && activeTab !== 'settings') {
      const q = query(collection(db, activeTab), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, activeTab);
      });
      return () => unsubscribe();
    }
  }, [activeTab, isAdmin]);

  if (authLoading) return <div className="pt-32 text-center">Loading...</div>;
  if (!isAdmin) return <div className="pt-32 text-center text-red-500">Access Denied. Admin only.</div>;

  const handleDelete = async (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDoc(doc(db, activeTab, deleteConfirm));
      setDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${activeTab}/${deleteConfirm}`);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, activeTab, id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${activeTab}/${id}`);
    }
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'users', label: 'Customers', icon: Users },
    { id: 'services', label: 'Services', icon: Zap },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#050507]/90 backdrop-blur-3xl flex"
    >
      <div className="w-64 border-r border-white/10 bg-black/40 backdrop-blur-3xl flex flex-col">
        <div className="p-8 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center font-black text-white">S</div>
            <span className="font-black tracking-tighter text-xl">SCRIPT ADMIN</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === item.id ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={onBack} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-white/40 hover:bg-white/5 hover:text-white transition-all">
            <ArrowLeft className="w-5 h-5" /> Exit Admin
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-[#050507] to-[#0a0a0c]">
        <header className="h-20 border-b border-white/10 flex items-center justify-between px-12 sticky top-0 bg-[#050507]/80 backdrop-blur-md z-10">
          <h2 className="text-xl font-black uppercase tracking-widest">{activeTab}</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..." 
                className="bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-purple-500/50 w-64 transition-all" 
              />
            </div>
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
              <img src={auth.currentUser?.photoURL || ""} alt="" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        <main className="p-12 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'dashboard' && (
            <div className="space-y-12">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-3xl font-black tracking-tighter uppercase mb-2">Overview</h3>
                  <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Store performance for the last 30 days</p>
                </div>
                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-all">Today</button>
                  <button className="px-4 py-2 bg-purple-600 border border-purple-500/50 rounded-lg text-xs font-bold shadow-[0_0_15px_rgba(147,51,234,0.3)]">Last 30 Days</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Sales', value: `${stats.totalSales.toLocaleString()} EGP`, icon: DollarSign, color: 'text-green-400', growth: '+12%' },
                  { label: 'Total Orders', value: stats.totalOrders, icon: ClipboardList, color: 'text-blue-400', growth: '+5%' },
                  { label: 'Total Customers', value: stats.totalCustomers, icon: Users, color: 'text-purple-400', growth: '+8%' },
                  { label: 'Active Services', value: stats.activeServices, icon: Zap, color: 'text-yellow-400', growth: 'Stable' },
                ].map((stat, idx) => (
                  <div key={`stat-${stat.label || idx}-${idx}`} className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-xl group hover:border-white/20 transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-all">
                      <stat.icon size={80} />
                    </div>
                    <div className="flex justify-between items-start mb-6">
                      <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 ${stat.color}`}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                      <div className="text-[10px] font-black text-green-400 bg-green-400/10 px-2 py-1 rounded-md">{stat.growth}</div>
                    </div>
                    <div className="text-sm font-bold text-white/40 uppercase tracking-widest mb-2">{stat.label}</div>
                    <div className="text-3xl font-black tracking-tighter">{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl">
                  <div className="flex justify-between items-center mb-12">
                    <h3 className="text-xl font-black flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-purple-500" /> SALES REVENUE
                    </h3>
                    <div className="flex gap-4 text-[10px] font-bold text-white/40">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500" /> Revenue</div>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400" /> Orders</div>
                    </div>
                  </div>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0a0a0c', border: '1px solid #ffffff10', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff', fontSize: '12px' }}
                        />
                        <Area type="monotone" dataKey="sales" stroke="#9333ea" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
                        <Area type="monotone" dataKey="orders" stroke="#60a5fa" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl">
                  <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                    <Users className="w-5 h-5 text-purple-400" /> CUSTOMER GROWTH
                  </h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={customerGrowthData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0a0a0c', border: '1px solid #ffffff10', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff', fontSize: '12px' }}
                        />
                        <Line type="monotone" dataKey="users" stroke="#a855f7" strokeWidth={3} dot={{ fill: '#a855f7', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl">
                  <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                    <Package className="w-5 h-5 text-green-400" /> PRODUCT CATEGORIES
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={demographicsData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {demographicsData.map((entry, index) => (
                            <Cell key={`cell-demo-${index}`} fill={['#9333ea', '#60a5fa', '#fbbf24', '#34d399', '#f87171'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0a0a0c', border: '1px solid #ffffff10', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff', fontSize: '12px' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl">
                  <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 text-blue-400" /> ORDER STATUS
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={orderStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {orderStatusData.map((entry, index) => (
                            <Cell key={`cell-status-${index}`} fill={['#34d399', '#fbbf24', '#f87171', '#60a5fa'][index % 4]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0a0a0c', border: '1px solid #ffffff10', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff', fontSize: '12px' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl">
                  <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                    <Package className="w-5 h-5 text-yellow-500" /> TOP SELLING PRODUCTS
                  </h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProductsData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                        <XAxis type="number" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} width={100} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0a0a0c', border: '1px solid #ffffff10', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff', fontSize: '12px' }}
                        />
                        <Bar dataKey="revenue" fill="#9333ea" radius={[0, 10, 10, 0]} barSize={30}>
                          {topProductsData.map((entry, index) => (
                            <Cell key={`cell-bar-${index}`} fill={['#9333ea', '#60a5fa', '#fbbf24', '#34d399', '#f87171'][index % 5]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl">
                  <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-green-400" /> MONTHLY REVENUE
                  </h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlySalesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0a0a0c', border: '1px solid #ffffff10', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff', fontSize: '12px' }}
                        />
                        <Bar dataKey="sales" fill="#34d399" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl">
                  <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 text-blue-500" /> RECENT ORDERS
                  </h3>
                  <div className="space-y-4">
                    {recentData.orders.map((order: any, idx) => (
                      <div key={`recent-order-${order.id || idx}-${idx}`} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/20 transition-all cursor-pointer group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold group-hover:scale-110 transition-transform">#</div>
                          <div>
                            <div className="font-bold text-sm">Order #{order.id.substring(0, 8)}</div>
                            <div className="text-[10px] text-white/40 uppercase font-bold">Just now</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-sm">{order.total} EGP</div>
                          <div className="text-[10px] text-green-400 uppercase font-bold px-2 py-0.5 bg-green-400/10 rounded-md">{order.status}</div>
                        </div>
                      </div>
                    ))}
                    {recentData.orders.length === 0 && <div className="text-center py-8 text-white/20 font-bold uppercase tracking-widest text-xs">No recent orders</div>}
                  </div>
                  <button className="w-full mt-8 py-4 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all">View All Orders</button>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl">
                  <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                    <Zap className="w-5 h-5 text-yellow-400" /> AI INSIGHTS
                  </h3>
                  <div className="space-y-6">
                    <div className="p-6 bg-purple-600/10 border border-purple-500/20 rounded-2xl">
                      <div className="text-purple-400 text-[10px] font-black uppercase tracking-widest mb-2">Revenue Forecast</div>
                      <div className="text-lg font-bold mb-2">Expected +15% Growth</div>
                      <p className="text-xs text-white/40 leading-relaxed">Based on current trends, we expect a significant increase in sales over the next weekend.</p>
                    </div>
                    <div className="p-6 bg-blue-600/10 border border-blue-500/20 rounded-2xl">
                      <div className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-2">Inventory Alert</div>
                      <div className="text-lg font-bold mb-2">Low Stock Items</div>
                      <p className="text-xs text-white/40 leading-relaxed">3 products are currently low on stock. Consider restocking soon to avoid missed sales.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl">
                <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                  <Users className="w-5 h-5 text-green-400" /> RECENT CUSTOMERS
                </h3>
                <div className="space-y-6">
                  {recentData.customers.map((c: any, idx) => (
                    <div key={`recent-cust-${c.id || idx}-${idx}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center font-bold text-white uppercase">
                          {(c.displayName || c.name || 'U')[0]}
                        </div>
                        <div>
                          <div className="font-bold">{c.displayName || c.name || 'Unknown'}</div>
                          <div className="text-[10px] text-white/40 font-bold">{c.email}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-xs text-white/40 uppercase tracking-widest">{c.role || 'User'}</div>
                        <div className="text-[10px] text-white/20 uppercase font-bold">Customer</div>
                      </div>
                    </div>
                  ))}
                  {recentData.customers.length === 0 && <div className="text-center py-8 text-white/20 font-bold uppercase tracking-widest text-xs">No customers found</div>}
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'dashboard' && activeTab !== 'settings' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h3 className="text-3xl font-black tracking-tighter uppercase">{activeTab}</h3>
                  <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-white/40 border border-white/10">
                    {searchTerm ? `${filteredItems.length} of ${items.length}` : `${items.length}`} items
                  </span>
                </div>
                <div className="flex gap-3">
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
                    <Filter className="w-5 h-5 text-white/40" />
                  </button>
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
                    <Download className="w-5 h-5 text-white/40" />
                  </button>
                  {activeTab !== 'messages' && activeTab !== 'users' && activeTab !== 'orders' && (
                    <button 
                      onClick={() => setShowAddModal(true)}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)]"
                    >
                      <Plus className="w-5 h-5" /> Add New
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Name / Title</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Details</th>
                      {activeTab === 'products' && (
                        <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Stock</th>
                      )}
                      <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Status / Price</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, idx) => (
                      <tr key={`table-item-${activeTab}-${item.id || idx}-${idx}`} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                              {activeTab === 'products' ? <Box className="w-6 h-6 text-purple-400" /> : 
                               activeTab === 'services' ? <Zap className="w-6 h-6 text-yellow-400" /> :
                               activeTab === 'users' ? <Users className="w-6 h-6 text-blue-400" /> :
                               <MessageSquare className="w-6 h-6 text-green-400" />}
                            </div>
                            <div>
                              <div className="font-bold text-lg">{item.name || item.title || item.displayName || item.subject || (activeTab === 'orders' ? `Order #${item.id?.substring(0, 8)}` : 'Unnamed Item')}</div>
                              <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{String(item.id || '').substring(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="font-black text-white flex items-center gap-2">
                            {typeof item.price === 'number' ? `${item.price.toLocaleString()} EGP` : (typeof item.total === 'number' ? `${item.total.toLocaleString()} EGP` : (item.priceRange || 'Active'))}
                          </div>
                        </td>
                        {activeTab === 'products' && (
                          <td className="p-6">
                            <div className={`font-bold ${typeof item.stock === 'number' && item.stock < 10 ? 'text-orange-400' : 'text-white/60'}`}>
                              {typeof item.stock === 'number' ? item.stock : '0'}
                            </div>
                          </td>
                        )}
                        <td className="p-6">
                          <div className="flex items-center gap-2">
                            {item.status && (
                              <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase font-black ${
                                item.status === 'completed' ? 'bg-green-400/10 text-green-400' :
                                item.status === 'pending' ? 'bg-yellow-400/10 text-yellow-400' :
                                'bg-blue-400/10 text-blue-400'
                              }`}>
                                {item.status}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            {activeTab === 'orders' && item.status !== 'completed' && (
                              <button 
                                onClick={() => handleStatusUpdate(item.id, 'completed')}
                                className="p-3 bg-white/5 hover:bg-green-600/20 text-white/40 hover:text-green-400 rounded-xl border border-white/10 transition-all"
                                title="Mark as Completed"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {activeTab !== 'messages' && activeTab !== 'users' && activeTab !== 'orders' && (
                              <button 
                                onClick={() => { setEditItem(item); setShowAddModal(true); }}
                                className="p-3 bg-white/5 hover:bg-blue-600/20 text-white/40 hover:text-blue-400 rounded-xl border border-white/10 transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDelete(item.id)}
                              className="p-3 bg-white/5 hover:bg-red-600/20 text-white/40 hover:text-red-400 rounded-xl border border-white/10 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {items.length === 0 && (
                  <div className="p-20 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                      <Box className="w-10 h-10 text-white/20" />
                    </div>
                    <h4 className="text-xl font-bold text-white/40">No items found in {activeTab}</h4>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-8">
              <div className="bg-white/5 border border-white/10 p-10 rounded-[2.5rem] backdrop-blur-xl">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
                  <Settings className="w-6 h-6 text-purple-500" /> STORE SETTINGS
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Store Name</label>
                    <input placeholder="Enter store name" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-purple-500/50 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Support Email</label>
                    <input placeholder="Enter support email" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-purple-500/50 outline-none transition-all" />
                  </div>
                  <div className="pt-4">
                    <button 
                      onClick={() => {
                        alert("Settings saved successfully (Mock)");
                      }}
                      className="w-full py-5 bg-purple-600 hover:bg-purple-500 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-[0_0_30px_rgba(147,51,234,0.3)] cursor-pointer"
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-red-600/5 border border-red-600/20 p-10 rounded-[2.5rem] backdrop-blur-xl">
                <h3 className="text-xl font-black text-red-500 mb-6">DANGER ZONE</h3>
                <p className="text-sm text-white/40 mb-8">Deleting the store database is permanent and cannot be undone. Please proceed with extreme caution.</p>
                <button 
                  onClick={() => {
                    if (window.confirm("ARE YOU ABSOLUTELY SURE? This will permanently delete all store data. This action cannot be undone.")) {
                      alert("Database reset initiated (Mock)");
                    }
                  }}
                  className="px-8 py-4 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-2xl font-bold transition-all border border-red-600/20 cursor-pointer"
                >
                  Reset Store Database
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  </div>

      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6 mx-auto">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-white text-center mb-2">Confirm Delete</h3>
              <p className="text-white/60 text-center mb-8">
                Are you sure you want to delete this item? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 transition-all"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 transition-all"
                >
                  DELETE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0a0a0c] border border-white/10 p-8 rounded-3xl w-full max-w-xl shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold">{editItem ? 'Edit' : 'Add'} {activeTab.slice(0, -1)}</h3>
              <button onClick={() => { setShowAddModal(false); setEditItem(null); }}><X /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data: any = Object.fromEntries(formData.entries());
              if (data.price) data.price = Number(data.price);
              if (data.stock) data.stock = Number(data.stock);
              if (activeTab === 'products') data.photoUrl = photoUrl;
              data.createdAt = editItem?.createdAt || Timestamp.now();

              try {
                if (editItem) {
                  await updateDoc(doc(db, activeTab, editItem.id), data);
                } else {
                  await addDoc(collection(db, activeTab), data);
                }
                setShowAddModal(false);
                setEditItem(null);
                setPhotoUrl('');
              } catch (error) {
                handleFirestoreError(error, editItem ? OperationType.UPDATE : OperationType.CREATE, activeTab);
              }
            }} className="space-y-4">
              {activeTab === 'products' && (
                <>
                  <div className="flex items-center gap-6 mb-4">
                    <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden relative group">
                      {photoUrl ? (
                        <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Package className="w-8 h-8 text-white/20" />
                      )}
                      {uploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Product Photo</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileUpload}
                        className="block w-full text-xs text-white/40 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-purple-600/20 file:text-purple-400 hover:file:bg-purple-600/30 transition-all"
                      />
                    </div>
                  </div>
                  <input name="name" defaultValue={editItem?.name} placeholder="Product Name" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl" required />
                  <div className="grid grid-cols-2 gap-4">
                    <input name="category" defaultValue={editItem?.category} placeholder="Category" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl" required />
                    <input name="stock" type="number" defaultValue={editItem?.stock || 0} placeholder="Stock Quantity" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl" required />
                  </div>
                  <input name="price" type="number" defaultValue={editItem?.price} placeholder="Price (EGP)" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl" required />
                  <input name="iconName" defaultValue={editItem?.iconName} placeholder="Icon Name (cpu, gamepad, globe, zap)" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl" />
                  <textarea name="description" defaultValue={editItem?.description} placeholder="Description" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl" />
                </>
              )}
              {activeTab === 'services' && (
                <>
                  <input name="title" defaultValue={editItem?.title} placeholder="Service Title" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl" required />
                  <input name="iconName" defaultValue={editItem?.iconName} placeholder="Icon Name" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl" />
                  <input name="priceRange" defaultValue={editItem?.priceRange} placeholder="Price Range" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl" />
                  <textarea name="description" defaultValue={editItem?.description} placeholder="Description" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl" required />
                </>
              )}
              <button className="w-full py-4 bg-purple-600 rounded-xl font-bold">{editItem ? 'Update' : 'Create'}</button>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
