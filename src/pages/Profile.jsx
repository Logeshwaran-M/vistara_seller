import React, { useEffect, useState } from "react";
import {
  FiUser, FiMail, FiPhone, FiMapPin,
  FiCamera, 
   FiSave, FiGlobe as
    FiMoon, FiSun,
} from "react-icons/fi";
import { auth, db, storage } from "../config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

export default function Profile() {
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",

  });

const s3 = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_KEY,
  },
});
 console.log("ENV:", import.meta.env);
  // 🔥 Fetch Seller Profile
  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/login");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "sellers", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setForm({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || "",
            phone: data.phone || "",
            address: data.address || "",
            city: data.city || "",
            state: data.state || "",
            pincode: data.pincode || "",
          });

          // Check for profile image
          if (data.profileImage) {
            setProfileImage(data.profileImage);
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  // Handle Input Change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };



  // 🔥 Upload Profile Image
 const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // ✅ Validate file
  const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (!validTypes.includes(file.type)) {
    alert("Please upload a valid image (JPEG, PNG, JPG)");
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    alert("Image size should be less than 2MB");
    return;
  }

  setUploading(true);
  const user = auth.currentUser;

  try {
    const fileName = `profile_${user.uid}_${Date.now()}.${file.name.split('.').pop()}`;
    const key = `profile-images/${user.uid}/${fileName}`;

    const bucket = "vistaraweb-india";
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
      console.log("Upload progress:", progress.loaded, "/", progress.total);
    });
 console.log("ENV CHECK:", {
    bucket: import.meta.env.VITE_AWS_BUCKET_NAME,
    region: import.meta.env.VITE_AWS_REGION,
    key: import.meta.env.VITE_AWS_ACCESS_KEY,
  });
    await upload.done();

    // ✅ Generate S3 URL
    const imageUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    // ✅ Save in Firestore
    await updateDoc(doc(db, "sellers", user.uid), {
      profileImage: imageUrl,
      updatedAt: new Date().toISOString()
    });

    setProfileImage(imageUrl);
    alert("Profile image updated successfully!");

  } catch (error) {
    console.error("S3 Upload Error:", error);
    alert("Failed to upload image. Please try again.");
  } finally {
    setUploading(false);
  }
};

  // 🔥 Save Profile Update
  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Login required");
      navigate("/login");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "sellers", user.uid), {
        ...form,
        fullName: `${form.firstName} ${form.lastName}`.trim(),
        updatedAt: new Date().toISOString()
      });

      alert("Profile updated successfully!");
      setEditMode(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };


  // Loading Animation
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="w-24 h-24 border-4 border-gray-200 rounded-full"></div>
            <div className="w-24 h-24 border-4 border-purple-500 border-t-transparent rounded-full absolute top-0 animate-spin"></div>
          </div>
          <motion.p
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            className="mt-6 text-gray-600 font-medium"
          >
            Loading your profile...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-500 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-gray-50 to-blue-50'}`}>
  <div className="md:ml-72 transition-all duration-300">
    <div className="pt-20 md:pt-28 p-4 md:p-12 max-w-7xl mx-auto">


          {/* HEADER */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-8 flex justify-between items-center"
          >
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                My Profile
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                Manage your personal information and settings
              </p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-3 rounded-xl ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} shadow-sm transition-all`}
            >
              {darkMode ? <FiSun className="text-yellow-500" /> : <FiMoon className="text-gray-600" />}
            </button>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* LEFT SIDEBAR - PROFILE CARD */}
            <motion.div variants={itemVariants} className="lg:col-span-1">
              <div className={`rounded-3xl shadow-xl overflow-hidden backdrop-blur-lg ${darkMode ? 'bg-gray-800/80' : 'bg-white/90'} border ${darkMode ? 'border-gray-700' : 'border-white/20'}`}>

                {/* Profile Header */}
                <div className="h-40 bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 relative">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="absolute -bottom-16 left-1/2 transform -translate-x-1/2"
                  >
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full border-4 border-white shadow-2xl overflow-hidden">
                        {profileImage ? (
                          <img
                            src={profileImage}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                            <span className="text-4xl font-bold text-white">
                              {form.firstName?.[0]}{form.lastName?.[0]}
                            </span>
                          </div>
                        )}

                        {/* Upload Overlay */}
                        <label className={`absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer ${darkMode ? 'bg-black/70' : ''}`}>
                          {uploading ? (
                            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <FiCamera className="text-white text-2xl" />
                              <input
                                type="file"
                                className="hidden"
                                onChange={handleImageUpload}
                                accept="image/*"
                              />
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Profile Info */}
                <div className="pt-20 px-6 pb-8 text-center">
                  <h2 className="text-2xl font-bold mb-1">
                    {form.firstName} {form.lastName}
                  </h2>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-6`}>
                    <FiMapPin className="inline mr-1" /> {form.city}, {form.state}
                  </p>


                  {/* Tabs Navigation */}
                  <div className="space-y-2">
                    {[
                      { id: "general", icon: <FiUser />, label: "General" },


                    ].map((tab) => (
                      <motion.button
                        key={tab.id}
                        whileHover={{ x: 5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${activeTab === tab.id
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                          : darkMode
                            ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                      >
                        <span className="text-lg">{tab.icon}</span>
                        <span className="font-medium">{tab.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* RIGHT CONTENT AREA */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {/* GENERAL TAB */}
                {activeTab === "general" && (
                  <motion.div
                    key="general"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`rounded-3xl shadow-xl p-6 ${darkMode ? 'bg-gray-800/80' : 'bg-white/90'} backdrop-blur-lg`}
                  >
                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <FiUser /> Personal Information
                        </h3>
                        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Update your personal details
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setEditMode(!editMode)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium ${editMode
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                          : darkMode
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                      >


                      </motion.button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { label: "First Name", name: "firstName", icon: <FiUser /> },
                        { label: "Last Name", name: "lastName", icon: <FiUser /> },
                        { label: "Email", name: "email", icon: <FiMail />, type: "email", disabled: true },
                        { label: "Phone", name: "phone", icon: <FiPhone />, type: "tel" },
                        { label: "City", name: "city", icon: <FiMapPin /> },
                        { label: "State", name: "state", icon: <FiMapPin /> },
                        { label: "Pincode", name: "pincode", icon: <FiMapPin />, type: "number" },
                      ].map((field) => (
                        <motion.div
                          key={field.name}
                          whileHover={{ y: -2 }}
                          className="space-y-2"
                        >
                          <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {field.icon} {field.label}
                          </label>
                          <input
                            type={field.type || "text"}
                            name={field.name}
                            value={form[field.name]}
                            onChange={handleChange}
                            disabled={!editMode || field.disabled}
                            className={`w-full px-4 py-3 rounded-xl border transition-all ${editMode && !field.disabled
                              ? 'border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
                              : darkMode
                                ? 'bg-gray-900 border-gray-700 text-gray-400'
                                : 'bg-gray-50 border-gray-200 text-gray-500'
                              } ${darkMode ? 'bg-gray-900 text-white' : ''}`}
                          />
                        </motion.div>
                      ))}
                    </div>

                    <motion.div
                      whileHover={{ y: -2 }}
                      className="mt-6 space-y-2"
                    >
                      <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <FiMapPin /> Address
                      </label>
                      <textarea
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        disabled={!editMode}
                        rows="3"
                        className={`w-full px-4 py-3 rounded-xl border transition-all ${editMode
                          ? 'border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
                          : darkMode
                            ? 'bg-gray-900 border-gray-700 text-gray-400'
                            : 'bg-gray-50 border-gray-200 text-gray-500'
                          } ${darkMode ? 'bg-gray-900 text-white' : ''}`}
                      />
                    </motion.div>

                    {editMode && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-4 mt-8"
                      >
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSave}
                          disabled={saving}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {saving ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <FiSave /> Save Changes
                            </>
                          )}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setEditMode(false)}
                          className={`px-6 py-3 rounded-xl font-medium ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                        >
                          Cancel
                        </motion.button>
                      </motion.div>
                    )}
                  </motion.div>
                )}


              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
