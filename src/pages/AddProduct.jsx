import React, { useState, useEffect } from "react";
import { FiPackage, FiTag, FiImage, FiLayers, FiUploadCloud, FiTrash2, FiPlus, FiCheckCircle, FiAlertCircle, FiArrowLeft, FiChevronRight, FiInfo } from "react-icons/fi";
import { auth, db, storage } from "../config/firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";

import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";


export default function AddProduct() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("basic");
  const [sellerId, setSellerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // Check mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 🔥 CATEGORY STATES
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [subunder, setSubunder] = useState([]);

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
  });

  const [images, setImages] = useState([]);
  const [preview, setPreview] = useState([]);
  const [variants, setVariants] = useState([]);

  // ✅ AUTO SELLER ID
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setSellerId(user.uid);
    } else {
      navigate("/login");
    }
  }, [navigate]);

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


  const s3 = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY,       // Only for dev/testing (unsafe for prod!)
    secretAccessKey:  import.meta.env.VITE_AWS_SECRET_KEY,   // Unsafe in production
    // optional
  },
});

 
const uploadFileToS3 = async (file) => {
  try {
    const fileName = `${Date.now()}_${file.name}`;
    const key = `seller-products/${fileName}`;
    const bucket = import.meta.env.VITE_AWS_BUCKET_NAME;
    const region = import.meta.env.VITE_AWS_REGION;

    const upload = new Upload({
      client: s3,
      params: {
        Bucket: bucket,
        Key: key,
        Body: file,
        ContentType: file.type,
      },
    });

    upload.on("httpUploadProgress", (progress) => {
      console.log(`Uploading ${file.name}:`, progress.loaded, "/", progress.total);
    });

    await upload.done();

    // ✅ CORRECT URL
    const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return {
      url: fileUrl,
      name: fileName,
    };
  } catch (err) {
    console.error("S3 Upload Error:", err);
    throw err;
  }
};
  // 🔥 2. FETCH SUBCATEGORIES (Triggers when category changes)
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
        // Reset subcategory and subunder when category changes
        setForm(prev => ({ ...prev, subcategory: "", subunder: "" }));
        setSubunder([]);
      } catch (error) {
        console.error("Error fetching subcategories:", error);
      }
    };

    fetchSubcategories();
  }, [form.category]);

  // 🔥 3. FETCH SUB-UNDER (Triggers when subcategory changes)
  useEffect(() => {
    if (!form.subcategory) {
      setSubunder([]);
      return;
    }

    const fetchSubunder = async () => {
      try {
        const q = query(
          collection(db, "subunder"),
          where("subcategoryId", "==", form.subcategory) // Fixed: should be subcategoryId
        );

        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setSubunder(data);
        // Reset subunder when subcategory changes
        setForm(prev => ({ ...prev, subunder: "" }));
      } catch (error) {
        console.error("Error fetching subunder:", error);
      }
    };

    fetchSubunder();
  }, [form.subcategory]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
    setError(""); // Clear error on change
  };

