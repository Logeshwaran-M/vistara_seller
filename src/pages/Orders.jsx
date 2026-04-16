import React, { useEffect, useState } from "react";
import { 
  FiSearch, FiFilter, FiEye, FiTruck, 
  FiShoppingBag, FiClock, FiCheckCircle, FiXCircle, FiTrendingUp,
  FiArrowLeft, FiMoreVertical, FiEdit, FiDownload, FiMessageSquare, FiMapPin,
  FiTrash
} from "react-icons/fi";
import { 
  collection, getDocs, query, orderBy, limit, where, 
  collectionGroup, updateDoc, doc, arrayUnion, deleteDoc 
} from "firebase/firestore";
import { db, auth } from "../config/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

// Helper: extract customer info from various schema formats
const extractCustomerInfo = (data) => {
  if (!data) return { name: 'Anonymous', email: '', phone: '' };

  // 1. Nested objects
  const nested = data.shippingAddress || data.customer || data.buyer || data.user;
  if (nested && typeof nested === 'object') {
    return {
      name: nested.fullName || nested.name || nested.displayName || nested.userName || 'Anonymous',
      email: nested.email || nested.userEmail || '',
      phone: nested.phone || nested.phoneNumber || nested.mobile || ''
    };
  }

  // 2. Root level fields
  return {
    name: data.userName || data.buyerName || data.customerName || data.fullName || data.name || 'Anonymous',
    email: data.userEmail || data.buyerEmail || data.email || '',
    phone: data.userPhone || data.customerPhone || data.phone || ''
  };
};

// Helper: extract products from various schema formats
const extractProducts = (data) => {
  if (!data) return [];
  if (Array.isArray(data.products)) return data.products;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.cart)) return data.cart;
  if (data.product && typeof data.product === 'object') return [data.product];
  if (data.item && typeof data.item === 'object') return [data.item];
  return [];
};

// Helper: calculate total amount
const calculateTotal = (products, data) => {
  const rootAmount = data.totalAmount || data.total || data.amount || data.price || data.salePrice;
  if (rootAmount) return parseFloat(rootAmount);
  
  return products.reduce((sum, p) => {
    const price = parseFloat(p.price || p.salePrice || p.amount || 0);
    const qty = parseInt(p.quantity || p.qty || 1);
    return sum + (price * qty);
  }, 0);
};

