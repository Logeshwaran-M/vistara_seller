import React, { useEffect, useState } from "react";
import {
  FiUsers,
  FiShoppingBag,
  FiDollarSign,
  FiPackage,
  FiChevronRight,
  FiTrendingUp,
  FiTrendingDown,
  FiCalendar,
  FiClock,
  FiArrowUpRight,
  FiRefreshCw,
  FiFilter
} from "react-icons/fi";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [recentOrders, setRecentOrders] = useState([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
    salesGrowth: 12.5,
    orderGrowth: 8.2,
    userGrowth: 5.7,
    productGrowth: 3.4
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('today');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;
        if (!user) return;

        /* ================= ORDERS ================= */
        const ordersQuery = query(
          collection(db, "orders"),
          where("sellerId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(5)
        );

        const ordersSnap = await getDocs(ordersQuery);
        const orders = ordersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        /* ================= PRODUCTS ================= */
        const productsQuery = query(
          collection(db, "products"),
          where("sellerId", "==", user.uid)
        );
        const productsSnap = await getDocs(productsQuery);

        /* ================= USERS (CUSTOMERS) ================= */
        const uniqueCustomers = new Set(
          orders.map(o => o.customerId || o.customer)
        );

        /* ================= CALCULATIONS ================= */
        const totalSales = orders.reduce(
          (sum, o) => sum + Number(o.amount || 0),
          0
        );

        // Calculate daily/weekly/monthly stats
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        const recentOrdersThisWeek = orders.filter(order => {
          const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
          return orderDate >= weekAgo;
        });

        const recentOrdersThisMonth = orders.filter(order => {
          const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
          return orderDate >= monthAgo;
        });

        setStats({
          totalSales,
          totalOrders: orders.length,
          totalProducts: productsSnap.size,
          totalUsers: uniqueCustomers.size,
          salesGrowth: 12.5,
          orderGrowth: recentOrdersThisWeek.length > 0 ? Math.round((recentOrdersThisWeek.length / orders.length) * 100) : 0,
          userGrowth: 5.7,
          productGrowth: 3.4,
          weekOrders: recentOrdersThisWeek.length,
          monthOrders: recentOrdersThisMonth.length
        });

        setRecentOrders(orders.slice(0, 5));
      } catch (err) {
        console.error("Dashboard fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const statusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return "bg-gradient-to-r from-green-500 to-emerald-500";
      case "cancelled":
        return "bg-gradient-to-r from-red-500 to-pink-500";
      case "processing":
        return "bg-gradient-to-r from-blue-500 to-cyan-500";
      case "pending":
        return "bg-gradient-to-r from-yellow-500 to-amber-500";
      case "shipped":
        return "bg-gradient-to-r from-indigo-500 to-purple-500";
      default:
        return "bg-gradient-to-r from-gray-500 to-gray-600";
    }
  };

  const statusTextColor = (status) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return "text-green-100";
      case "cancelled":
        return "text-red-100";
      case "processing":
        return "text-blue-100";
      case "pending":
        return "text-yellow-100";
      case "shipped":
        return "text-indigo-100";
      default:
        return "text-gray-100";
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 md:ml-72 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-gray-200 rounded-full"></div>
            <div className="w-24 h-24 border-4 border-purple-500 border-t-transparent rounded-full absolute top-0 animate-spin"></div>
          </div>
          <p className="mt-6 text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 md:ml-72">
  <main className="pt-20 md:pt-28 p-4 md:p-12">

        {/* Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-6 md:mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 bg-clip-text text-transparent">
                Dashboard Overview
              </h1>
              <p className="text-sm sm:text-base text-gray-500 mt-2 flex items-center gap-2">
                <FiCalendar className="text-gray-400" />
                Welcome back! Here's what's happening today.
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 mt-2 md:mt-0">
              <button className="px-3 sm:px-4 py-2 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all flex items-center gap-2 text-xs sm:text-sm">
                <FiRefreshCw className="text-gray-500 text-sm sm:text-base" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <div className="flex items-center bg-white rounded-xl border border-gray-200 p-0.5 sm:p-1">
                {['today', 'week', 'month', 'year'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm capitalize transition-all ${
                      timeRange === range 
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {range === 'today' ? 'Today' : 
                     range === 'week' ? 'Week' : 
                     range === 'month' ? 'Month' : 'Year'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 md:mb-8">
          <StatCard
            icon={<FiDollarSign size={24} />}
            title="Total Sales"
            value={formatCurrency(stats.totalSales)}
            growth={stats.salesGrowth}
            color="from-green-500 to-emerald-500"
            subtitle="Revenue generated"
            delay={0}
          />
          <StatCard
            icon={<FiShoppingBag size={24} />}
            title="Total Orders"
            value={stats.totalOrders}
            growth={stats.orderGrowth}
            color="from-blue-500 to-cyan-500"
            subtitle="Orders placed"
            delay={0.1}
          />
          <StatCard
            icon={<FiPackage size={24} />}
            title="Products"
            value={stats.totalProducts}
            growth={stats.productGrowth}
            color="from-purple-500 to-pink-500"
            subtitle="Active listings"
            delay={0.2}
          />
          <StatCard
            icon={<FiUsers size={24} />}
            title="Customers"
            value={stats.totalUsers}
            growth={stats.userGrowth}
            color="from-orange-500 to-amber-500"
            subtitle="Total buyers"
            delay={0.3}
          />
        </div>

        {/* Recent Orders Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl md:rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
        >
          <div className="p-4 sm:p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
                <FiShoppingBag className="text-purple-500 text-lg sm:text-xl" />
                <span>Recent Orders</span>
                <span className="text-xs sm:text-sm font-normal text-gray-500 ml-2">
                  Last {recentOrders.length} transactions
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 flex items-center gap-2">
                <FiClock className="text-gray-400 text-xs sm:text-sm" />
                Updated just now
              </p>
            </div>
            <button className="px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 text-purple-600 rounded-xl border border-purple-100 hover:border-purple-200 hover:shadow-sm transition-all flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm font-medium">
              <FiFilter className="text-xs sm:text-sm" />
              <span>Filter Orders</span>
            </button>
          </div>

          {/* Mobile View */}
          <div className="block md:hidden">
            <div className="divide-y divide-gray-50">
              {recentOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-3 sm:p-4"
                >
                  <div className="flex justify-between items-start gap-2 mb-2 sm:mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{order.customer || "Customer"}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {order.orderId || `#ORD${order.id.slice(0, 8)}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-base sm:text-lg bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                        {formatCurrency(order.amount || 0)}
                      </p>
                      <span className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-white ${statusColor(order.status)}`}>
                        {order.status || "Pending"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1 sm:gap-2 truncate">
                      <FiPackage className="text-xs sm:text-sm flex-shrink-0" />
                      <span className="truncate">{order.product || "Product"}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1 text-xs flex-shrink-0">
                      <FiClock className="text-xs sm:text-sm" />
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <th className="px-6 lg:px-8 py-3 lg:py-4 text-left">
                    <div className="text-xs uppercase text-gray-500 font-bold tracking-wider">Order ID</div>
                  </th>
                  <th className="px-6 lg:px-8 py-3 lg:py-4 text-left">
                    <div className="text-xs uppercase text-gray-500 font-bold tracking-wider">Customer</div>
                  </th>
                  <th className="px-6 lg:px-8 py-3 lg:py-4 text-left">
                    <div className="text-xs uppercase text-gray-500 font-bold tracking-wider">Product</div>
                  </th>
                  <th className="px-6 lg:px-8 py-3 lg:py-4 text-left">
                    <div className="text-xs uppercase text-gray-500 font-bold tracking-wider">Date</div>
                  </th>
                  <th className="px-6 lg:px-8 py-3 lg:py-4 text-left">
                    <div className="text-xs uppercase text-gray-500 font-bold tracking-wider">Amount</div>
                  </th>
                  <th className="px-6 lg:px-8 py-3 lg:py-4 text-left">
                    <div className="text-xs uppercase text-gray-500 font-bold tracking-wider">Status</div>
                  </th>
                  <th className="px-6 lg:px-8 py-3 lg:py-4 text-left">
                    <div className="text-xs uppercase text-gray-500 font-bold tracking-wider">Action</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gradient-to-r hover:from-purple-50/30 hover:to-blue-50/30 group"
                  >
                    <td className="px-6 lg:px-8 py-4 lg:py-5">
                      <div className="font-bold text-gray-800 group-hover:text-purple-600 transition-colors text-sm lg:text-base">
                        {order.orderId || `#ORD${order.id.slice(0, 8)}`}
                      </div>
                    </td>
                    <td className="px-6 lg:px-8 py-4 lg:py-5">
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                          {(order.customer?.[0] || "C").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-800 text-sm lg:text-base truncate max-w-[120px] lg:max-w-[150px]">
                            {order.customer || "Customer"}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-[120px] lg:max-w-[150px]">
                            {order.email || "customer@email.com"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 lg:px-8 py-4 lg:py-5">
                      <div className="text-sm text-gray-700 truncate max-w-[120px] lg:max-w-[200px]">
                        {order.product || "Product Name"}
                      </div>
                    </td>
                    <td className="px-6 lg:px-8 py-4 lg:py-5">
                      <div className="text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 lg:px-8 py-4 lg:py-5">
                      <div className="font-bold text-base lg:text-lg bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                        {formatCurrency(order.amount || 0)}
                      </div>
                    </td>
                    <td className="px-6 lg:px-8 py-4 lg:py-5">
                      <div className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs font-bold text-center ${statusTextColor(order.status)} ${statusColor(order.status)} whitespace-nowrap`}>
                        {order.status || "Pending"}
                      </div>
                    </td>
                    <td className="px-6 lg:px-8 py-4 lg:py-5">
                      <button className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 hover:from-purple-50 hover:to-blue-50 border border-gray-200 hover:border-purple-200 group-hover:scale-110 transition-all flex items-center justify-center">
                        <FiChevronRight className="text-gray-400 group-hover:text-purple-600 transition-colors text-sm lg:text-base" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 border-t border-gray-50 bg-gradient-to-r from-gray-50/50 to-blue-50/50">
            <div className="flex flex-col xs:flex-row justify-between items-center gap-2 xs:gap-0">
              <div className="text-xs sm:text-sm text-gray-500 text-center xs:text-left">
                Showing {recentOrders.length} of {stats.totalOrders} total orders
              </div>
              <button className="px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-200 transition-all flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium">
                <span>View All Orders</span>
                <FiArrowUpRight className="text-xs sm:text-sm" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Performance Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6"
        >
          {/* Quick Stats */}
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl border border-gray-100 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-green-500 text-base sm:text-lg" />
              <span>Performance Metrics</span>
            </h3>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50">
                <div>
                  <div className="text-xs sm:text-sm text-gray-600">Avg. Order Value</div>
                  <div className="text-lg sm:text-xl font-bold text-gray-800">
                    {formatCurrency(stats.totalSales / Math.max(stats.totalOrders, 1))}
                  </div>
                </div>
                <div className="text-xs sm:text-sm font-bold text-green-600 flex items-center gap-1">
                  <FiTrendingUp className="text-xs sm:text-sm" />
                  +12.5%
                </div>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50">
                <div>
                  <div className="text-xs sm:text-sm text-gray-600">This Week Orders</div>
                  <div className="text-lg sm:text-xl font-bold text-gray-800">{stats.weekOrders || 0}</div>
                </div>
                <div className="text-xs sm:text-sm font-bold text-blue-600 flex items-center gap-1">
                  <FiTrendingUp className="text-xs sm:text-sm" />
                  +{stats.orderGrowth || 0}%
                </div>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50">
                <div>
                  <div className="text-xs sm:text-sm text-gray-600">Conversion Rate</div>
                  <div className="text-lg sm:text-xl font-bold text-gray-800">
                    {Math.round((stats.totalOrders / Math.max(stats.totalUsers, 1)) * 100)}%
                  </div>
                </div>
                <div className="text-xs sm:text-sm font-bold text-purple-600 flex items-center gap-1">
                  <FiTrendingUp className="text-xs sm:text-sm" />
                  +5.3%
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl border border-gray-100 p-4 sm:p-6 lg:col-span-2">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Recent Activity</h3>
            <div className="space-y-2 sm:space-y-3">
              {recentOrders.slice(0, 4).map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${statusColor(order.status)} flex-shrink-0`}>
                    <FiShoppingBag className="text-white text-sm sm:text-base" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm sm:text-base truncate">
                      New order from {order.customer || "Customer"}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 truncate">
                      {order.product || "Product"} • {formatCurrency(order.amount || 0)}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(order.createdAt)}
                    </div>
                    <div className={`text-xs font-bold ${statusTextColor(order.status)} ${statusColor(order.status)} px-2 py-1 rounded-full inline-block mt-1 whitespace-nowrap`}>
                      {order.status || "Pending"}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

/* ================= ENHANCED STAT CARD ================= */
function StatCard({ icon, title, value, growth, color, subtitle, delay }) {
  const GrowthIcon = growth >= 0 ? FiTrendingUp : FiTrendingDown;
  const growthColor = growth >= 0 ? "text-green-600" : "text-red-600";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative group"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white to-white rounded-2xl md:rounded-3xl transition-all duration-300 group-hover:scale-[1.02]"></div>
      <div className="relative bg-white rounded-2xl md:rounded-3xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
        {/* Gradient accent bar */}
        <div className={`h-1 w-full bg-gradient-to-r ${color}`}></div>
        
        <div className="p-4 sm:p-5 md:p-6">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg flex-shrink-0`}>
              <div className="text-white text-lg sm:text-xl">
                {icon}
              </div>
            </div>
            <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full ${growthColor} bg-opacity-10 flex items-center gap-1 flex-shrink-0`}>
              <GrowthIcon className="text-xs sm:text-sm" />
              <span className="text-xs sm:text-sm font-bold">{growth}%</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs sm:text-sm text-gray-500 font-medium uppercase tracking-wider">{title}</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 truncate">{value}</h2>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-1 sm:mt-2">{subtitle}</p>
            )}
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 sm:mt-6">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Target</span>
              <span>{Math.round(growth + 100)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(growth + 50, 100)}%` }}
                transition={{ duration: 1, delay: delay + 0.3 }}
                className={`h-full bg-gradient-to-r ${color} rounded-full`}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}