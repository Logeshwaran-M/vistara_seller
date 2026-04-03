// EditProduct.jsx - Edit Product Page (Mobile Responsive)
import React, { useState, useEffect } from "react";
import {
  FiPackage, FiDollarSign, FiTag, FiImage, FiLayers, FiUploadCloud,
  FiTrash2, FiPlus, FiCheckCircle, FiAlertCircle, FiEdit2, FiSave,
  FiArrowLeft, FiRefreshCw, FiMenu, FiX, FiChevronDown
} from "react-icons/fi";
import { auth, db, storage } from "../config/firebase";
import {
  collection, doc, getDoc, updateDoc, Timestamp,
  getDocs, query, where
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function EditProduct() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [tab, setTab] = useState("basic");
  const [sellerId, setSellerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 🔥 CATEGORY STATES
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [subunder, setSubunder] = useState([]);

  // 🎯 EDIT MODE STATES
  const [originalProduct, setOriginalProduct] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newPreview, setNewPreview] = useState([]);
  const [removedImages, setRemovedImages] = useState([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    subcategory: "",
    subunder: "",
    brand: "",
    sku: "",
    price: 0,
    salePrice: 0,
    stock: 0,
    hsn: "",
    active: true,
    featured: false,
    metaTitle: "",
    metaDescription: ""
  });

  const [variants, setVariants] = useState([]);

  // ✅ AUTO SELLER ID & FETCH PRODUCT DATA
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setSellerId(user.uid);
      fetchProductData();
    } else {
      navigate("/login");
    }
  }, [id, navigate]);

  // 🔥 FETCH PRODUCT DATA
  const fetchProductData = async () => {
    try {
      setLoadingProduct(true);

      // Fetch product from Firestore
      const productRef = doc(db, "products", id);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        setError("Product not found!");
        setTimeout(() => navigate("/products"), 2000);
        return;
      }

      const productData = productSnap.data();
      setOriginalProduct(productData);

      // Set form data
      setForm({
        name: productData.name || "",
        description: productData.description || "",
        category: productData.category || "",
        subcategory: productData.subcategory || "",
        subunder: productData.subunder || "",
        brand: productData.brand || "",
        sku: productData.sku || "",
        price: productData.price || 0,
        salePrice: productData.salePrice || 0,
        stock: productData.stock || 0,
        hsn: productData.hsn || "",
        active: productData.active !== undefined ? productData.active : true,
        featured: productData.featured || false,
        metaTitle: productData.metaTitle || "",
        metaDescription: productData.metaDescription || ""
      });

      // Set existing images
      if (productData.images && Array.isArray(productData.images)) {
        setExistingImages(productData.images);
      }

      // Set variants
      if (productData.variants && Array.isArray(productData.variants)) {
        setVariants(productData.variants);
      }

    } catch (error) {
      console.error("Error fetching product:", error);
      setError("Failed to load product data");
    } finally {
      setLoadingProduct(false);
    }
  };

  // 🔥 1. FETCH MAIN CATEGORIES
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snap = await getDocs(collection(db, "categories"));
        const catData = snap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));
        setCategories(catData);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setError("Failed to load categories");
      }
    };
    fetchCategories();
  }, []);

  // 🔥 2. FETCH SUBCATEGORIES
  useEffect(() => {
    if (!form.category) {
      setSubcategories([]);
      return;
    }

    const fetchSubcategories = async () => {
      try {
        const q = query(
          collection(db, "subcategories"),
          where("categoryId", "==", form.category)
        );

        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setSubcategories(data);
      } catch (error) {
        console.error("Error fetching subcategories:", error);
      }
    };

    fetchSubcategories();
  }, [form.category]);

  // 🔥 3. FETCH SUB-UNDER
  useEffect(() => {
    if (!form.subcategory) {
      setSubunder([]);
      return;
    }

    const fetchSubunder = async () => {
      try {
        const q = query(
          collection(db, "subunder"),
          where("subcategoryId", "==", form.subcategory)
        );

        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setSubunder(data);
      } catch (error) {
        console.error("Error fetching subunder:", error);
      }
    };

    fetchSubunder();
  }, [form.subcategory]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
    setError("");
    setSuccess("");
  };

  // 📸 IMAGE HANDLING FOR EDIT MODE
  const handleNewImages = (e) => {
    const files = Array.from(e.target.files);

    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Only JPG, PNG, WEBP allowed.`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`File too large: ${file.name}. Max 5MB allowed.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setNewImages(prev => [...prev, ...validFiles]);
    setNewPreview(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))]);
    setError("");
  };

  const removeExistingImage = (index) => {
    const imageToRemove = existingImages[index];
    setExistingImages(prev => prev.filter((_, i) => i !== index));
    setRemovedImages(prev => [...prev, imageToRemove]);
  };

  const removeNewImage = (index) => {
    const newImagesCopy = [...newImages];
    const newPreviewCopy = [...newPreview];

    URL.revokeObjectURL(newPreviewCopy[index]);

    newImagesCopy.splice(index, 1);
    newPreviewCopy.splice(index, 1);

    setNewImages(newImagesCopy);
    setNewPreview(newPreviewCopy);
  };

  // 🎯 DELETE IMAGE FROM STORAGE
  const deleteImageFromStorage = async (imageUrl) => {
    try {
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
      return true;
    } catch (error) {
      console.error("Error deleting image from storage:", error);
      return false;
    }
  };

  // 🔄 VARIANTS
  const addVariant = () => setVariants([...variants, { size: "", price: 0, sku: "", stock: 0 }]);
  const updateVariant = (i, field, value) => {
    const newV = [...variants];
    newV[i][field] = value;
    setVariants(newV);
  };
  const removeVariant = (i) => setVariants(variants.filter((_, index) => index !== i));

  // 💾 UPDATE PRODUCT
  const handleUpdate = async () => {
    const user = auth.currentUser;
    if (!user) {
      setError("Please login first");
      navigate("/login");
      return;
    }

    // Validation
    if (!form.name.trim()) {
      setError("Product name is required");
      return;
    }

    if (!form.category) {
      setError("Please select a category");
      return;
    }

    if (form.price <= 0) {
      setError("Price must be greater than 0");
      return;
    }

    if (form.stock < 0) {
      setError("Stock cannot be negative");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // 1. Upload new images
      const uploadedImages = [];
      if (newImages.length > 0) {
        for (let [index, file] of newImages.entries()) {
          try {
            const timestamp = Date.now();
            const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const fileName = `${timestamp}_${cleanFileName}`;
            const imageRef = ref(storage, `seller-products/${user.uid}/${fileName}`);

            await uploadBytes(imageRef, file);
            const url = await getDownloadURL(imageRef);

            uploadedImages.push({
              url: url,
              name: fileName,
              type: file.type,
              size: file.size,
              uploadedAt: Timestamp.now(),
              isPrimary: (existingImages.length === 0 && index === 0) ? true : false
            });

          } catch (uploadError) {
            console.error(`Error uploading image ${file.name}:`, uploadError);
            throw new Error(`Failed to upload image: ${file.name}`);
          }
        }
      }

      // 2. Delete removed images from storage
      if (removedImages.length > 0) {
        for (const image of removedImages) {
          await deleteImageFromStorage(image.url);
        }
      }

      // 3. Combine existing and new images (excluding removed ones)
      const finalImages = [
        ...existingImages,
        ...uploadedImages
      ];

      // Ensure at least one primary image
      if (finalImages.length > 0 && !finalImages.some(img => img.isPrimary)) {
        finalImages[0].isPrimary = true;
      }

      // Get category names
      const categoryName = categories.find(c => c.id === form.category)?.name || "";
      const subcategoryName = subcategories.find(s => s.id === form.subcategory)?.name || "";
      const subunderName = subunder.find(s => s.id === form.subunder)?.name || "";

      // Update product data
      const updatedProductData = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        subcategory: form.subcategory || null,
        subunder: form.subunder || null,
        categoryName,
        subcategoryName,
        subunderName,
        brand: form.brand.trim() || null,
        sku: form.sku.trim(),
        price: parseFloat(form.price) || 0,
        salePrice: parseFloat(form.salePrice) || 0,
        stock: parseInt(form.stock) || 0,
        hsn: form.hsn.trim() || null,
        active: form.active,
        featured: form.featured,
        variants: variants.length > 0 ? variants : [],
        images: finalImages,
        updatedAt: Timestamp.now(),
        slug: form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
        metaTitle: form.metaTitle.trim() || form.name.trim(),
        metaDescription: form.metaDescription.trim() || form.description.substring(0, 160).trim(),
        sellerId: user.uid,
        sellerEmail: user.email,
        status: "pending",
        approved: false
      };

      // Update in Firestore
      const productRef = doc(db, "products", id);
      await updateDoc(productRef, updatedProductData);

      setSuccess("✅ Product updated successfully! Waiting for admin approval.");

      setTimeout(() => {
        navigate("/products");
      }, 2000);

    } catch (err) {
      console.error("Error updating product:", err);

      if (err.code === 'storage/unauthorized') {
        setError("Storage permission denied.");
      } else if (err.code === 'storage/quota-exceeded') {
        setError("Storage quota exceeded. Please reduce image sizes.");
      } else {
        setError(err.message || "Failed to update product. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset form to original values
  const handleReset = () => {
    if (originalProduct) {
      setForm({
        name: originalProduct.name || "",
        description: originalProduct.description || "",
        category: originalProduct.category || "",
        subcategory: originalProduct.subcategory || "",
        subunder: originalProduct.subunder || "",
        brand: originalProduct.brand || "",
        sku: originalProduct.sku || "",
        price: originalProduct.price || 0,
        salePrice: originalProduct.salePrice || 0,
        stock: originalProduct.stock || 0,
        hsn: originalProduct.hsn || "",
        active: originalProduct.active !== undefined ? originalProduct.active : true,
        featured: originalProduct.featured || false,
        metaTitle: originalProduct.metaTitle || "",
        metaDescription: originalProduct.metaDescription || ""
      });

      setExistingImages(originalProduct.images || []);
      setVariants(originalProduct.variants || []);
      setNewImages([]);
      setNewPreview([]);
      setRemovedImages([]);

      setSuccess("Form reset to original values");
    }
  };

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      newPreview.forEach(url => URL.revokeObjectURL(url));
    };
  }, [newPreview]);

  // Loading state
  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading product data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pt-16 md:pt-20 md:ml-72 p-3 sm:p-4 md:p-8 font-sans text-slate-800">
      {/* Mobile Header with Menu Toggle */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white shadow-sm z-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/products")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 p-2"
          >
            <FiArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-slate-900 truncate max-w-[180px]">Edit Product</h1>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-slate-600 hover:text-slate-900 p-2"
          >
            {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto"
      >
        {/* Desktop Header */}
        <header className="mb-6 md:mb-8 hidden md:block">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Edit Product</h1>
              <p className="text-xs md:text-sm text-slate-500 mt-1">Product ID: {id}</p>
            </div>
            <button
              onClick={() => navigate("/products")}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors text-sm md:text-base"
            >
              <FiArrowLeft /> Back to Products
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              Edit Mode
            </span>
            <p className="text-xs md:text-sm text-slate-500 italic truncate">ID: {sellerId || "Authenticating..."}</p>
          </div>
        </header>

        {/* Mobile Tab Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden mb-4 bg-white rounded-xl shadow-lg p-4"
          >
            <div className="space-y-2">
              {[
                { id: "basic", label: "Basic Info", icon: <FiPackage size={16} /> },
                { id: "pricing", label: "₹ Pricing", icon: <FiDollarSign size={16} /> },
                { id: "category", label: "Category", icon: <FiTag size={16} /> },
                { id: "media", label: "Media", icon: <FiImage size={16} /> },
                { id: "variants", label: "Variants", icon: <FiLayers size={16} /> },
                { id: "seo", label: "SEO", icon: <FiEdit2 size={16} /> },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    tab === item.id
                      ? "bg-purple-50 text-purple-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                  {tab === item.id && (
                    <div className="ml-auto w-2 h-2 bg-purple-600 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* SUCCESS MESSAGE */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 md:mb-6 p-3 md:p-4 bg-emerald-50 border border-emerald-200 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <FiCheckCircle className="text-emerald-500 flex-shrink-0" />
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          </motion.div>
        )}

        {/* ERROR MESSAGE */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 md:mb-6 p-3 md:p-4 bg-red-50 border border-red-200 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <FiAlertCircle className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </motion.div>
        )}

        {/* TABS NAVIGATION - Desktop Only */}
        <div className="hidden md:flex gap-2 mb-6 md:mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <Tab label="Basic Info" icon={<FiPackage />} active={tab === "basic"} onClick={() => setTab("basic")} />
          <Tab label="₹ Pricing" icon={<FiDollarSign />} active={tab === "pricing"} onClick={() => setTab("pricing")} />
          <Tab label="Category" icon={<FiTag />} active={tab === "category"} onClick={() => setTab("category")} />
          <Tab label="Media" icon={<FiImage />} active={tab === "media"} onClick={() => setTab("media")} />
          <Tab label="Variants" icon={<FiLayers />} active={tab === "variants"} onClick={() => setTab("variants")} />
          <Tab label="SEO" icon={<FiEdit2 />} active={tab === "seo"} onClick={() => setTab("seo")} />
        </div>

        {/* Current Tab Indicator - Mobile Only */}
        <div className="md:hidden mb-4">
          <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              {tab === "basic" && <FiPackage className="text-purple-600" />}
              {tab === "pricing" && <FiDollarSign className="text-purple-600" />}
              {tab === "category" && <FiTag className="text-purple-600" />}
              {tab === "media" && <FiImage className="text-purple-600" />}
              {tab === "variants" && <FiLayers className="text-purple-600" />}
              {tab === "seo" && <FiEdit2 className="text-purple-600" />}
              <h2 className="font-bold text-slate-800">
                {tab === "basic" && "Basic Information"}
                {tab === "pricing" && "Pricing & Inventory"}
                {tab === "category" && "Categorization"}
                {tab === "media" && "Product Gallery"}
                {tab === "variants" && "Product Variants"}
                {tab === "seo" && "SEO Optimization"}
              </h2>
            </div>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-slate-500 hover:text-slate-700"
            >
              <FiChevronDown size={20} />
            </button>
          </div>
        </div>

        {/* TAB CONTENT */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {tab === "basic" && (
                <Card title="Basic Information">
                  <Input
                    label="Product Name *"
                    name="name"
                    placeholder="e.g. Premium Cotton T-Shirt"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                  <Textarea
                    label="Description *"
                    name="description"
                    placeholder="Describe the features, materials, and benefits..."
                    value={form.description}
                    onChange={handleChange}
                    required
                  />
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mt-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="active"
                        checked={form.active}
                        onChange={handleChange}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Active Product</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="featured"
                        checked={form.featured}
                        onChange={handleChange}
                        className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-slate-700">Featured Product</span>
                    </label>
                  </div>
                </Card>
              )}

              {tab === "pricing" && (
                <Card title="Pricing & Inventory">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <Input
                      label="Regular Price (₹) *"
                      name="price"
                      type="number"
                      value={form.price}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      required
                    />
                    <Input
                      label="Sale Price (₹)"
                      name="salePrice"
                      type="number"
                      value={form.salePrice}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                    />
                    <Input
                      label="Stock Count *"
                      name="stock"
                      type="number"
                      value={form.stock}
                      onChange={handleChange}
                      min="0"
                      required
                    />
                    <Input
                      label="HSN Code"
                      name="hsn"
                      value={form.hsn}
                      onChange={handleChange}
                      placeholder="e.g. 5208"
                    />
                  </div>
                </Card>
              )}

              {tab === "category" && (
                <Card title="Categorization">
                  <div className="space-y-4 md:space-y-6">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-2 block">Main Category *</label>
                      <select
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        className="w-full border-slate-200 border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer bg-white text-sm md:text-base"
                        required
                      >
                        <option value="">Select Category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                      <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">Subcategory</label>
                        <select
                          name="subcategory"
                          value={form.subcategory}
                          onChange={handleChange}
                          disabled={!form.category || subcategories.length === 0}
                          className="w-full border-slate-200 border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer bg-white text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Select Subcategory</option>
                          {subcategories.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">Sub-Under Category</label>
                        <select
                          name="subunder"
                          value={form.subunder}
                          onChange={handleChange}
                          disabled={!form.subcategory || subunder.length === 0}
                          className="w-full border-slate-200 border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer bg-white text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Select Sub Under</option>
                          {subunder.map((su) => (
                            <option key={su.id} value={su.id}>
                              {su.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                      <Input
                        label="Brand Name"
                        name="brand"
                        value={form.brand}
                        onChange={handleChange}
                        placeholder="e.g. Nike, Adidas"
                      />
                      <Input
                        label="Global SKU"
                        name="sku"
                        value={form.sku}
                        onChange={handleChange}
                        placeholder="Auto-generated if empty"
                      />
                    </div>
                  </div>
                </Card>
              )}

              {tab === "media" && (
                <Card title="Product Gallery">
                  <div className="space-y-4 md:space-y-6">
                    {/* Existing Images */}
                    {existingImages.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">
                          Existing Images ({existingImages.length})
                          <span className="ml-2 text-xs font-normal text-blue-600">
                            Click to remove
                          </span>
                        </h3>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
                          {existingImages.map((img, i) => (
                            <motion.div
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              key={i}
                              className="relative group overflow-hidden rounded-xl h-28 sm:h-32 border shadow-sm"
                            >
                              {img.isPrimary && (
                                <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-blue-500 text-white text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded z-10">
                                  Primary
                                </div>
                              )}
                              <img 
                                src={img.url} 
                                className="h-full w-full object-cover"
                                alt={`existing-${i}`}
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  onClick={() => removeExistingImage(i)}
                                  className="text-white bg-red-500 hover:bg-red-600 p-1.5 sm:p-2 rounded-full transition-colors"
                                  title="Remove image"
                                >
                                  <FiTrash2 size={14} className="sm:w-4 sm:h-4" />
                                </button>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] sm:text-xs p-1 sm:p-1.5 text-center truncate">
                                {img.name?.substring(0, 12) || `Img ${i + 1}`}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New Images Upload Section */}
                    <div className="border-2 border-dashed border-slate-300 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 text-center hover:border-blue-500 transition-colors bg-white group">
                      <input
                        type="file"
                        multiple
                        onChange={handleNewImages}
                        id="file-upload"
                        className="hidden"
                        accept="image/jpeg,image/png,image/jpg,image/webp"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                        <FiUploadCloud className="mx-auto text-3xl sm:text-4xl text-slate-400 group-hover:text-blue-500 transition-colors mb-2 sm:mb-3" />
                        <p className="text-slate-600 font-medium text-sm sm:text-base mb-1">Click to upload additional images</p>
                        <p className="text-xs sm:text-sm text-slate-400">PNG, JPG, WEBP (Max 5MB each)</p>
                        <p className="text-xs text-slate-400 mt-1">Recommended: 800x800px</p>
                        <span className="mt-3 sm:mt-4 px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                          Add More Images
                        </span>
                      </label>
                    </div>

                    {/* New Images Preview */}
                    {newPreview.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">
                          New Images to Upload ({newPreview.length})
                        </h3>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
                          {newPreview.map((img, i) => (
                            <motion.div
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              key={i}
                              className="relative group overflow-hidden rounded-xl h-28 sm:h-32 border shadow-sm"
                            >
                              <img src={img} className="h-full w-full object-cover" alt={`new-${i}`} loading="lazy" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  onClick={() => removeNewImage(i)}
                                  className="text-white bg-red-500 hover:bg-red-600 p-1.5 sm:p-2 rounded-full transition-colors"
                                >
                                  <FiTrash2 size={14} className="sm:w-4 sm:h-4" />
                                </button>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] sm:text-xs p-1 sm:p-1.5 text-center truncate">
                                {newImages[i]?.name?.substring(0, 12)}...
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {tab === "variants" && (
                <Card title="Product Variants">
                  <div className="space-y-4 md:space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h4 className="font-medium text-slate-700 text-sm sm:text-base">Add size/color options</h4>
                        <p className="text-xs sm:text-sm text-slate-500">Optional - for products with different variations</p>
                      </div>
                      <button
                        onClick={addVariant}
                        className="flex items-center gap-2 bg-slate-900 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 text-sm sm:text-base w-full sm:w-auto justify-center"
                      >
                        <FiPlus /> Add Variant
                      </button>
                    </div>

                    {variants.length > 0 ? (
                      <div className="space-y-3">
                        {/* Header for Desktop */}
                        <div className="hidden md:grid grid-cols-5 gap-3 text-xs font-semibold text-slate-500 px-2">
                          <div>Size/Color</div>
                          <div>Price (₹)</div>
                          <div>SKU</div>
                          <div>Stock</div>
                          <div>Action</div>
                        </div>

                        {/* Variants List - Mobile Stacked, Desktop Grid */}
                        <div className="space-y-3">
                          {variants.map((v, i) => (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              key={i}
                              className="md:grid md:grid-cols-5 gap-3 p-3 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100"
                            >
                              {/* Mobile: Card View */}
                              <div className="md:hidden space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-slate-700">Variant {i + 1}</span>
                                  <button
                                    onClick={() => removeVariant(i)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <FiTrash2 size={16} />
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Size/Color</label>
                                    <input
                                      placeholder="e.g., M, L, XL"
                                      value={v.size}
                                      onChange={(e) => updateVariant(i, "size", e.target.value)}
                                      className="w-full border-slate-200 border p-2 rounded-lg bg-white text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Price (₹)</label>
                                    <input
                                      placeholder="0.00"
                                      type="number"
                                      value={v.price}
                                      onChange={(e) => updateVariant(i, "price", e.target.value)}
                                      min="0"
                                      step="0.01"
                                      className="w-full border-slate-200 border p-2 rounded-lg bg-white text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-slate-500 mb-1 block">SKU</label>
                                    <input
                                      placeholder="Variant SKU"
                                      value={v.sku}
                                      onChange={(e) => updateVariant(i, "sku", e.target.value)}
                                      className="w-full border-slate-200 border p-2 rounded-lg bg-white text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Stock</label>
                                    <input
                                      placeholder="0"
                                      type="number"
                                      value={v.stock}
                                      onChange={(e) => updateVariant(i, "stock", e.target.value)}
                                      min="0"
                                      className="w-full border-slate-200 border p-2 rounded-lg bg-white text-sm"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Desktop: Grid View */}
                              <div className="hidden md:block">
                                <input
                                  placeholder="e.g., M, L, XL or Red, Blue"
                                  value={v.size}
                                  onChange={(e) => updateVariant(i, "size", e.target.value)}
                                  className="w-full border-slate-200 border p-2.5 rounded-lg bg-white text-sm"
                                />
                              </div>
                              <div className="hidden md:block">
                                <input
                                  placeholder="0.00"
                                  type="number"
                                  value={v.price}
                                  onChange={(e) => updateVariant(i, "price", e.target.value)}
                                  min="0"
                                  step="0.01"
                                  className="w-full border-slate-200 border p-2.5 rounded-lg bg-white text-sm"
                                />
                              </div>
                              <div className="hidden md:block">
                                <input
                                  placeholder="Variant SKU"
                                  value={v.sku}
                                  onChange={(e) => updateVariant(i, "sku", e.target.value)}
                                  className="w-full border-slate-200 border p-2.5 rounded-lg bg-white text-sm"
                                />
                              </div>
                              <div className="hidden md:block">
                                <input
                                  placeholder="0"
                                  type="number"
                                  value={v.stock}
                                  onChange={(e) => updateVariant(i, "stock", e.target.value)}
                                  min="0"
                                  className="w-full border-slate-200 border p-2.5 rounded-lg bg-white text-sm"
                                />
                              </div>
                              <div className="hidden md:flex justify-center">
                                <button
                                  onClick={() => removeVariant(i)}
                                  className="bg-red-50 text-red-500 p-2.5 rounded-lg hover:bg-red-500 hover:text-white transition-all flex justify-center items-center"
                                >
                                  <FiTrash2 size={16} />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 sm:py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <FiLayers className="mx-auto text-3xl sm:text-4xl mb-2 sm:mb-3" />
                        <p className="font-medium text-slate-600 text-sm sm:text-base mb-1">No variants added yet</p>
                        <p className="text-xs sm:text-sm">Click "Add Variant" to create size or color options</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {tab === "seo" && (
                <Card title="SEO Optimization">
                  <div className="space-y-4 md:space-y-6">
                    <Input
                      label="Meta Title"
                      name="metaTitle"
                      placeholder="e.g. Premium Cotton T-Shirt - Best Quality | Your Brand"
                      value={form.metaTitle}
                      onChange={handleChange}
                    />
                    <Textarea
                      label="Meta Description"
                      name="metaDescription"
                      placeholder="Enter a compelling description for search engines (max 160 characters)"
                      value={form.metaDescription}
                      onChange={handleChange}
                      rows="3"
                    />
                    <div className="bg-slate-50 p-3 sm:p-4 rounded-xl">
                      <p className="text-sm font-semibold text-slate-700 mb-2">Preview:</p>
                      <div className="bg-white p-3 sm:p-4 rounded-lg border">
                        <p className="text-blue-600 text-base sm:text-lg font-medium truncate">
                          {form.metaTitle || form.name}
                        </p>
                        <p className="text-slate-600 text-xs sm:text-sm mt-1 line-clamp-2">
                          {form.metaDescription || form.description.substring(0, 160)}
                        </p>
                        <p className="text-green-600 text-[10px] sm:text-xs mt-1 truncate">
                          yourstore.com/products/{form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* FOOTER ACTIONS */}
        <footer className="flex flex-col gap-4 sm:flex-row justify-between items-start sm:items-center mt-6 md:mt-10 pb-20 md:pb-8 pt-4 md:pt-6 border-t border-slate-200">
          <div className="text-sm text-slate-500 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 px-3 sm:px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors text-sm"
            >
              <FiRefreshCw /> Reset Changes
            </button>
            <p className="flex items-center gap-2 text-xs sm:text-sm">
              <FiCheckCircle className="text-green-500" />
              Edit mode - Changes require admin approval
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={() => navigate("/products")}
              className="px-4 sm:px-6 py-2.5 sm:py-3 text-slate-600 font-semibold hover:text-slate-900 transition-colors text-center border border-slate-300 rounded-xl hover:bg-slate-50 text-sm sm:text-base"
              disabled={loading}
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              onClick={handleUpdate}
              className={`flex items-center justify-center gap-2 px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-bold shadow-xl transition-all text-sm sm:text-base ${
                loading 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-200'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <FiSave className="text-sm sm:text-lg" /> Update Product
                </>
              )}
            </motion.button>
          </div>
        </footer>
      </motion.div>
    </div>
  );
}

/* 🎨 REUSABLE STYLED COMPONENTS */

function Tab({ label, icon, active, onClick }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 rounded-2xl whitespace-nowrap transition-all duration-300 font-bold text-xs md:text-sm
        ${active ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100"}`}
    >
      <span>{icon}</span>
      {label}
    </motion.button>
  );
}

function Card({ title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50"
    >
      <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-4 sm:mb-6 flex items-center gap-3">
        <div className="w-1.5 sm:w-2 h-4 sm:h-6 bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full" />
        <span className="hidden md:inline">{title}</span>
        <span className="md:hidden">{title.length > 20 ? title.substring(0, 20) + "..." : title}</span>
      </h2>
      {children}
    </motion.div>
  );
}

function Input({ label, name, type = "text", value, onChange, placeholder, disabled, required, min, step, className = "" }) {
  return (
    <div className="flex-1 mb-3 sm:mb-0">
      {label && (
        <label className="text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-2 block">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        disabled={disabled}
        required={required}
        min={min}
        step={step}
        className={`w-full border-slate-200 border p-2.5 sm:p-3 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base ${className}`}
      />
    </div>
  );
}

function Textarea({ label, name, value, onChange, placeholder, required, rows = 4 }) {
  return (
    <div className="mt-3 sm:mt-4">
      <label className="text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-2 block">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full border-slate-200 border p-2.5 sm:p-3 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 resize-none text-sm sm:text-base"
      />
    </div>
  );
}