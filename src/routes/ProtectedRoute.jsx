import { Navigate } from "react-router-dom";
import { auth, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiLoader, FiShield, FiCheckCircle, FiAlertCircle, FiLogIn } from "react-icons/fi";

// Import your logo
import vistaraa from "../assets/icons/Vistaraa-icon.png";

export default function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [allowed, setAllowed] = useState("loading");
  const [sellerData, setSellerData] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setAllowed("noUser");
        return;
      }

      const snap = await getDoc(doc(db, "sellers", u.uid));
      if (!snap.exists()) {
        setAllowed("notSeller");
        return;
      }

      const data = snap.data();
      setSellerData(data);
      setAllowed(data.status);
    });

    return () => unsub();
  }, []);

  // Loading Screen with Attractive UI
  if (allowed === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-full blur-2xl"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 text-center"
        >
          {/* Logo and Brand */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 mb-6"
            >
              <img 
                src={vistaraa} 
                alt="Vistaraa Logo" 
                className="w-12 h-12 object-contain"
              />
            </motion.div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Vistaraa Seller
            </h1>
            <p className="text-gray-400 text-sm mt-2">Secure Access Portal</p>
          </div>

          {/* Loading Animation */}
          <div className="mb-10">
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 mx-auto border-4 border-transparent border-t-purple-500 border-r-blue-500 rounded-full"
              />
              <FiLoader className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-2xl" />
            </div>
            
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mt-8 max-w-xs mx-auto"
            />
          </div>

          {/* Loading Text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-center gap-3 text-gray-300">
              <FiShield className="text-purple-400" />
              <p className="text-sm font-medium">Verifying Authentication</p>
            </div>
            <div className="flex items-center justify-center gap-3 text-gray-300">
              <FiCheckCircle className="text-blue-400" />
              <p className="text-sm font-medium">Checking Seller Status</p>
            </div>
            <p className="text-xs text-gray-500 mt-6">
              Securely connecting to Vistaraa servers...
            </p>
          </motion.div>
        </motion.div>

        {/* Decorative Elements */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Secure Connection • Firebase Auth</span>
          </div>
        </div>
      </div>
    );
  }

  // No User - Redirect to Login
  if (!user) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="redirect-login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center p-6"
        >
          <div className="max-w-md w-full text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 10 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-red-500 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-xl"
            >
              <FiLogIn className="text-white text-3xl" />
            </motion.div>
            
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-white mb-3"
            >
              Authentication Required
            </motion.h2>
            
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-gray-400 mb-8"
            >
              Please log in to access the seller dashboard
            </motion.p>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex gap-4 justify-center"
            >
              <Navigate to="/login" replace />
              <p className="text-sm text-gray-500">
                Redirecting to login page...
              </p>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Not Approved - Redirect to Pending
  if (allowed !== "approved") {
    const statusMessages = {
      pending: {
        title: "Account Pending Approval",
        message: "Your seller account is awaiting admin approval. We'll notify you once verified.",
        color: "from-yellow-500 to-orange-500",
        icon: FiAlertCircle,
      },
      blocked: {
        title: "Account Blocked",
        message: "Your account has been blocked by the admin. Please contact support.",
        color: "from-red-500 to-pink-500",
        icon: FiAlertCircle,
      },
      rejected: {
        title: "Account Rejected",
        message: "Your seller application was not approved. Contact support for details.",
        color: "from-red-500 to-orange-500",
        icon: FiAlertCircle,
      },
      under_review: {
        title: "Under Review",
        message: "Your account is currently under review. Please check back later.",
        color: "from-blue-500 to-cyan-500",
        icon: FiLoader,
      },
      default: {
        title: "Access Restricted",
        message: "Your account status doesn't allow access to this page.",
        color: "from-gray-500 to-gray-700",
        icon: FiAlertCircle,
      }
    };

    const status = allowed in statusMessages ? allowed : "default";
    const { title, message, color, icon: Icon } = statusMessages[status];

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="redirect-pending"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center p-6"
        >
          <div className="max-w-lg w-full text-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 15 }}
              className={`w-24 h-24 rounded-3xl bg-gradient-to-tr ${color} flex items-center justify-center mx-auto mb-8 shadow-2xl`}
            >
              <Icon className="text-white text-4xl" />
            </motion.div>
            
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-white mb-4"
            >
              {title}
            </motion.h2>
            
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-gray-300 mb-8 text-lg"
            >
              {message}
            </motion.p>

            {/* Status Details */}
            {sellerData && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-8"
              >
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div>
                    <p className="text-sm text-gray-400">Business Name</p>
                    <p className="font-medium text-white">{sellerData.businessName || "Not provided"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Status</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        status === "pending" ? "bg-yellow-500" :
                        status === "approved" ? "bg-green-500" :
                        status === "blocked" ? "bg-red-500" :
                        "bg-blue-500"
                      }`}></div>
                      <span className="font-medium text-white capitalize">{status.replace("_", " ")}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col gap-4"
            >
              <Navigate to="/seller/pending" replace />
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <p className="text-sm">Redirecting to pending page...</p>
              </div>
              
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-sm text-gray-500">
                  Need help? <a href="mailto:support@vistaraa.com" className="text-blue-400 hover:text-blue-300">Contact Support</a>
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Approved - Render Children with Animation
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="protected-content"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >

        
        {children}
      </motion.div>
    </AnimatePresence>
  );
}