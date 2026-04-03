import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import vistaraa from "../../assets/icons/Vistaraa-icon.png";
import { auth, db } from "../../config/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { 
  FiHome, FiPackage, FiPlusCircle, 
  FiShoppingCart, FiUser, 
  FiChevronRight, FiMenu, FiX
} from "react-icons/fi";

export default function Sidebar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [userData, setUserData] = useState({ name: "Seller", photo: null, email: "" });

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const userDocRef = doc(db, "sellers", user.uid);
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData({
              name: data.firstName || "Seller",
              photo: data.profileImage || null,
              email: data.email || ""
            });
          }
        });
        return () => unsubscribeDoc();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const navItems = [
    { path: "/", label: "Dashboard", icon: <FiHome /> },
    { path: "/products", label: "Products", icon: <FiPackage /> },
    { path: "/products/add", label: "Add Product", icon: <FiPlusCircle /> },
    { path: "/orders", label: "Orders", icon: <FiShoppingCart /> },
    { path: "/profile", label: "Profile", icon: <FiUser /> },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)} 
        className="fixed top-4 left-4 z-50 p-3 bg-[#1e293b] text-white rounded-2xl md:hidden shadow-2xl border border-white/10"
      >
        {isOpen ? <FiX size={20} /> : <FiMenu size={20} />}
      </motion.button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed top-0 left-0 z-40 w-72 h-screen bg-[#0f172a] text-white 
        transition-all duration-500 ease-in-out border-r border-white/5 flex flex-col
        ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
      `}>
        
        {/* Subtle Decorative Background Glow */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-600 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 -right-24 w-64 h-64 bg-blue-600 rounded-full blur-[100px]" />
        </div>

        {/* Header Logo Section */}
        <div className="p-8 relative z-10 flex flex-col items-center">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="p-3 bg-white/5 rounded-3xl backdrop-blur-xl border border-white/10 mb-4"
          >
            <img src={vistaraa} alt="Logo" className="w-12 h-12 object-contain" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-gray-500 bg-clip-text text-transparent">
              Vistaraa
            </h2>
            <span className="text-[10px] uppercase tracking-[3px] text-purple-400 font-bold">Seller Panel</span>
          </motion.div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 relative z-10 overflow-y-auto custom-scrollbar">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <motion.div
                key={item.path}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 * index }}
              >
                <Link 
                  to={item.path} 
                  onClick={() => setIsOpen(false)}
                  className={`
                    relative group flex items-center justify-between p-3.5 rounded-2xl transition-all duration-300
                    ${isActive 
                      ? "bg-gradient-to-r from-purple-600/20 to-blue-600/5 text-white shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]" 
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }
                  `}
                >
                  {/* Active Indicator Glow */}
                  {isActive && (
                    <motion.div 
                      layoutId="activeIndicator"
                      className="absolute left-0 w-1 h-6 bg-purple-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.8)]"
                    />
                  )}

                  <div className="flex items-center gap-4">
                    <span className={`text-xl transition-colors duration-300 ${isActive ? "text-purple-400" : "group-hover:text-white"}`}>
                      {item.icon}
                    </span>
                    <span className="font-medium text-sm tracking-wide">{item.label}</span>
                  </div>

                  <FiChevronRight className={`
                    transition-all duration-300 
                    ${isActive ? "opacity-100 translate-x-0 text-purple-400" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"}
                  `} />
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* User Profile Section (Bottom) */}
        <div className="p-4 relative z-10">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-3 rounded-[24px] bg-white/5 border border-white/5 backdrop-blur-2xl shadow-2xl"
          >
            <Link to="" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-white/10 group-hover:border-purple-500/50 transition-colors duration-500">
                  {userData.photo ? (
                    <img src={userData.photo} className="w-full h-full object-cover" alt="Avatar" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                      {userData.name.charAt(0)}
                    </div>
                  )}
                </div>
                {/* Online Status Dot */}
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-[3px] border-[#0f172a] rounded-full shadow-lg" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate text-white group-hover:text-purple-300 transition-colors">
                  {userData.name}
                </p>
              </div>
            </Link>
          </motion.div>
        </div>
      </aside>
    </>
  );
}