import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiUser, FiBriefcase, FiMapPin, FiLock, FiArrowRight, FiArrowLeft, FiCheckCircle, FiEye, FiEyeOff
} from "react-icons/fi";

// ✅ LOGO IMPORT
import vistaraa from "../assets/icons/Vistaraa-icon.png"; 

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // States to toggle password visibility
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    businessName: "", businessType: "", gst: "",
    address: "", city: "", state: "", pincode: "",
    password: "", confirmPassword: "",
  });

  const nextStep = () => {
    // Validate current step before proceeding
    if (step === 1 && (!form.firstName || !form.lastName || !form.email || !form.phone)) {
      setError("Please fill all personal details");
      return;
    }
    if (step === 2 && (!form.businessName || !form.businessType)) {
      setError("Please fill all business details");
      return;
    }
    if (step === 3 && (!form.address || !form.city || !form.state || !form.pincode)) {
      setError("Please fill all address details");
      return;
    }
    setError("");
    setStep(step + 1);
  };

  const prevStep = () => {
    setError("");
    setStep(step - 1);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    try {
      // Create Auth Account
      const userCred = await createUserWithEmailAndPassword(
        auth, 
        form.email, 
        form.password
      );
      const sellerId = userCred.user.uid;

      // Remove password fields from data to store in Firestore
      const { password, confirmPassword, ...sellerData } = form;

      // Save Seller Data to Firestore
      await setDoc(doc(db, "sellers", sellerId), {
        ...sellerData,
        sellerId: sellerId,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Add additional metadata
        emailVerified: false,
        approvalStatus: "pending",
        documentsSubmitted: false,
        active: false,
        // Format full name
        fullName: `${form.firstName} ${form.lastName}`.trim()
      });

      alert("Registration submitted successfully! Please wait for admin approval.");
      navigate("/seller/documents");
      
    } catch (err) {
      console.error("Registration error:", err);
      
      // User-friendly error messages
      let errorMessage = "Registration failed. Please try again.";
      
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered. Please use a different email or login.";
      } else if (err.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address. Please enter a valid email.";
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your internet connection.";
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-6 relative overflow-hidden">

      {/* Background Glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-[#1e293b]/60 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden z-10"
      >

        {/* HEADER */}
        <div className="bg-gradient-to-b from-[#0f172a] to-[#1e293b] px-6 py-5 text-center border-b border-white/10">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-md">
              <img src={vistaraa} alt="Vistaraa Logo" className="w-7 h-7 object-contain" />
            </div>
          </div>
          <h1 className="text-xl font-light tracking-[0.35em] text-white uppercase">Seller</h1>
          <div className="h-[2px] w-10 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-2"></div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-gray-400 mt-2">Registration</p>
        </div>

        {/* Progress Bar */}
        <div className="flex h-1 w-full bg-white/5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`flex-1 transition-all duration-700 ${step >= i ? "bg-gradient-to-r from-purple-500 to-blue-500" : "bg-transparent"}`} />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-8 mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
          >
            <p className="text-sm text-red-400 text-center">{error}</p>
          </motion.div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-8 md:p-10">
          <AnimatePresence mode="wait">

            {/* STEP 1: Personal Identity */}
            {step === 1 && (
              <motion.div 
                key="step1" 
                variants={stepVariants} 
                initial="hidden" 
                animate="visible" 
                exit="exit" 
                className="space-y-6"
              >
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FiUser className="text-purple-400" /> Personal Identity
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <input 
                    name="firstName" 
                    value={form.firstName}
                    onChange={handleChange} 
                    placeholder="First Name *" 
                    className="vist-input placeholder-white/70" 
                    required
                  />
                  <input 
                    name="lastName" 
                    value={form.lastName}
                    onChange={handleChange} 
                    placeholder="Last Name *" 
                    className="vist-input" 
                    required
                  />
                </div>
                <input 
                  name="email" 
                  value={form.email}
                  onChange={handleChange} 
                  type="email"
                  placeholder="Email Address *" 
                  className="vist-input" 
                  required
                />
                <input 
                  name="phone" 
                  value={form.phone}
                  onChange={handleChange} 
                  type="tel"
                  placeholder="Phone Number *" 
                  className="vist-input" 
                  required
                  pattern="[0-9]{10}"
                  title="Please enter a valid 10-digit phone number"
                />
              </motion.div>
            )}

            {/* STEP 2: Business Details */}
            {step === 2 && (
              <motion.div 
                key="step2" 
                variants={stepVariants} 
                initial="hidden" 
                animate="visible" 
                exit="exit" 
                className="space-y-6"
              >
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FiBriefcase className="text-blue-400" /> Business Details
                </h2>
                <input 
                  name="businessName" 
                  value={form.businessName}
                  onChange={handleChange} 
                  placeholder="Business Name *" 
                  className="vist-input" 
                  required
                />
                <select 
                  name="businessType" 
                  value={form.businessType}
                  onChange={handleChange} 
                  className="vist-input"
                  required
                >
                  <option value="">Select Business Type *</option>
                  <option value="individual">Individual</option>
                  <option value="private">Private Ltd</option>
                  <option value="partnership">Partnership</option>
                  <option value="llp">LLP</option>
                  <option value="proprietorship">Proprietorship</option>
                </select>
                <input 
                  name="gst" 
                  value={form.gst}
                  onChange={handleChange} 
                  placeholder="GST Number (Optional)" 
                  className="vist-input" 
                />
              </motion.div>
            )}

            {/* STEP 3: Address Details */}
            {step === 3 && (
              <motion.div 
                key="step3" 
                variants={stepVariants} 
                initial="hidden" 
                animate="visible" 
                exit="exit" 
                className="space-y-6"
              >
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FiMapPin className="text-green-400" /> Address Details
                </h2>
                <textarea 
                  name="address" 
                  value={form.address}
                  onChange={handleChange} 
                  placeholder="Full Business Address *" 
                  className="vist-input h-24 resize-none" 
                  rows={4}
                  required
                />
                <div className="grid md:grid-cols-3 gap-4">
                  <input 
                    name="city" 
                    value={form.city}
                    onChange={handleChange} 
                    placeholder="City *" 
                    className="vist-input" 
                    required
                  />
                  <input 
                    name="state" 
                    value={form.state}
                    onChange={handleChange} 
                    placeholder="State *" 
                    className="vist-input" 
                    required
                  />
                  <input 
                    name="pincode" 
                    value={form.pincode}
                    onChange={handleChange} 
                    placeholder="Pincode *" 
                    className="vist-input" 
                    required
                    pattern="[0-9]{6}"
                    title="Please enter a valid 6-digit pincode"
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 4: Account Security */}
            {step === 4 && (
              <motion.div 
                key="step4" 
                variants={stepVariants} 
                initial="hidden" 
                animate="visible" 
                exit="exit" 
                className="space-y-6"
              >
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
                  <FiLock className="text-red-400" /> Account Security
                </h2>
                
                <div className="space-y-6">
                  {/* Password Field */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-300 block">Password *</label>
                    <div className="relative">
                      <input 
                        type={showPass ? "text" : "password"} 
                        name="password"
                        value={form.password}
                        onChange={handleChange} 
                        placeholder="Enter password (min 8 characters)" 
                        className="vist-input pr-12 w-full" 
                        required
                        minLength={8}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                      >
                        {showPass ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Must contain at least 8 characters with letters and numbers</p>
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-300 block">Confirm Password *</label>
                    <div className="relative">
                      <input 
                        type={showConfirmPass ? "text" : "password"} 
                        name="confirmPassword" 
                        value={form.confirmPassword}
                        onChange={handleChange} 
                        placeholder="Confirm your password" 
                        className="vist-input pr-12 w-full" 
                        required
                        minLength={8}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                      >
                        {showConfirmPass ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>
                    {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
                      <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                    )}
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="mt-8 pt-6 border-t border-white/10">
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      id="terms" 
                      required 
                      className="mt-1 h-4 w-4 rounded border-white/30 bg-white/10 focus:ring-2 focus:ring-purple-500"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-300">
                      I agree to the <span className="text-blue-400 cursor-pointer hover:underline">Seller Terms of Service</span>,{" "}
                      <span className="text-blue-400 cursor-pointer hover:underline">Privacy Policy</span>, and{" "}
                      <span className="text-blue-400 cursor-pointer hover:underline">Data Processing Agreement</span>.
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* BUTTONS */}
          <div className="flex justify-between mt-10 gap-4">
            {step > 1 && (
              <button 
                type="button" 
                onClick={prevStep}
                disabled={loading}
                className="flex-1 py-3 bg-[#1e293b] hover:bg-[#334155] rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiArrowLeft /> Back
              </button>
            )}

            {step < 4 ? (
              <button 
                type="button" 
                onClick={nextStep}
                className="flex-[2] py-3 bg-gradient-to-r from-purple-600 to-blue-500 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
              >
                Continue <FiArrowRight />
              </button>
            ) : (
              <button 
                type="submit"
                disabled={loading || form.password !== form.confirmPassword || form.password.length < 8}
                className="flex-[2] py-3 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    Register <FiCheckCircle />
                  </>
                )}
              </button>
            )}
          </div>

          {/* LOGIN LINK */}
          <p className="text-center text-sm text-gray-400 mt-8 pt-6 border-t border-white/10">
            Already have an account?{" "}
            <span 
              onClick={() => navigate("/login")} 
              className="text-blue-400 font-semibold cursor-pointer hover:underline"
            >
              Login here
            </span>
          </p>
        </form>
      </motion.div>

      {/* Input Style */}
      <style>{`
        .vist-input {
          width: 100%;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 12px 14px;
          border-radius: 12px;
          color: white;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
        }
        .vist-input:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 1px rgba(139,92,246,0.3);
          background: rgba(30,41,59,0.8);
        }
        .vist-input::placeholder {
          color: #f7f8fa;
        }
        select.vist-input {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          background-size: 16px;
          padding-right: 40px;
        }
      `}</style>
    </div>
  );
}