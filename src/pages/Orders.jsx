import React, { useEffect, useState } from "react";
import { 
  FiSearch, FiFilter, FiEye, FiTruck, 
  FiShoppingBag, FiClock, FiCheckCircle, FiXCircle, FiTrendingUp,
  FiArrowLeft, FiMoreVertical, FiEdit, FiDownload, FiMessageSquare
} from "react-icons/fi";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { db, auth } from "../config/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  // Check mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate("/login");
          return;
        }

        const q = query(
          collection(db, "orders"),
          where("sellerId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(50)
        );
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
        }));
        
        setOrders(data);
        setFilteredOrders(data);
      } catch (err) {
        console.error("Failed to fetch orders", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [navigate]);

  // Apply filters
  useEffect(() => {
    let result = orders;

    // Search filter
    if (searchTerm) {
      result = result.filter(o =>
        o.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(o => o.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      let cutoffDate = new Date();

      switch (dateFilter) {
        case "today":
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case "month":
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        default:
          break;
      }

      result = result.filter(o => {
        const orderDate = o.createdAt;
        return orderDate >= cutoffDate;
      });
    }

    setFilteredOrders(result);
  }, [orders, searchTerm, statusFilter, dateFilter]);

  const statusConfig = {
    Delivered: { 
      color: "text-emerald-700 bg-emerald-50 border-emerald-200", 
      bg: "bg-emerald-500", 
      icon: <FiCheckCircle /> 
    },
    Processing: { 
      color: "text-blue-700 bg-blue-50 border-blue-200", 
      bg: "bg-blue-500", 
      icon: <FiClock /> 
    },
    Shipped: { 
      color: "text-indigo-700 bg-indigo-50 border-indigo-200", 
      bg: "bg-indigo-500", 
      icon: <FiTruck /> 
    },
    Cancelled: { 
      color: "text-rose-700 bg-rose-50 border-rose-200", 
      bg: "bg-rose-500", 
      icon: <FiXCircle /> 
    },
    Pending: { 
      color: "text-amber-700 bg-amber-50 border-amber-200", 
      bg: "bg-amber-500", 
      icon: <FiClock /> 
    },
  };

  const totalRevenue = orders.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const pendingOrders = orders.filter(o => o.status === "Pending").length;
  const processingOrders = orders.filter(o => o.status === "Processing").length;
  const deliveredOrders = orders.filter(o => o.status === "Delivered").length;

  const stats = [
    { 
      label: "Total Revenue", 
      val: `₹${totalRevenue.toLocaleString()}`, 
      icon: <FiTrendingUp />, 
      color: "text-emerald-600", 
      bg: "bg-gradient-to-br from-emerald-50 to-green-50",
      change: "+12.5%" 
    },
    { 
      label: "Pending", 
      val: pendingOrders, 
      icon: <FiClock />, 
      color: "text-amber-600", 
      bg: "bg-gradient-to-br from-amber-50 to-yellow-50",
      change: `+${Math.round((pendingOrders / orders.length) * 100) || 0}%` 
    },
    { 
      label: "Processing", 
      val: processingOrders, 
      icon: <FiClock />, 
      color: "text-blue-600", 
      bg: "bg-gradient-to-br from-blue-50 to-cyan-50",
      change: `+${Math.round((processingOrders / orders.length) * 100) || 0}%` 
    },
    { 
      label: "Delivered", 
      val: deliveredOrders, 
      icon: <FiCheckCircle />, 
      color: "text-emerald-600", 
      bg: "bg-gradient-to-br from-emerald-100 to-green-100",
      change: `+${Math.round((deliveredOrders / orders.length) * 100) || 0}%` 
    },
  ];

  const formatDate = (date) => {
    if (!date) return "N/A";
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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

  const handleOrderClick = (order) => {
    if (isMobile) {
      setSelectedOrder(order);
    }
  };

  const handleCloseOrderDetails = () => {
    setSelectedOrder(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] md:ml-72 flex flex-col items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"
        />
        <p className="text-slate-500 font-medium animate-pulse">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] md:ml-72">
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between md:hidden">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-700"
          >
            <FiArrowLeft className="text-lg" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="text-sm font-bold text-slate-900">Orders ({orders.length})</h1>
          <button className="p-2">
            <FiFilter className="text-slate-600" />
          </button>
        </div>
      )}

      <div className={`pt-16 md:pt-28 px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl mx-auto ${isMobile ? 'pb-24' : 'pb-10'}`}>
        {/* Desktop Header */}
        <div className={`${isMobile ? 'hidden md:block' : ''} mb-6 md:mb-10`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                Order Management
              </h1>
              <p className="text-sm md:text-base text-slate-500 font-medium">
                Tracking {orders.length} total customer purchases
              </p>
            </div>
            <button className="hidden md:flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
              <FiDownload className="text-sm" /> Export Orders
            </button>
          </div>
        </div>

        {/* QUICK STATS */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-10">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${stat.bg} ${stat.color} text-lg md:text-xl`}>
                  {stat.icon}
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  {stat.change}
                </span>
              </div>
              <div className="mt-3 md:mt-4">
                <p className="text-[10px] md:text-xs uppercase font-black text-slate-400 tracking-widest">
                  {stat.label}
                </p>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
                  {stat.val}
                </h3>
              </div>
            </motion.div>
          ))}
        </div>

        {/* SEARCH & FILTER SECTION */}
        <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm md:text-base" />
                <input
                  type="text"
                  placeholder="Search by Order ID, Customer, or Email..."
                  className="w-full pl-10 md:pl-12 pr-4 py-3 md:py-4 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium border border-slate-200 focus:border-indigo-500 text-sm md:text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm md:text-base"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm md:text-base"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>

              <button className="hidden sm:flex items-center justify-center gap-2 px-4 md:px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all">
                <FiFilter /> Apply Filters
              </button>
            </div>
          </div>

          {/* Mobile Filter Button */}
          {isMobile && (
            <button className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm">
              <FiFilter /> Apply Filters ({filteredOrders.length} results)
            </button>
          )}
        </div>

        {/* MOBILE ORDER CARDS */}
        <div className="md:hidden space-y-3">
          <AnimatePresence>
            {filteredOrders.map((order, idx) => (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"
                onClick={() => handleOrderClick(order)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{order.orderId || `#ORD${order.id.slice(0, 8)}`}</p>
                    <p className="text-xs text-slate-500 mt-1">{formatDate(order.createdAt)}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusConfig[order.status]?.color || "bg-slate-100 text-slate-600"}`}>
                    <span className="text-xs">{statusConfig[order.status]?.icon}</span>
                    {order.status}
                  </span>
                </div>

                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{order.customer || "Customer"}</p>
                    <p className="text-xs text-slate-500">{order.email || "No email"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-slate-900">{formatCurrency(order.amount || 0)}</p>
                    <p className="text-xs text-slate-500">{order.items || 1} item(s)</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <button className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                      <FiEye size={16} />
                    </button>
                    <button className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                      <FiTruck size={16} />
                    </button>
                    <button className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                      <FiMessageSquare size={16} />
                    </button>
                  </div>
                  <button className="p-2 text-slate-400 hover:text-slate-600">
                    <FiMoreVertical size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredOrders.length === 0 && (
            <div className="text-center py-10">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiShoppingBag className="text-slate-300" size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800">No orders found</h3>
              <p className="text-slate-500 text-sm mt-1">Try changing your search or filters</p>
            </div>
          )}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block bg-white rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 lg:px-8 py-4 text-left text-xs font-black uppercase text-slate-400 tracking-widest">
                    Order Details
                  </th>
                  <th className="px-6 lg:px-8 py-4 text-left text-xs font-black uppercase text-slate-400 tracking-widest">
                    Customer
                  </th>
                  <th className="px-6 lg:px-8 py-4 text-left text-xs font-black uppercase text-slate-400 tracking-widest">
                    Amount
                  </th>
                  <th className="px-6 lg:px-8 py-4 text-left text-xs font-black uppercase text-slate-400 tracking-widest">
                    Status
                  </th>
                  <th className="px-6 lg:px-8 py-4 text-center text-xs font-black uppercase text-slate-400 tracking-widest">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence>
                  {filteredOrders.map((order, idx) => (
                    <motion.tr 
                      key={order.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 lg:px-8 py-5">
                        <div className="flex items-center gap-3 lg:gap-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm">
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                              {order.orderId || `#ORD${order.id.slice(0, 8)}`}
                            </p>
                            <p className="text-xs text-slate-400 font-medium mt-1">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 lg:px-8 py-5">
                        <p className="text-sm font-bold text-slate-700">{order.customer || "Customer"}</p>
                        <p className="text-xs text-slate-500">{order.email || "No email provided"}</p>
                      </td>
                      <td className="px-6 lg:px-8 py-5">
                        <span className="text-base font-bold text-slate-900">
                          {formatCurrency(order.amount || 0)}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">{order.items || 1} item(s)</p>
                      </td>
                      <td className="px-6 lg:px-8 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs font-bold uppercase tracking-tighter border ${statusConfig[order.status]?.color || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          <span className="text-sm">{statusConfig[order.status]?.icon}</span>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 lg:px-8 py-5">
                        <div className="flex justify-center gap-2 lg:gap-3">
                          <button className="p-2.5 bg-white border border-slate-100 shadow-sm text-slate-600 rounded-xl hover:text-indigo-600 hover:border-indigo-100 transition-all">
                            <FiEye size={18} />
                          </button>
                          <button className="p-2.5 bg-white border border-slate-100 shadow-sm text-slate-600 rounded-xl hover:text-indigo-600 hover:border-indigo-100 transition-all">
                            <FiTruck size={18} />
                          </button>
                          <button className="p-2.5 bg-white border border-slate-100 shadow-sm text-slate-600 rounded-xl hover:text-indigo-600 hover:border-indigo-100 transition-all">
                            <FiEdit size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-16 lg:py-20">
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiShoppingBag className="text-slate-300" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No matching orders</h3>
              <p className="text-slate-500 text-sm mt-2">We couldn't find any orders matching your search.</p>
              <button 
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setDateFilter("all");
                }}
                className="mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Mobile Order Details Modal */}
        <AnimatePresence>
          {selectedOrder && isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
              onClick={handleCloseOrderDetails}
            >
              <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">Order Details</h3>
                    <p className="text-sm text-slate-500">{selectedOrder.orderId}</p>
                  </div>
                  <button 
                    onClick={handleCloseOrderDetails}
                    className="p-2 text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-slate-500">Customer</p>
                      <p className="font-medium text-slate-900">{selectedOrder.customer}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Amount</p>
                      <p className="font-bold text-lg text-slate-900">{formatCurrency(selectedOrder.amount)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Status</p>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mt-1 ${statusConfig[selectedOrder.status]?.color}`}>
                        {statusConfig[selectedOrder.status]?.icon}
                        {selectedOrder.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Date</p>
                      <p className="font-medium text-slate-900 text-sm">{formatDate(selectedOrder.createdAt)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500 mb-2">Shipping Address</p>
                    <p className="text-sm text-slate-900 bg-slate-50 p-3 rounded-lg">
                      {selectedOrder.shippingAddress || "Not provided"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500 mb-2">Items</p>
                    <div className="space-y-2">
                      {selectedOrder.items?.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                          </div>
                          <p className="text-sm font-bold">{formatCurrency(item.price)}</p>
                        </div>
                      )) || (
                        <p className="text-sm text-slate-500 text-center py-4">No item details available</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-200 flex gap-3">
                  <button className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                    Update Status
                  </button>
                  <button className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">
                    Contact Customer
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Count */}
        <div className="mt-6 text-center text-sm text-slate-500">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      </div>
    </div>
  );
}