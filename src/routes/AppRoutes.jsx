// AppRoutes.js
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "../pages/Dashboard";
import Products from "../pages/Products";
import AddProduct from "../pages/AddProduct";
import EditProduct from "../pages/EditProduct";
import Orders from "../pages/Orders";
import Profile from "../pages/Profile";
import SellerDocuments from "../pages/SellerDocuments";
import SellerPendingApproval from "../pages/SellerPendingApproval";

import Login from "../auth/Login";
import Register from "../auth/Register";
import ForgotPassword from "../auth/ForgotPassword"; // ✅ ADDED

import SellerLayout from "../components/layout/SellerLayout";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* AUTH */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} /> {/* ✅ ADDED */}

        {/* PUBLIC SELLER FLOW (NOT PROTECTED) */}
        <Route path="/seller/documents" element={<SellerDocuments />} />
        <Route path="/seller/pending" element={<SellerPendingApproval />} />

        {/* PROTECTED SELLER PANEL */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <SellerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="products/add" element={<AddProduct />} />
          <Route path="products/edit/:id" element={<EditProduct />} />
          <Route path="orders" element={<Orders />} />
          <Route path="profile" element={<Profile />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}