const handleImages = (e) => {
  const files = Array.from(e.target.files);
  setImages(prev => [...prev, ...files]);
  setPreview(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
};

  const removeImage = (index) => {
    const newImages = [...images];
    const newPreview = [...preview];

    // Revoke object URL to prevent memory leak
    URL.revokeObjectURL(newPreview[index]);

    newImages.splice(index, 1);
    newPreview.splice(index, 1);

    setImages(newImages);
    setPreview(newPreview);
  };

  const addVariant = () => setVariants([...variants, { size: "", price: 0, sku: "", stock: 0 }]);
  const updateVariant = (i, field, value) => {
    const newV = [...variants];
    newV[i][field] = value;
    setVariants(newV);
  };
  const removeVariant = (i) => setVariants(variants.filter((_, index) => index !== i));
const handleSubmit = async () => {
  const user = auth.currentUser;
  if (!user) {
    setError("Please login first");
    navigate("/login");
    return;
  }

  // Validation
  if (!form.name.trim()) return setError("Product name is required");
  if (!form.category) return setError("Please select a category");
  if (form.price <= 0) return setError("Price must be greater than 0");
  if (form.stock < 0) return setError("Stock cannot be negative");

  setLoading(true);
  setError("");

  try {
    let imageUrls = [];

    // Upload images using your S3 function
    if (images.length > 0) {
      for (let [index, file] of images.entries()) {
        try {
          const uploaded = await uploadFileToS3(file);
          imageUrls.push({
            url: uploaded.url,
            name: uploaded.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date(),
            isPrimary: index === 0,
          });
        } catch (uploadError) {
          console.error(`Error uploading ${file.name}:`, uploadError);
          throw new Error(`Failed to upload image: ${file.name}. Please check your S3 permissions.`);
        }
      }
    }

    // Category names
    const categoryName = categories.find(c => c.id === form.category)?.name || "";
    const subcategoryName = subcategories.find(s => s.id === form.subcategory)?.name || "";
    const subunderName = subunder.find(s => s.id === form.subunder)?.name || "";

    // SKU
    const finalSku = form.sku || `${categoryName.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    // Product data
    const productData = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      subcategory: form.subcategory || null,
      subunder: form.subunder || null,
      categoryName,
      subcategoryName,
      subunderName,
      hsn:form.hsn,
      brand: form.brand.trim() || null,
      sku: finalSku,
      price: parseFloat(form.price),
      salePrice: parseFloat(form.salePrice) || 0,
      stock: parseInt(form.stock),
      active: form.active,
      featured: form.featured,
      sellerId: user.uid,
      sellerEmail: user.email,
      variants: variants.length > 0 ? variants : [],
      images: imageUrls,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "pending",
      approved: false,
      views: 0,
      sales: 0,
      rating: 0,
      reviewsCount: 0,
      slug: form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-"),
      metaTitle: form.name.trim(),
      metaDescription: form.description.substring(0, 160).trim(),
      lowStockThreshold: 10,
      trackInventory: true,
      tags: [],
      attributes: [],
      specifications: {},
    };

    // Add product to Firestore
    await addDoc(collection(db, "products"), productData);

    alert("✅ Product Added Successfully! Awaiting admin approval.");
    navigate("/products");

  } catch (err) {
    console.error("Error adding product:", err);
    setError(err.message || "Failed to add product. Please try again.");
  } finally {
    setLoading(false);
  }
};

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      preview.forEach(url => URL.revokeObjectURL(url));
    };
  }, [preview]);

  // Mobile back handler
  const handleMobileBack = () => {
    if (tab !== "basic") {
      // Go to previous tab
      const tabs = ["basic", "pricing", "category", "media", "variants"];
      const currentIndex = tabs.indexOf(tab);
      if (currentIndex > 0) {
        setTab(tabs[currentIndex - 1]);
      }
    } else {
      navigate("/products");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] md:ml-72 pt-16 md:pt-28 px-3 sm:px-4 md:px-8 lg:px-12 font-sans text-slate-800">
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between md:hidden">
          <button 
            onClick={handleMobileBack}
            className="flex items-center gap-2 text-slate-700"
          >
            <FiArrowLeft className="text-lg" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="text-sm font-bold text-slate-900">Add Product</h1>
          <div className="w-8"></div> {/* Spacer for alignment */}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto"
      >
        {/* Desktop Header */}
        <header className={`mb-4 md:mb-8 ${isMobile ? 'hidden md:block' : ''}`}>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            Add New Product
          </h1>
          <div className="flex items-center gap-2 mt-1 md:mt-2 flex-wrap">
            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              Seller Mode
            </span>
            <p className="text-xs md:text-sm text-slate-500 truncate max-w-[200px] sm:max-w-full">
              ID: {sellerId || "Authenticating..."}
            </p>
          </div>
        </header>

        {/* ERROR MESSAGE */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 md:mb-6 p-3 md:p-4 bg-red-50 border border-red-200 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <FiAlertCircle className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs md:text-sm text-red-700 flex-1">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Progress Steps for Mobile */}
        {isMobile && (
          <div className="mb-4">
            <div className="flex items-center justify-between px-1 mb-2">
              {["Basic", "Pricing", "Category", "Media", "Variants"].map((step, index) => {
                const stepValue = ["basic", "pricing", "category", "media", "variants"][index];
                const isActive = tab === stepValue;
                const isCompleted = ["basic", "pricing", "category", "media", "variants"].indexOf(tab) > index;
                
                return (
                  <div key={step} className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      isActive || isCompleted 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {isCompleted ? "✓" : index + 1}
                    </div>
                    <span className={`text-[10px] mt-1 text-center ${isActive ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ 
                  width: `${(["basic", "pricing", "category", "media", "variants"].indexOf(tab) + 1) * 20}%` 
                }}
              />
            </div>
          </div>
        )}

        {/* TABS NAVIGATION - Desktop */}
        <div className={`hidden md:flex gap-2 mb-6 md:mb-8 overflow-x-auto pb-2 scrollbar-hide`}>
          <Tab label="Basic Info" icon={<FiPackage />} active={tab === "basic"} onClick={() => setTab("basic")} />
          <Tab label="Pricing" active={tab === "pricing"} onClick={() => setTab("pricing")} />
          <Tab label="Category" icon={<FiTag />} active={tab === "category"} onClick={() => setTab("category")} />
          <Tab label="Media" icon={<FiImage />} active={tab === "media"} onClick={() => setTab("media")} />
          <Tab label="Variants" icon={<FiLayers />} active={tab === "variants"} onClick={() => setTab("variants")} />
        </div>

        {/* Mobile Tab Selector */}
        {isMobile && (
          <div className="mb-4 md:hidden">
            <select
              value={tab}
              onChange={(e) => setTab(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="basic">📝 Basic Information</option>
              <option value="pricing">💰 Pricing & Inventory</option>
              <option value="category">🏷️ Category & Brand</option>
              <option value="media">🖼️ Product Images</option>
              <option value="variants">🎨 Variants & Options</option>
            </select>
          </div>
        )}

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
                <Card title="Essential Information">
                  <Input
                    label="Product Name"
                    name="name"
                    placeholder="e.g. Premium Cotton T-Shirt"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                  <Textarea
                    label="Description"
                    name="description"
                    placeholder="Describe the features, materials, and benefits..."
                    value={form.description}
                    onChange={handleChange}
                    required
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-6">
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
                      label="Regular Price (₹)"
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
                      label="Stock Count"
                      name="stock"
                      type="number"
                      value={form.stock}
                      onChange={handleChange}
                      min="0"
                      required
                    />
                    <div>
                      <Input
                        label="HSN Code"
                        name="hsn"
                        value={form.hsn}
                        onChange={handleChange}
                        placeholder="e.g. 5208"
                      />
                      <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                        <FiInfo className="text-slate-400" />
                        <span>Required for GST invoices</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {tab === "category" && (
                <Card title="Categorization">
                  <div className="space-y-4 md:space-y-6">

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
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
                      <div>
                        
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">Subcategory</label>
                        <select
                          name="subcategory"
                          value={form.subcategory}
                          onChange={handleChange}
                          disabled={!form.category || subcategories.length === 0}
                          className="w-full border-slate-200 border p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer bg-white disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                        >
                          <option value="">Select Subcategory</option>
                          {subcategories.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
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
                    <div className="border-2 border-dashed border-slate-300 rounded-xl md:rounded-2xl p-4 md:p-8 text-center hover:border-blue-500 transition-colors bg-white group">
                      <input
                        type="file"
                        multiple
                        onChange={handleImages}
                        id="file-upload"
                        className="hidden"
                        accept="image/jpeg,image/png,image/jpg,image/webp"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                        <FiUploadCloud className="mx-auto text-3xl md:text-4xl text-slate-400 group-hover:text-blue-500 transition-colors mb-2 md:mb-3" />
                        <p className="text-sm md:text-base text-slate-600 font-medium mb-1">Click to upload or drag and drop</p>
                        <p className="text-xs md:text-sm text-slate-400">PNG, JPG, WEBP (Max 5MB each)</p>
                        <p className="text-xs text-slate-400 mt-1">Recommended: 800x800px</p>
                        <span className="mt-3 md:mt-4 px-4 py-2 md:px-5 md:py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                          Choose Files
                        </span>
                      </label>
                    </div>

                    {preview.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3 md:mb-4">
                          <h3 className="text-sm md:text-base font-semibold text-slate-700">
                            Uploaded Images ({preview.length})
                          </h3>
                          {preview.length > 0 && (
                            <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                              <FiInfo className="text-xs" />
                              First image is primary
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                          {preview.map((img, i) => (
                            <motion.div
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              key={i}
                              className="relative group overflow-hidden rounded-lg md:rounded-xl h-24 sm:h-28 md:h-32 border shadow-sm"
                            >
                              {i === 0 && (
                                <div className="absolute top-1 left-1 md:top-2 md:left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded z-10">
                                  Primary
                                </div>
                              )}
                              <img src={img} className="h-full w-full object-cover" alt={`preview-${i}`} />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  onClick={() => removeImage(i)}
                                  className="text-white bg-red-500 hover:bg-red-600 p-1.5 md:p-2 rounded-full transition-colors"
                                  aria-label="Remove image"
                                >
                                  <FiTrash2 size={14} className="md:size-4" />
                                </button>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] md:text-xs p-1.5 text-center truncate">
                                {images[i]?.name?.substring(0, 12)}...
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
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <div>
                        <h4 className="font-medium text-slate-700 text-sm md:text-base">Add size/color options</h4>
                        <p className="text-xs md:text-sm text-slate-500">Optional - for products with different variations</p>
                      </div>
                      <button
                        onClick={addVariant}
                        className="flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 md:px-5 md:py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 text-sm md:text-base"
                      >
                        <FiPlus className="text-sm md:text-base" /> Add Variant
                      </button>
                    </div>

                    {variants.length > 0 ? (
                      <div className="space-y-3 md:space-y-4">
                        {/* Desktop Table Header */}
                        <div className="hidden md:grid grid-cols-5 gap-3 text-xs font-semibold text-slate-500 px-2">
                          <div>Size/Color</div>
                          <div>Price (₹)</div>
                          <div>SKU</div>
                          <div>Stock</div>
                          <div>Action</div>
                        </div>

                        {/* Mobile Variants List */}
                        <div className="md:hidden space-y-3">
                          {variants.map((v, i) => (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              key={i}
                              className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3"
                            >
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-slate-500 mb-1 block">Size/Color</label>
                                  <input
                                    placeholder="e.g., M, L, XL"
                                    value={v.size}
                                    onChange={(e) => updateVariant(i, "size", e.target.value)}
                                    className="w-full bg-white border border-slate-200 p-2 rounded-lg text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-slate-500 mb-1 block">Price</label>
                                  <input
                                    placeholder="0.00"
                                    type="number"
                                    value={v.price}
                                    onChange={(e) => updateVariant(i, "price", e.target.value)}
                                    min="0"
                                    step="0.01"
                                    className="w-full bg-white border border-slate-200 p-2 rounded-lg text-sm"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-slate-500 mb-1 block">SKU</label>
                                  <input
                                    placeholder="Variant SKU"
                                    value={v.sku}
                                    onChange={(e) => updateVariant(i, "sku", e.target.value)}
                                    className="w-full bg-white border border-slate-200 p-2 rounded-lg text-sm"
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
                                    className="w-full bg-white border border-slate-200 p-2 rounded-lg text-sm"
                                  />
                                </div>
                              </div>
                              <button
                                onClick={() => removeVariant(i)}
                                className="w-full bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 text-sm"
                              >
                                <FiTrash2 className="text-sm" /> Remove Variant
                              </button>
                            </motion.div>
                          ))}
                        </div>

                        {/* Desktop Variants Table */}
                        <div className="hidden md:block space-y-3">
                          {variants.map((v, i) => (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              key={i}
                              className="grid grid-cols-5 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 items-end"
                            >
                              <input
                                placeholder="e.g., M, L, XL or Red, Blue"
                                value={v.size}
                                onChange={(e) => updateVariant(i, "size", e.target.value)}
                                className="bg-white border border-slate-200 p-2.5 rounded-lg text-sm"
                              />
                              <input
                                placeholder="0.00"
                                type="number"
                                value={v.price}
                                onChange={(e) => updateVariant(i, "price", e.target.value)}
                                min="0"
                                step="0.01"
                                className="bg-white border border-slate-200 p-2.5 rounded-lg text-sm"
                              />
                              <input
                                placeholder="Variant SKU"
                                value={v.sku}
                                onChange={(e) => updateVariant(i, "sku", e.target.value)}
                                className="bg-white border border-slate-200 p-2.5 rounded-lg text-sm"
                              />
                              <input
                                placeholder="0"
                                type="number"
                                value={v.stock}
                                onChange={(e) => updateVariant(i, "stock", e.target.value)}
                                min="0"
                                className="bg-white border border-slate-200 p-2.5 rounded-lg text-sm"
                              />
                              <button
                                onClick={() => removeVariant(i)}
                                className="bg-red-50 text-red-500 p-2.5 rounded-lg hover:bg-red-500 hover:text-white transition-all flex justify-center items-center"
                              >
                                <FiTrash2 />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 md:py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <FiLayers className="mx-auto text-3xl md:text-4xl mb-2 md:mb-3" />
                        <p className="font-medium text-slate-600 mb-1 text-sm md:text-base">No variants added yet</p>
                        <p className="text-xs md:text-sm">Click "Add Variant" to create size or color options</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* FOOTER ACTIONS */}
        <footer className={`flex flex-col-reverse sm:flex-row justify-between items-center gap-4 mt-6 md:mt-10 pb-6 md:pb-20 pt-4 md:pt-6 border-t border-slate-200 ${isMobile ? 'pb-20' : ''}`}>
          <div className="text-xs md:text-sm text-slate-500">
            <p className="flex items-center gap-1 md:gap-2">
              <FiCheckCircle className="text-green-500 text-sm" />
              All changes are auto-saved
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {isMobile && tab !== "variants" && (
              <button
                onClick={() => {
                  const tabs = ["basic", "pricing", "category", "media", "variants"];
                  const currentIndex = tabs.indexOf(tab);
                  if (currentIndex < tabs.length - 1) {
                    setTab(tabs[currentIndex + 1]);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold shadow-lg"
              >
                Next Step
                <FiChevronRight className="text-lg" />
              </button>
            )}
            
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={() => navigate("/products")}
                className="flex-1 sm:flex-none px-4 md:px-6 py-3 text-slate-600 font-semibold hover:text-slate-900 transition-colors text-sm md:text-base"
                disabled={loading}
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: isMobile ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                onClick={handleSubmit}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 md:px-8 py-3 rounded-xl md:rounded-2xl font-bold shadow-xl transition-all text-sm md:text-base ${
                  loading 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-blue-200'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Publishing...
                  </>
                ) : (
                  <>
                    <FiUploadCloud className="text-sm md:text-lg" /> 
                    {isMobile ? 'Publish' : 'Publish Product'}
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </footer>
      </motion.div>
    </div>
  );
}

function Tab({ label, icon, active, onClick }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`hidden md:flex items-center gap-2 px-4 md:px-5 py-2 md:py-3 rounded-2xl whitespace-nowrap transition-all duration-300 font-bold text-sm
        ${active ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100"}`}
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
      className="bg-white p-4 md:p-6 lg:p-8 rounded-xl md:rounded-2xl lg:rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50"
    >
      <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-4 md:mb-6 flex items-center gap-3">
        <div className="w-2 h-5 md:h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full flex-shrink-0" />
        {title}
      </h2>
      {children}
    </motion.div>
  );
}

function Input({ label, name, type = "text", value, onChange, placeholder, disabled, required, min, step, className = "" }) {
  return (
    <div className="flex-1">
      {label && (
        <label className="text-xs md:text-sm font-semibold text-slate-700 mb-1 md:mb-2 block">
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
        className={`w-full border-slate-200 border p-2.5 md:p-3 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base ${className}`}
      />
    </div>
  );
}

function Textarea({ label, name, value, onChange, placeholder, required }) {
  return (
    <div className="mt-3 md:mt-4">
      <label className="text-xs md:text-sm font-semibold text-slate-700 mb-1 md:mb-2 block">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        name={name}
        rows="3"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full border-slate-200 border p-2.5 md:p-3 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 resize-none text-sm md:text-base"
      />
    </div>
  );
}