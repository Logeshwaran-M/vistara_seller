// Products.jsx - Main Products List Page
import React, { useEffect, useState } from "react";
import {
  FiSearch, FiPlus, FiEdit2, FiEye, FiX, 
  FiPackage, FiAlertTriangle, FiClock, FiCheckCircle, 
   FiLayers, FiGlobe, FiDollarSign, FiBox, FiActivity, FiTrash2 
} from "react-icons/fi";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, "products"), where("sellerId", "==", user.uid));
      const snapshot = await getDocs(q);
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchProducts();
  }, []);

  const getProductImage = (product) => {
    if (!product?.images?.length) return "https://via.placeholder.com/400";
    const primary = product.images.find(img => img.isPrimary);
    return primary?.url || product.images[0]?.url;
  };

  const getStatus = (stock) => {
    const stockNum = Number(stock);
    if (stockNum <= 0) return { label: "Out of Stock", color: "text-rose-600 bg-rose-50", icon: FiClock };
    if (stockNum <= 10) return { label: "Low Stock", color: "text-amber-600 bg-amber-50", icon: FiAlertTriangle };
    return { label: "In Stock", color: "text-emerald-600 bg-emerald-50", icon: FiCheckCircle };
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- DYNAMIC STATS CALCULATION ---
  const totalStockValue = products.reduce((acc, curr) => acc + (Number(curr.price || 0) * Number(curr.stock || 0)), 0);
  const lowStockCount = products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= 10).length;
  const outOfStockCount = products.filter(p => Number(p.stock) <= 0).length;

  const stats = [
    { label: "Inventory Value", value: `₹${totalStockValue.toLocaleString()}`, sub: "Total Assets", icon: <FiDollarSign className="text-emerald-600" />, bg: "bg-emerald-50" },
    { label: "Total Items", value: products.length, sub: "Unique SKUs", icon: <FiBox className="text-blue-600" />, bg: "bg-blue-50" },
    { label: "Low Stock", value: lowStockCount, sub: "Needs Reorder", icon: <FiAlertTriangle className="text-amber-600" />, bg: "bg-amber-50" },
    { label: "Out of Stock", value: outOfStockCount, sub: "Unavailable", icon: <FiActivity className="text-rose-600" />, bg: "bg-rose-50" },
  ];

  return (
   <div className="min-h-screen bg-[#f8fafc] md:ml-72 pb-10">
  <div className="pt-20 md:pt-28 p-6 md:p-14 max-w-7xl mx-auto">


        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Inventory</h1>
            <p className="text-slate-500 font-medium">Manage your warehouse stock</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/products/add")}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg shadow-indigo-200"
          >
            <FiPlus size={20} /> Add Product
          </motion.button>
        </div>

        {/* --- SUMMARY STATS BOXES --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${stat.bg}`}>
                  {stat.icon}
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{stat.sub}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SEARCH BAR */}
        <div className="relative group mb-10">
          <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          <input
            type="text"
            placeholder="Search by product name..."
            className="w-full pl-14 pr-6 py-4 rounded-2xl bg-white border-none shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* PRODUCT GRID */}
        <AnimatePresence>
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
            {filteredProducts.map((product, idx) => {
              const status = getStatus(product.stock);
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 group"
                >
                  <div className="h-52 relative overflow-hidden">
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm ${status.color}`}>
                      <status.icon /> {status.label}
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">
                      {product.categoryName || "General"}
                    </p>
                    <h3 className="font-bold text-slate-800 text-lg mb-4 truncate">{product.name}</h3>

                    <div className="flex justify-between items-end mb-6">
                      <div>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">Current Price</p>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-slate-900">₹{product.salePrice || product.price}</span>
                          {product.salePrice < product.price && (
                            <span className="text-sm text-slate-400 line-through font-bold">₹{product.price}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">Stock</p>
                        <p className="font-bold text-slate-700">{product.stock} pcs</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                      >
                        <FiEye /> View
                      </button>

                      <button
                        onClick={() => navigate(`/products/edit/${product.id}`)}
                        className="flex items-center gap-2 px-4 py-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors font-bold text-sm"
                      >
                        <FiEdit2 /> Edit
                      </button>
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* EMPTY STATE */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <FiPackage className="mx-auto text-slate-200 mb-4" size={50} />
            <h3 className="text-xl font-bold text-slate-800">No products found</h3>
            <p className="text-slate-500">Try changing your search keywords.</p>
          </div>
        )}
      </div>

      {/* QUICK VIEW MODAL */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden grid md:grid-cols-2 h-[90vh]"
            >
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-6 right-6 z-50 p-2 bg-white/80 hover:bg-white rounded-full text-slate-900 shadow-lg transition-colors"
              >
                <FiX size={24} />
              </button>

              <div className="bg-slate-100 relative h-full">
                <img
                  src={getProductImage(selectedProduct)}
                  className="w-full h-full object-cover"
                  alt="Product"
                />
              </div>

              <div className="p-8 md:p-10 overflow-y-auto bg-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {selectedProduct.brand || "Generic"}
                  </span>
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${selectedProduct.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {selectedProduct.status || "active"}
                  </span>
                </div>

                <h2 className="text-3xl font-black text-slate-900 mb-2 leading-tight">
                  {selectedProduct.name}
                </h2>


                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Sale Price</p>
                    <p className="text-2xl font-black text-slate-900">₹{selectedProduct.salePrice || 0}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Stock</p>
                    <p className="text-2xl font-black text-slate-900">{selectedProduct.stock || 0}</p>
                  </div>
                </div>

                {/* SEO & META SECTION */}
                <div className="mb-8">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FiGlobe className="text-indigo-600" /> SEO Details
                  </h4>
                  <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Meta Title</p>
                      <p className="text-sm font-bold text-slate-700">{selectedProduct.metaTitle || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Meta Description</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{selectedProduct.metaDescription || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* VARIANTS SECTION */}
                {selectedProduct.variants?.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <FiLayers className="text-indigo-600" /> Variants
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedProduct.variants.map((v, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-600 font-bold text-[10px]">SIZE {v.size}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">SKU: {v.sku}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-slate-900">₹{v.price}</p>
                            <p className="text-[10px] font-bold text-emerald-600">{v.stock} pcs</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-y-6 py-6 border-y border-slate-100 mb-10">
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px]">HSN Code</p>
                    <p className="text-slate-900 font-bold text-sm">{selectedProduct.hsn || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px]">Created Date</p>
                    <p className="text-slate-900 font-bold text-sm">
                     {selectedProduct.createdAt 
  ? selectedProduct.createdAt.toDate().toLocaleDateString() 
  : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px]">Category</p>
                    <p className="text-slate-900 font-bold text-sm">{selectedProduct.categoryName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px]">Sub-Category</p>
                    <p className="text-slate-900 font-bold text-sm">{selectedProduct.subcategoryName}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setSelectedProduct(null);
                      navigate(`/products/edit/${selectedProduct.id}`);
                    }}
                    className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors"
                  >
                    <FiEdit2 /> Edit Full Details
                  </button>
                  <button className="p-4 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-colors">
                    <FiTrash2 size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}