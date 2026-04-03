import { motion, AnimatePresence } from "framer-motion";
import vistaraa from "../../assets/icons/Vistaraa-icon.png";
import { 
  FiUser, FiSearch, FiChevronDown,
  FiLogOut, FiX, 
} from "react-icons/fi";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../../config/firebase"; 
import { doc, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";

export default function Navbar() {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userData, setUserData] = useState({
    name: "User",
    email: "",
    photo: null
  });

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const userDocRef = doc(db, "sellers", user.uid);
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData({
              name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || "User",
              email: data.email || user.email,
              photo: data.profileImage || null
            });
          }
        });
        return () => unsubscribeDoc();
      } else {
        setUserData({ name: "Guest", email: "", photo: null });
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <>
      {/* NAVBAR (HEIGHT REDUCED ✅) */}
      <nav className="fixed top-0 left-0 right-0 z-30 h-14 md:h-16 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 md:pl-72">
        <div className="h-full px-4 md:px-10 max-w-[1600px] mx-auto flex items-center justify-between">

          {/* LEFT */}
          <div className="flex items-center flex-1 gap-6">
            
            {/* BRAND (Desktop) */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <img src={vistaraa} alt="Logo" className="w-8 h-8 object-contain" />
              <span className="font-bold text-lg text-gray-800 dark:text-white tracking-tight">
                Vistaraa
              </span>
            </div>

            {/* SEARCH (Desktop) */}
            <div className="hidden md:flex w-full max-w-xl">
              <div className="relative w-full group">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search orders, products..."
                  className="w-full pl-11 pr-4 py-2 bg-gray-100 dark:bg-gray-800/50 border border-transparent focus:border-purple-500/50 focus:bg-white dark:focus:bg-gray-800 rounded-2xl outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* BRAND (Mobile) */}
            <div className="md:hidden flex items-center ml-12">
              <img src={vistaraa} alt="Logo" className="w-7 h-7 object-contain mr-2" />
              <span className="font-bold text-base text-gray-800 dark:text-white">
                Vistaraa
              </span>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">

            {/* Mobile Search */}
            <button 
              onClick={() => setIsMobileSearchOpen(true)}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl md:hidden transition-colors"
            >
              <FiSearch size={18} />
            </button>

            <div className="hidden md:block h-7 w-px bg-gray-200 dark:bg-gray-700"></div>

            {/* PROFILE */}
            <div className="relative">
              <button 
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all"
              >
                <div className="relative">
                  {userData.photo ? (
                    <img 
                      src={userData.photo}
                      className="w-8 h-8 md:w-9 md:h-9 rounded-xl border border-purple-200 dark:border-purple-900/50 object-cover"
                      alt="avatar"
                    />
                  ) : (
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                      {userData.name.charAt(0)}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
                </div>

                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-gray-800 dark:text-white truncate max-w-[120px]">
                    {userData.name}
                  </p>
                  <p className="text-[10px] text-purple-500 font-semibold uppercase tracking-wider">
                    Seller
                  </p>
                </div>

                <FiChevronDown className={`hidden sm:block text-gray-400 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-2"
                  >
                    <div className="p-4 mb-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <p className="font-bold text-gray-800 dark:text-white truncate">{userData.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{userData.email}</p>
                    </div>

                    <Link 
                      to="/profile" 
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 p-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:text-purple-600 rounded-xl"
                    >
                      <FiUser /> My Profile
                    </Link>

                    <div className="border-t border-gray-100 dark:border-gray-800 my-2"></div>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 p-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl font-bold"
                    >
                      <FiLogOut /> Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      {/* MOBILE SEARCH */}
      <AnimatePresence>
        {isMobileSearchOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-white dark:bg-[#0f172a] p-4"
          >
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search Vistaraa..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl outline-none ring-2 ring-purple-500/20"
                />
              </div>
              <button 
                onClick={() => setIsMobileSearchOpen(false)} 
                className="p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl"
              >
                <FiX size={22} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