// Helper: extract and normalize status
const extractStatus = (data) => {
  const rawStatus = data.status || data.orderStatus || data.state || 'pending';
  const statusMap = {
    'pending': 'Pending',
    'processing': 'Processing',
    'shipped': 'Shipped',
    'delivered': 'Delivered',
    'completed': 'Delivered',
    'cancelled': 'Cancelled',
    'failed': 'Cancelled'
  };
  return statusMap[rawStatus.toLowerCase()] || 'Pending';
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // Activity Log Helper
  const addActivityLog = async (orderId, action, details, orderObj) => {
    try {
      const activityEntry = {
        action,
        details,
        timestamp: new Date(),
        performedBy: auth.currentUser?.email || 'Seller'
      };

      const parts = orderObj.__path.split('/');
      const orderRef = doc(db, ...parts);

      await updateDoc(orderRef, {
        activityLog: arrayUnion(activityEntry)
      });

      // Update local state
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          return { ...o, activityLog: [...(o.activityLog || []), activityEntry] };
        }
        return o;
      }));

      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({
          ...prev,
          activityLog: [...(prev.activityLog || []), activityEntry]
        }));
      }
    } catch (err) {
      console.error('Error adding activity log:', err);
    }
  };

  const deleteOrder = async (orderId, orderObj) => {
    if (!window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) return;
    
    setIsUpdating(true);
    try {
      const parts = orderObj.__path.split('/');
      const orderRef = doc(db, ...parts);
      
      // Delete from Firestore
      await deleteDoc(orderRef);
      
      // Update local state
      setOrders(prev => prev.filter(o => o.id !== orderId));
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      
      setMessage('Order deleted successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error deleting order:', err);
      alert("Failed to delete order. Please check your permissions.");
    } finally {
      setIsUpdating(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus, orderObj) => {
    setIsUpdating(true);
    try {
      const parts = orderObj.__path.split('/');
      const orderRef = doc(db, ...parts);

      await updateDoc(orderRef, { 
        status: newStatus,
        orderStatus: newStatus.toLowerCase(),
        updatedAt: new Date() 
      });

      await addActivityLog(orderId, 'STATUS_UPDATE', `Order status changed to ${newStatus}`, orderObj);

      setOrders(prev => prev.map(o => o.id === orderId ? ({ ...o, status: newStatus }) : o));
      if (selectedOrder?.id === orderId) setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      
      setMessage('Status updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error updating order status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const updateCustomerDetails = async (orderId, updatedCustomer, orderObj) => {
    setIsUpdating(true);
    try {
      const parts = orderObj.__path.split('/');
      const orderRef = doc(db, ...parts);

      // Check if root or nested
      if (orderObj.shippingAddress) {
        await updateDoc(orderRef, { 
          shippingAddress: { ...orderObj.shippingAddress, ...updatedCustomer },
          updatedAt: new Date()
        });
      } else {
        await updateDoc(orderRef, { 
          customer: updatedCustomer.name,
          email: updatedCustomer.email,
          phone: updatedCustomer.phone,
          updatedAt: new Date()
        });
      }

      await addActivityLog(orderId, 'CUSTOMER_UPDATE', `Customer details updated: ${updatedCustomer.name}`, orderObj);

      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, ...updatedCustomer, customer: updatedCustomer.name } : o
      ));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, ...updatedCustomer, customer: updatedCustomer.name }));
      }
      setMessage('Customer updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error updating customer:', err);
    } finally {
      setIsUpdating(false);
      setEditingCustomer(false);
    }
  };

  const updateProductPrice = async (orderId, productIndex, newPrice, orderObj) => {
    setIsUpdating(true);
    try {
      const parts = orderObj.__path.split('/');
      const orderRef = doc(db, ...parts);

      const updatedProducts = [...orderObj.itemsList];
      const oldPrice = updatedProducts[productIndex].salePrice || updatedProducts[productIndex].price || 0;
      
      updatedProducts[productIndex] = {
        ...updatedProducts[productIndex],
        salePrice: parseFloat(newPrice),
        price: parseFloat(newPrice)
      };

      const newTotal = calculateTotal(updatedProducts, orderObj);

      await updateDoc(orderRef, {
        products: updatedProducts,
        totalAmount: newTotal,
        updatedAt: new Date()
      });

      await addActivityLog(orderId, 'PRICE_UPDATE', `Price changed from ₹${oldPrice} to ₹${newPrice}`, orderObj);

      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, itemsList: updatedProducts, amount: newTotal } : o
      ));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, itemsList: updatedProducts, amount: newTotal }));
      }
      setMessage('Price updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error updating price:', err);
    } finally {
      setIsUpdating(false);
      setEditingProduct(null);
    }
  };

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
        setLoading(true);
        const user = auth.currentUser;
        if (!user) {
          navigate("/login");
          return;
        }

        const effectiveSellerId = user.uid;
        const ordersMap = new Map();

        // SAFE FETCH with deep scanning
        const q = query(collectionGroup(db, "orders"), limit(100));
        const allSnap = await getDocs(q);
        
        const candidateFields = ['sellerId', 'sellerid', 'sellerID', 'seller', 'owner', 'userId', 'uid'];
        
        const matchingDocs = allSnap.docs.filter(d => {
          const data = d.data();
          
          // 1. Check root level
          const hasRootMatch = candidateFields.some(field => 
            data[field] && String(data[field]) === String(effectiveSellerId)
          );
          if (hasRootMatch) return true;

          // 2. Check nested products/items
          const products = data.products || data.items || [];
          if (Array.isArray(products)) {
            return products.some(p => 
              candidateFields.some(field => p[field] && String(p[field]) === String(effectiveSellerId))
            );
          }
          
          return false;
        });

        const processAndStore = (docs) => {
          docs.forEach(d => {
            const rawData = d.data();
            const customer = extractCustomerInfo(rawData);
            const products = extractProducts(rawData);
            const status = extractStatus(rawData);
            
            // Comprehensive total amount check including nested in shippingAddress
            const total = calculateTotal(products, rawData) || 
                          parseFloat(rawData.shippingAddress?.totalAmount || 0);

            ordersMap.set(d.id, {
              id: d.id,
              ...rawData,
              customer: customer.name,
              email: customer.email,
              phone: customer.phone,
              amount: total,
              status: status,
              items: products.length || 1,
              itemsList: products,
              createdAt: rawData.createdAt?.toDate ? rawData.createdAt.toDate() : 
                         rawData.timestamp?.toDate ? rawData.timestamp.toDate() :
                         new Date(rawData.createdAt || rawData.timestamp || rawData.orderDate || Date.now()),
              __path: d.ref.path
            });
          });
        };

        processAndStore(matchingDocs);

        const merged = Array.from(ordersMap.values()).sort((a, b) => b.createdAt - a.createdAt);
        
        setOrders(merged);
        setFilteredOrders(merged);
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
    setSelectedOrder(order);
  };

  const handleCloseOrderDetails = () => {
    setSelectedOrder(null);
    setShowActivity(false);
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
                    <button 
                      onClick={() => setSelectedOrder(order)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all font-bold text-xs"
                    >
                      <FiEye size={16} /> View
                    </button>
                    <button 
                      onClick={() => deleteOrder(order.id, order)}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all font-bold text-xs"
                    >
                      <FiTrash size={16} /> Delete
                    </button>
                  </div>
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
                    Status (Quick Change)
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
                        <div className="min-w-[140px]">
                          <select
                            defaultValue={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value, order)}
                            className={`w-full cursor-pointer outline-none px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${statusConfig[order.status]?.color || "bg-slate-100 text-slate-600 border-slate-200"}`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-6 lg:px-8 py-5">
                        <div className="flex justify-center gap-2 lg:gap-3">
                          <button 
                            onClick={() => setSelectedOrder(order)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-100 shadow-sm text-slate-600 rounded-xl hover:text-indigo-600 hover:border-indigo-100 transition-all font-black text-xs"
                          >
                            <FiEye size={18} /> View
                          </button>
                          <button 
                            onClick={() => deleteOrder(order.id, order)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-100 shadow-sm text-rose-500 rounded-xl hover:bg-rose-50 hover:border-rose-100 transition-all font-black text-xs"
                          >
                            <FiTrash size={18} /> Delete
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

        {/* Unified Order Details Modal */}
        <AnimatePresence>
          {selectedOrder && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={handleCloseOrderDetails}
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden relative shadow-2xl flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${statusConfig[selectedOrder.status]?.color}`}>
                      {statusConfig[selectedOrder.status]?.icon}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-lg">Order #{selectedOrder.id.slice(0, 8).toUpperCase()}</h3>
                      <p className="text-sm text-slate-500 font-medium">{formatDate(selectedOrder.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowActivity(!showActivity)}
                      className="p-2.5 bg-white border border-slate-100 text-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={handleCloseOrderDetails}
                      className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
                    >
                      <FiXCircle size={20} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {showActivity ? (
                    <div className="space-y-4">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2">
                        <FiClock className="text-indigo-600" />
                        Activity History
                      </h4>
                      <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                        {selectedOrder.activityLog?.length > 0 ? (
                          [...selectedOrder.activityLog].reverse().map((log, i) => (
                            <div key={i} className="relative pl-10">
                              <div className="absolute left-3 top-2 w-2 h-2 rounded-full bg-indigo-500 outline outline-4 outline-indigo-50" />
                              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <p className="text-sm font-bold text-slate-900">{log.action.replace('_', ' ')}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{log.details}</p>
                                <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">
                                  {new Date(log.timestamp?.seconds * 1000 || log.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-10">
                            <FiClock size={32} className="mx-auto text-slate-200 mb-2" />
                            <p className="text-sm text-slate-400">No activity recorded for this order yet.</p>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => setShowActivity(false)}
                        className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/20"
                      >
                        Back to Details
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Customer Info */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs font-extra-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             Customer Details
                          </p>
                          <button 
                            onClick={() => setEditingCustomer(!editingCustomer)}
                            className="text-indigo-600 hover:text-indigo-700 text-xs font-bold flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100"
                          >
                            {editingCustomer ? <><FiXCircle /> Cancel</> : <><FiEdit /> Edit Info</>}
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500" />
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Identity</p>
                            {editingCustomer ? (
                              <input 
                                type="text"
                                defaultValue={selectedOrder.customer}
                                className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                onBlur={(e) => updateCustomerDetails(selectedOrder.id, { name: e.target.value, email: selectedOrder.email, phone: selectedOrder.phone }, selectedOrder)}
                              />
                            ) : (
                              <>
                                <p className="font-bold text-slate-900 text-sm mb-1">{selectedOrder.customer}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-2 mt-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> {selectedOrder.email || 'No email'}
                                </p>
                              </>
                            )}
                          </div>
                          
                          <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500" />
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">Contact & Payment</p>
                            {editingCustomer ? (
                              <div className="space-y-2">
                                <input 
                                  type="text"
                                  placeholder="Phone Number"
                                  defaultValue={selectedOrder.phone}
                                  className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                  onBlur={(e) => updateCustomerDetails(selectedOrder.id, { name: selectedOrder.customer, email: selectedOrder.email, phone: e.target.value }, selectedOrder)}
                                />
                              </div>
                            ) : (
                              <>
                                <p className="font-bold text-slate-900 text-sm mb-1">{selectedOrder.phone || 'No phone'}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-2 mt-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {selectedOrder.paymentMethod || 'COD'} ({formatCurrency(selectedOrder.amount)})
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Address info */}
                      <div>
                        <p className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-widest">
                          <FiMapPin className="text-indigo-600" /> Shipping Destination
                        </p>
                        <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 text-sm shadow-sm">
                          {typeof selectedOrder.shippingAddress === 'object' ? (
                            <div className="space-y-1.5">
                              <p className="font-bold text-slate-900 flex items-center gap-2">
                                {selectedOrder.shippingAddress.fullName}
                                <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full font-black uppercase">Recipient</span>
                              </p>
                              <p className="text-slate-600 font-medium">{selectedOrder.shippingAddress.address}</p>
                              <p className="text-slate-500 text-xs">{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.pincode}</p>
                            </div>
                          ) : (
                            <p className="text-slate-600 font-medium">{selectedOrder.shippingAddress || 'Address not provided'}</p>
                          )}
                        </div>
                      </div>

                      {/* Items */}
                      <div>
                        <p className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-widest">
                          <FiShoppingBag className="text-indigo-600" /> Order Items ({selectedOrder.itemsList?.length || 0})
                        </p>
                        <div className="space-y-4">
                          {selectedOrder.itemsList?.map((item, i) => (
                            <div key={i} className="flex items-center gap-5 p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-100 transition-all shadow-sm hover:shadow-md hover:shadow-indigo-500/5 group relative">
                              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-50 flex-shrink-0 border border-slate-100">
                                <img 
                                  src={item.image || item.imageUrl || `https://ui-avatars.com/api/?name=${item.name}&background=random`} 
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                  alt="" 
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-black text-slate-900 truncate text-sm">{item.name}</p>
                                  {item.approved && <span className="p-0.5 bg-emerald-500 text-white rounded-full"><FiCheckCircle size={10} /></span>}
                                </div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Qty: {item.quantity || item.qty || 1} • SKU: {item.sku || 'N/A'}</p>
                                <div className="flex items-center gap-2 mt-3">
                                  {editingProduct === i ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-indigo-600 font-bold">₹</span>
                                      <input 
                                        type="number"
                                        defaultValue={item.salePrice || item.price}
                                        autoFocus
                                        className="w-24 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1 text-sm font-black text-indigo-700 outline-none"
                                        onBlur={(e) => updateProductPrice(selectedOrder.id, i, e.target.value, selectedOrder)}
                                        onKeyDown={(e) => e.key === 'Enter' && updateProductPrice(selectedOrder.id, i, e.target.value, selectedOrder)}
                                      />
                                    </div>
                                  ) : (
                                    <>
                                      <p className="font-black text-slate-900 text-lg">{formatCurrency(item.salePrice || item.price || 0)}</p>
                                      <button 
                                        onClick={() => setEditingProduct(i)}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                      >
                                        <FiEdit size={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Status Update Dropdown */}
                      <div className="pt-6 border-t border-slate-100">
                        <label className="text-[10px] font-black text-slate-400 mb-4 block uppercase tracking-widest">Change Order Phase</label>
                        <div className="flex gap-4">
                          <div className="relative flex-1 group">
                            <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${statusConfig[selectedOrder.status]?.color}`}>
                              {statusConfig[selectedOrder.status]?.icon}
                            </div>
                            <select 
                              defaultValue={selectedOrder.status}
                              onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value, selectedOrder)}
                              disabled={isUpdating}
                              className="pl-14 w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-black rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer appearance-none shadow-sm group-hover:border-slate-300"
                            >
                              <option value="Pending">Phase 1: Pending Verification</option>
                              <option value="Processing">Phase 2: Processing Order</option>
                              <option value="Shipped">Phase 3: Package Shipped</option>
                              <option value="Delivered">Phase 4: Order Delivered</option>
                              <option value="Cancelled">Phase 5: Order Cancelled</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <FiMoreVertical />
                            </div>
                          </div>
                          {isUpdating && (
                            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 text-white animate-pulse">
                              <FiClock size={20} className="animate-spin" />
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Management ID</p>
                    <p className="text-sm font-bold text-slate-900 mt-1 cursor-copy hover:text-indigo-600">{selectedOrder.id.toUpperCase()}</p>
                  </div>
                  <button 
                    onClick={handleCloseOrderDetails}
                    className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/30 hover:bg-slate-800 transition-all transform hover:scale-105 active:scale-95"
                  >
                    Save & Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Results Count */}
        <div className="mt-8 text-center text-sm font-bold text-slate-400 tracking-wide">
          Total: <span className="text-slate-900">{orders.length}</span> • Filtered: <span className="text-indigo-600">{filteredOrders.length}</span>
        </div>
      </div>
    </div>
  );
}

// Simple History icon replacement since Lucide isn't imported
const History = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="20" height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);