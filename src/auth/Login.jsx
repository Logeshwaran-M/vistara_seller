import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiUserPlus, FiAlertCircle, FiCheckCircle, FiFileText } from "react-icons/fi";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import vistaraa from "../assets/icons/Vistaraa-icon.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showApprovalPopup, setShowApprovalPopup] = useState(false);
  const [showDocumentReviewPopup, setShowDocumentReviewPopup] = useState(false);
  const [error, setError] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setShowApprovalPopup(false);
    setShowDocumentReviewPopup(false);
    setIsLoading(true);

    // Basic validation
    if (!email || !password) {
      setError("Please enter both email and password");
      setIsLoading(false);
      return;
    }

    try {
      // Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      console.log("User authenticated:", uid);

      // Check if user exists in sellers collection
      const sellerDoc = await getDoc(doc(db, "sellers", uid));

      if (!sellerDoc.exists()) {
        setError("This email is not registered as a seller. Please create a seller account.");
        // Sign out user since they're not a seller
        await auth.signOut();
        setIsLoading(false);
        return;
      }

      const sellerData = sellerDoc.data();
      console.log("Seller data:", sellerData);

      // Check account status
      if (sellerData.status === "pending") {
        setError("Your account is pending admin approval. Please wait for verification.");
        setIsLoading(false);
        return;
      }

      if (sellerData.status === "blocked") {
        setError("Account blocked by admin. Please contact support.");
        setIsLoading(false);
        return;
      }

      if (sellerData.status === "rejected") {
        setError("Your account has been rejected. Please contact support for more information.");
        setIsLoading(false);
        return;
      }

      if (sellerData.status === "suspended") {
        setError("Your account has been suspended. Please contact admin.");
        setIsLoading(false);
        return;
      }

      // For "under_review" status - check if documents are submitted
      if (sellerData.status === "under_review") {
        const docsDoc = await getDoc(doc(db, "sellerDocuments", uid));
        if (!docsDoc.exists() || !docsDoc.data()?.bankDocUrl) {
          setError("Your account is Approved.");
          setIsLoading(false);
          return;
        } else {
          setPopupMessage("Your account and documents are under review. We'll notify you once verified.");
          setShowDocumentReviewPopup(true);
          setIsLoading(false);
          return;
        }
      }
// After fetching sellerData and docsDoc
if (sellerData.status === "approved") {
  if (sellerData.documentStatus === "verified") {
    // All good → show approved popup and redirect
    setPopupMessage("Account approved! Redirecting to dashboard...");
    setShowApprovalPopup(true);
    setTimeout(() => navigate("/"), 2000);
  } else {
    // Documents are under review → show review popup
    setPopupMessage("Your documents are under review. We'll notify you once verified.");
    setShowDocumentReviewPopup(true);
  }
  setIsLoading(false);
  return;
}
      // Only "approved" status should proceed further
      if (sellerData.status !== "approved") {
        setError("Your account is not approved yet. Current status: " + (sellerData.status || "unknown"));
        setIsLoading(false);
        return;
      }

      // Check if documents are submitted for approved accounts
      const docsDoc = await getDoc(doc(db, "documents", uid));
      const hasDocuments = docsDoc.exists() && docsDoc.data()?.bankDocUrl;
      
      if (!hasDocuments) {
        setPopupMessage("Account approved! Please complete document verification to access dashboard.");
        setShowApprovalPopup(true);
        setIsLoading(false);
        return;
      }

      // Check document verification status for approved accounts
      if (sellerData.documentStatus && sellerData.documentStatus !== "verified") {
        switch (sellerData.documentStatus) {
          case "under_review":
            setPopupMessage("Your Your account is  approved yet.");
            setShowDocumentReviewPopup(true);
            setIsLoading(false);
            return;
          case "rejected":
            setError("Your documents were rejected. Please upload valid documents.");
            setIsLoading(false);
            return;
          default:
            setError("Documents not verified. Please complete verification.");
            setIsLoading(false);
            return;
        }
      }

      // Check if account is active
      if (sellerData.active === false) {
        setError("Your account is inactive. Please contact support.");
        setIsLoading(false);
        return;
      }

      // All checks passed - show approval popup then redirect to dashboard
      setPopupMessage("Your account has been approved! Redirecting to dashboard...");
      setShowApprovalPopup(true);
      
      // Redirect to dashboard after showing popup
      setTimeout(() => {
        navigate("/");
      }, 2000);

    } catch (err) {
      console.error("Login error:", err);
      
      // User-friendly error messages
      let errorMessage = "Login failed. Please try again.";
      
      switch (err.code) {
        case 'auth/invalid-email':
          errorMessage = "Invalid email address format.";
          break;
        case 'auth/user-disabled':
          errorMessage = "This account has been disabled.";
          break;
        case 'auth/user-not-found':
          errorMessage = "No account found with this email.";
          break;
        case 'auth/wrong-password':
          errorMessage = "Incorrect password. Please try again.";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many failed attempts. Please try again later.";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Network error. Please check your internet connection.";
          break;
        case 'auth/invalid-credential':
          errorMessage = "Invalid login credentials.";
          break;
        default:
          errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden px-4">

      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[140px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[140px] animate-pulse delay-700"></div>

      {/* Approval Popup */}
      <AnimatePresence>
        {showApprovalPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowApprovalPopup(false)}
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiCheckCircle className="text-white text-4xl" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Account Approved!</h3>
                <p className="text-white/90 mb-6">{popupMessage}</p>
                <div className="flex items-center justify-center gap-2 text-white/80">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  <span>Redirecting...</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Review Popup */}
      <AnimatePresence>
        {showDocumentReviewPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowDocumentReviewPopup(false)}
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiFileText className="text-white text-4xl" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Account Approved</h3>
                <p className="text-white/90 mb-6">{popupMessage}</p>
                <button
                  onClick={() => {
                    setShowDocumentReviewPopup(false);
                    navigate("/seller/pending");
                  }}
                  className="bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-xs sm:max-w-sm"
      >

        {/* LOGIN CARD */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 sm:p-5 rounded-2xl shadow-xl">

          {/* LOGO + TITLE */}
          <div className="flex flex-col items-center text-center mb-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg mb-2">
              <img 
                src={vistaraa} 
                alt="Vistaraa Logo"
                className="w-8 h-8 object-contain"
              />
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              Vistaraa
            </h1>

            <h2 className="text-xs sm:text-sm font-semibold text-white mt-1">
              Seller Panel Login
            </h2>
            <p className="text-[10px] text-gray-400 mt-1">
              Access your seller dashboard
            </p>
          </div>

          {/* Error Message (only for errors, not for approval/review status) */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
            >
              <div className="flex items-start gap-2">
                <FiAlertCircle className="text-red-400 mt-0.5 flex-shrink-0" size={16} />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            </motion.div>
          )}

          {/* FORM */}
          <form onSubmit={handleLogin} className="space-y-3">

            {/* Email */}
            <div>
              <label className="text-xs text-gray-300 ml-1">Email *</label>
              <div className="relative mt-1">
                <FiMail className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                <input
                  required
                  type="email"
                  placeholder="seller@vistaraa.com"
                  className="w-full bg-gray-800/50 border border-gray-700 text-white pl-8 pr-3 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-purple-500 text-xs"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between text-xs text-gray-300 ml-1">
                <label>Password *</label>
                <Link
  to="/forgot-password"
  className="text-sm text-purple-600 font-semibold hover:underline"
>
  Forgot Password?
</Link>

              </div>

              <div className="relative mt-1">
                <FiLock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full bg-gray-800/50 border border-gray-700 text-white pl-8 pr-8 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-purple-500 text-xs"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm hover:text-white transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <input 
                type="checkbox" 
                className="rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-500" 
                disabled={isLoading}
              />
              Keep me logged in
            </div>

            {/* LOGIN BUTTON */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading || !email || !password}
              type="submit"
              className={`w-full py-2.5 rounded-lg font-bold text-white transition-all text-xs
                ${isLoading ? "bg-gradient-to-r from-purple-700 to-blue-700" : 
                  "bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-md hover:shadow-purple-500/40"}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Verifying...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5">
                    Login to Dashboard <FiArrowRight />
                  </div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* SIGNUP BUTTON */}
            <Link to="/register">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg font-bold text-white border border-purple-500/50 hover:bg-purple-600/10 transition-all flex items-center justify-center gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiUserPlus />
                Create Seller Account
              </motion.button>
            </Link>
          </form>
        </div>
      </motion.div>


    </div>
  );
}