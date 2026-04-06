import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../config/firebase";

export default function SellerPendingApproval() {
  const [status, setStatus] = useState("loading"); 
  const navigate = useNavigate();

  // 🔥 Fetch Seller Status from Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return navigate("/login");

    const sellerRef = doc(db, "sellers", user.uid);

    const unsub = onSnapshot(sellerRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStatus(data.status);
      }
    });

    return () => unsub();
  }, [navigate]);

  // Redirect when approved
  useEffect(() => {
    if (status === "approved") {
      navigate("/");
    }
  }, [status, navigate]);

  // Loading UI
  if (status === "loading") {
    return <h1 className="text-center mt-20 text-xl">Checking approval status...</h1>;
  }

  // BLOCKED UI
  if (status === "blocked") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-100">
        <div className="bg-white p-10 rounded-2xl shadow-xl text-center max-w-md">
          <h1 className="text-3xl font-bold text-red-600">Account Blocked</h1>
          <p className="mt-3 text-gray-600">
            Your seller account has been blocked. Contact support.
          </p>
        </div>
      </div>
    );
  }

  // PENDING UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100 px-4">
      <div className="bg-white shadow-xl rounded-2xl p-10 max-w-md w-full text-center border border-gray-200">

        <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <Clock className="w-10 h-10 text-blue-600" />
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
          Review in Progress
        </h1>

        <p className="text-gray-700 text-md mb-1">
          Your documents have been received successfully.
        </p>
        <p className="text-gray-500 text-sm">
          Our team is reviewing your information. You will be redirected once approved.
        </p>

        <div className="mt-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce delay-150"></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce delay-300"></div>
          </div>
          <p className="text-blue-700 font-semibold mt-3 text-sm">
            Waiting for approval...
          </p>
        </div>
      </div>
    </div>
  );
}
