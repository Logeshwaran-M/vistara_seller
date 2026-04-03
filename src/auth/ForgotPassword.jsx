import { useState } from "react";
import { FiMail, FiArrowLeft, FiLoader } from "react-icons/fi";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebase";
import { useNavigate, Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset link sent! Check your email inbox.");
    } catch (err) {
      console.error(err);
      setError("Failed to send reset link. Please check the email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-sm border border-gray-100">

        {/* HEADER */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4"
          >
            <FiArrowLeft /> Back to Login
          </button>

          <h1 className="text-2xl font-black text-gray-800">
            Forgot Password?
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter your registered email to receive a reset link.
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleResetPassword} className="space-y-5">

          {/* EMAIL */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative mt-1">
              <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-100 border border-transparent rounded-xl outline-none focus:border-purple-500 focus:bg-white transition-all text-sm"
              />
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <p className="text-sm text-red-500 font-semibold">
              {error}
            </p>
          )}

          {/* SUCCESS */}
          {message && (
            <p className="text-sm text-green-600 font-semibold">
              {message}
            </p>
          )}

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-60"
          >
            {loading ? (
              <>
                <FiLoader className="animate-spin" /> Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        {/* FOOTER */}
        <p className="text-xs text-gray-500 text-center mt-6">
          Remembered your password?{" "}
          <Link to="/login" className="text-purple-600 font-bold">
            Login
          </Link>
        </p>

      </div>
    </div>
  );
}
