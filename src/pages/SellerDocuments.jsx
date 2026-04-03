import { useState, useEffect, useRef } from "react";
import { db, auth } from "../config/firebase";

import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { FiUpload, FiFileText, FiEye, FiTrash2, FiArrowRight, FiArrowLeft, FiCheckCircle, FiAlertCircle, FiLoader, FiCreditCard, FiFile } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

export default function SellerDocuments() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  // Create refs for each file input
  const identityInputRef = useRef(null);
  const businessInputRef = useRef(null);
  const bankInputRef = useRef(null);
  const gstInputRef = useRef(null);
  const panInputRef = useRef(null);

  // State for form fields
  const [formData, setFormData] = useState({
    bankAccount: "",
    gstNumber: "",
    panNumber: ""
  });

  const [files, setFiles] = useState({
    identity: { file: null, url: null, type: "", name: "" },
    business: { file: null, url: null, type: "", name: "" },
    bank: { file: null, url: null, type: "", name: "" },
    gstCertificate: { file: null, url: null, type: "", name: "" },
    panCard: { file: null, url: null, type: "", name: "" }
  });

  const [uploadProgress, setUploadProgress] = useState({
    identity: 0,
    business: 0,
    bank: 0,
    gstCertificate: 0,
    panCard: 0
  });

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/login");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "sellers", user.uid));
     if (userDoc.exists()) {
  const data = userDoc.data();
  setUserData(data);

  setFormData(prev => ({
    ...prev,
    bankAccount: data.bankAccount || "",
    gstNumber: data.gstNumber || data.gst || "",
    panNumber: data.panNumber || ""
  }));

  const docs = data.documents || {};

  setFiles(prev => ({
    ...prev,
    identity: {
      ...prev.identity,
      url: docs.identity?.url || docs.panCard?.url || null,
      name: docs.identity?.name || docs.panCard?.name || "",
      type: docs.identity?.type || docs.panCard?.type || ""
    },
    business: {
      ...prev.business,
      url: docs.business?.url || null,
      name: docs.business?.name || "",
      type: docs.business?.type || ""
    },
    bank: {
      ...prev.bank,
      url: docs.bank?.url || null,
      name: docs.bank?.name || "",
      type: docs.bank?.type || ""
    },
    gstCertificate: {
      ...prev.gstCertificate,
      url: docs.gstCertificate?.url || null,
      name: docs.gstCertificate?.name || "",
      type: docs.gstCertificate?.type || ""
    },
    panCard: {
      ...prev.panCard,
      url: docs.panCard?.url || null,
      name: docs.panCard?.name || "",
      type: docs.panCard?.type || ""
    }
  }));
}

} catch (err) {
  console.error(err);
}

};

fetchUserData();
}, []);
        

  // Handle form field changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Function to trigger file input click
  const triggerFileInput = (type) => {
    const refs = {
      identity: identityInputRef,
      business: businessInputRef,
      bank: bankInputRef,
      gstCertificate: gstInputRef,
      panCard: panInputRef
    };
    
    if (refs[type]?.current) {
      refs[type].current.click();
    }
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError("Invalid file type. Please upload JPG, PNG, or PDF files only.");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit");
      return;
    }

    setError("");
    setFiles(prev => ({
      ...prev,
      [type]: {
        file: file,
        url: null,
        type: file.type,
        name: file.name
      }
    }));
  };

  const deleteFile = (type) => {
    setFiles(prev => ({
      ...prev,
      [type]: { file: null, url: null, type: "", name: "" }
    }));
  };

const uploadSingleFile = async (file, type, uid) => {
  if (!file) return null;

  try {
    const client = new S3Client({
      region: import.meta.env.VITE_AWS_REGION,
      credentials: {
        accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY,
        secretAccessKey: import.meta.env.VITE_AWS_SECRET_KEY,
      },
    });

    const fileName = `sellerDocuments/${uid}/${type}_${Date.now()}_${file.name}`;

    const upload = new Upload({
      client,
      params: {
        Bucket:  import.meta.env.VITE_AWS_BUCKET_NAME,
        Key: fileName,
        Body: file,
        ContentType: file.type,
      },
    });

    upload.on("httpUploadProgress", (progress) => {
      const percent = Math.round((progress.loaded / progress.total) * 100);
      setUploadProgress(prev => ({
        ...prev,
        [type]: percent,
      }));
    });

    await upload.done();

   const fileUrl = `https://vistaraweb-india.s3.ap-south-1.amazonaws.com/${fileName}`;

    return {
      url: fileUrl,
      name: fileName,
      originalName: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

  } catch (err) {
    console.error("S3 Upload Error:", err);
    throw err;
  }
};

  const handleSubmitAll = async () => {
    const user = auth.currentUser;
    if (!user) {
      setError("You must be logged in to upload documents");
      navigate("/login");
      return;
    }

    // Validate required fields based on step
    if (step === 1 && !formData.panNumber && !files.panCard.file && !files.panCard.url) {
      setError("Please enter PAN number or upload PAN card");
      return;
    }
    
    if (step === 2 && !formData.gstNumber && !files.gstCertificate.file && !files.gstCertificate.url) {
      setError("Please enter GST number or upload GST certificate");
      return;
    }
    
    if (step === 3 && !formData.bankAccount && !files.bank.file && !files.bank.url) {
      setError("Please enter bank account details or upload bank proof");
      return;
    }

    setLoading(true);
    setUploading(true);
    setError("");

    try {
      const uid = user.uid;
      const uploadedDocs = {};

      // Upload new files if they exist
      if (files.identity.file) {
        uploadedDocs.identity = await uploadSingleFile(files.identity.file, "identity", uid);
      }
      if (files.business.file) {
        uploadedDocs.business = await uploadSingleFile(files.business.file, "business", uid);
      }
      if (files.bank.file) {
        uploadedDocs.bank = await uploadSingleFile(files.bank.file, "bank", uid);
      }
      if (files.gstCertificate.file) {
        uploadedDocs.gstCertificate = await uploadSingleFile(files.gstCertificate.file, "gstCertificate", uid);
      }
      if (files.panCard.file) {
        uploadedDocs.panCard = await uploadSingleFile(files.panCard.file, "panCard", uid);
      }

      // Upload document metadata to Firestore
     // Merge uploadedDocs with existing documents
const existingSeller = await getDoc(doc(db, "sellers", uid));
const existingDocs = existingSeller.exists() ? existingSeller.data().documents || {} : {};

const finalDocuments = {
  ...existingDocs,
  ...uploadedDocs
};

await updateDoc(doc(db, "sellers", uid), {
  documents: finalDocuments,

  // form data
  bankAccount: formData.bankAccount,
  gstNumber: formData.gstNumber,
  panNumber: formData.panNumber,

  // status
  documentsSubmitted: true,
  documentStatus: "under_review",
  verificationStep: "documents_submitted",

  // timestamps
  updatedAt: new Date().toISOString(),

  // optional (keep if needed)
  gst: formData.gstNumber || userData?.gst || ""
});

      setSuccess("Documents submitted successfully! Our team will review them within 24-48 hours.");
      
      // Redirect after delay
      setTimeout(() => {
        navigate("/seller/pending");
      }, 3000);

    } catch (err) {
      console.error("Error submitting documents:", err);
      setError(err.message || "Upload failed. Please try again."
        ? "Upload failed: You don't have permission to upload files"
        : err.code === 'storage/canceled'
        ? "Upload was canceled"
        : "Failed to upload documents. Please try again."
      );
    } finally {
      setLoading(false);
      setUploading(false);
      // Reset progress after completion
      setTimeout(() => {
        setUploadProgress({ 
          identity: 0, 
          business: 0, 
          bank: 0, 
          gstCertificate: 0, 
          panCard: 0 
        });
      }, 1000);
    }
  };

  const progress = ((step - 1) / 3) * 100;

  const viewFile = (type) => {
    const file = files[type];
    if (file.url) {
      window.open(file.url, '_blank');
    } else if (file.file) {
      const fileURL = URL.createObjectURL(file.file);
      window.open(fileURL, '_blank');
      URL.revokeObjectURL(fileURL); // Clean up
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 flex justify-center items-center p-4 md:p-6">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-700 via-purple-700 to-indigo-800 p-6 md:p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Document Verification</h2>
                <p className="text-sm opacity-90 mt-1">Step {step} of 3 • Complete all steps for verification</p>
                {userData && (
                  <p className="text-xs opacity-75 mt-2">
                    For: <span className="font-semibold">{userData.businessName || "Your Business"}</span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-3xl md:text-4xl font-bold">{Math.round(progress)}%</div>
                <p className="text-xs opacity-80">Completion</p>
              </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="mt-8">
              <div className="flex items-center">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex-1 flex items-center">
                    <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-sm transition-all duration-300
                      ${step > s ? "bg-green-500 shadow-lg" : step === s ? "bg-white text-blue-700 shadow-lg" : "bg-white/30"}`}>
                      {step > s ? <FiCheckCircle size={18} /> : s}
                    </div>
                    {s !== 3 && (
                      <div className={`flex-1 h-2 mx-2 rounded-full transition-all duration-300 ${step > s ? "bg-green-500" : "bg-white/30"}`}></div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between text-xs mt-3 px-1">
                <span className={`font-medium ${step >= 1 ? "text-white" : "text-white/60"}`}>PAN Details</span>
                <span className={`font-medium ${step >= 2 ? "text-white" : "text-white/60"}`}>GST Details</span>
                <span className={`font-medium ${step >= 3 ? "text-white" : "text-white/60"}`}>Bank Details</span>
              </div>
            </div>
          </div>
        </div>

        {/* ERROR/SUCCESS MESSAGES */}
        {(error || success) && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mx-6 mt-6 p-4 rounded-lg border ${error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}
          >
            <div className="flex items-center gap-3">
              {error ? (
                <FiAlertCircle className="text-red-500 flex-shrink-0" size={20} />
              ) : (
                <FiCheckCircle className="text-green-500 flex-shrink-0" size={20} />
              )}
              <p className={`text-sm ${error ? 'text-red-700' : 'text-green-700'}`}>
                {error || success}
              </p>
            </div>
          </motion.div>
        )}

        {/* BODY */}
        <div className="p-6 md:p-8">
          {/* STEP 1: PAN Details */}
          {step === 1 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white border-2 border-gray-100 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-blue-500 to-cyan-500">
                    <FiFileText size={22} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-xl text-gray-800">PAN Card Details</h3>
                        <p className="text-gray-600 mt-1">Enter your PAN number and upload PAN card</p>
                      </div>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                        Required
                      </span>
                    </div>
                  </div>
                </div>

                {/* PAN Number Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAN Number *
                  </label>
                  <input
                    type="text"
                    name="panNumber"
                    value={formData.panNumber}
                    onChange={handleInputChange}
                    placeholder="Enter your PAN number (e.g., ABCDE1234F)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                    title="Please enter a valid PAN number (e.g., ABCDE1234F)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: ABCDE1234F (5 letters, 4 digits, 1 letter)</p>
                </div>

                {/* PAN Card Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAN Card Document (Optional)
                  </label>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload a clear image or scanned copy of your PAN card
                  </p>
                  
                  {!files.panCard.file && !files.panCard.url ? (
                    <div 
                      onClick={() => triggerFileInput("panCard")}
                      className="border-3 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
                    >
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                          <FiUpload className="text-blue-500 text-2xl" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Click to upload PAN Card</p>
                          <p className="text-sm text-gray-500 mt-1">JPG, PNG, or PDF • Max 5MB</p>
                        </div>
                        <div className="px-5 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors">
                          Browse Files
                        </div>
                      </div>
                      <input 
                        ref={panInputRef}
                        type="file" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, "panCard")}
                        accept=".jpg,.jpeg,.png,.pdf"
                      />
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-5 rounded-xl">
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-white flex items-center justify-center">
                            {uploading && files.panCard.file ? (
                              <FiLoader className="animate-spin" size={20} />
                            ) : (
                              <FiCheckCircle size={20} />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 truncate max-w-xs">{files.panCard.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-500">
                                Type: {files.panCard.type?.split('/')[1]?.toUpperCase() || 'Document'}
                              </span>
                              {files.panCard.file && (
                                <span className="text-xs text-gray-500">
                                  Size: {(files.panCard.file.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button 
                            onClick={() => viewFile("panCard")} 
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                          >
                            <FiEye /> {uploading && files.panCard.file ? "Preview" : "View"}
                          </button>
                          <button 
                            onClick={() => deleteFile("panCard")} 
                            disabled={uploading && files.panCard.file}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FiTrash2 /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: GST Details */}
          {step === 2 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white border-2 border-gray-100 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-purple-500 to-pink-500">
                    <FiFile size={22} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-xl text-gray-800">GST Details</h3>
                        <p className="text-gray-600 mt-1">Enter your GST number and upload GST certificate</p>
                      </div>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                        Required
                      </span>
                    </div>
                  </div>
                </div>

                {/* GST Number Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Number *
                  </label>
                  <input
                    type="text"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleInputChange}
                    placeholder="Enter your GST number (e.g., 27ABCDE1234F1Z5)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}"
                    title="Please enter a valid GST number"
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: 27ABCDE1234F1Z5 (15 characters)</p>
                </div>

                {/* GST Certificate Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Certificate (Optional)
                  </label>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload a clear image or scanned copy of your GST certificate
                  </p>
                  
                  {!files.gstCertificate.file && !files.gstCertificate.url ? (
                    <div 
                      onClick={() => triggerFileInput("gstCertificate")}
                      className="border-3 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all group"
                    >
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                          <FiUpload className="text-purple-500 text-2xl" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Click to upload GST Certificate</p>
                          <p className="text-sm text-gray-500 mt-1">JPG, PNG, or PDF • Max 5MB</p>
                        </div>
                        <div className="px-5 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors">
                          Browse Files
                        </div>
                      </div>
                      <input 
                        ref={gstInputRef}
                        type="file" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, "gstCertificate")}
                        accept=".jpg,.jpeg,.png,.pdf"
                      />
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 p-5 rounded-xl">
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 text-white flex items-center justify-center">
                            {uploading && files.gstCertificate.file ? (
                              <FiLoader className="animate-spin" size={20} />
                            ) : (
                              <FiCheckCircle size={20} />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 truncate max-w-xs">{files.gstCertificate.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-500">
                                Type: {files.gstCertificate.type?.split('/')[1]?.toUpperCase() || 'Document'}
                              </span>
                              {files.gstCertificate.file && (
                                <span className="text-xs text-gray-500">
                                  Size: {(files.gstCertificate.file.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button 
                            onClick={() => viewFile("gstCertificate")} 
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                          >
                            <FiEye /> {uploading && files.gstCertificate.file ? "Preview" : "View"}
                          </button>
                          <button 
                            onClick={() => deleteFile("gstCertificate")} 
                            disabled={uploading && files.gstCertificate.file}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FiTrash2 /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Bank Details */}
          {step === 3 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white border-2 border-gray-100 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-green-500 to-emerald-500">
                    <FiCreditCard size={22} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-xl text-gray-800">Bank Details</h3>
                        <p className="text-gray-600 mt-1">Enter your bank account details and upload proof</p>
                      </div>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                        Required
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bank Account Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Account Number *
                  </label>
                  <input
                    type="text"
                    name="bankAccount"
                    value={formData.bankAccount}
                    onChange={handleInputChange}
                    placeholder="Enter your bank account number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    pattern="[0-9]{9,18}"
                    title="Please enter a valid bank account number (9-18 digits)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter your bank account number (9-18 digits)</p>
                </div>

                {/* Bank Proof Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Proof Document (Optional)
                  </label>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload cancelled cheque or bank statement showing account holder name
                  </p>
                  
                  {!files.bank.file && !files.bank.url ? (
                    <div 
                      onClick={() => triggerFileInput("bank")}
                      className="border-3 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all group"
                    >
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                          <FiUpload className="text-green-500 text-2xl" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Click to upload Bank Proof</p>
                          <p className="text-sm text-gray-500 mt-1">JPG, PNG, or PDF • Max 5MB</p>
                        </div>
                        <div className="px-5 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors">
                          Browse Files
                        </div>
                      </div>
                      <input 
                        ref={bankInputRef}
                        type="file" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, "bank")}
                        accept=".jpg,.jpeg,.png,.pdf"
                      />
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-5 rounded-xl">
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-white flex items-center justify-center">
                            {uploading && files.bank.file ? (
                              <FiLoader className="animate-spin" size={20} />
                            ) : (
                              <FiCheckCircle size={20} />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 truncate max-w-xs">{files.bank.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-500">
                                Type: {files.bank.type?.split('/')[1]?.toUpperCase() || 'Document'}
                              </span>
                              {files.bank.file && (
                                <span className="text-xs text-gray-500">
                                  Size: {(files.bank.file.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button 
                            onClick={() => viewFile("bank")} 
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                          >
                            <FiEye /> {uploading && files.bank.file ? "Preview" : "View"}
                          </button>
                          <button 
                            onClick={() => deleteFile("bank")} 
                            disabled={uploading && files.bank.file}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FiTrash2 /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* INSTRUCTIONS */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <FiAlertCircle size={16} /> Important Instructions
            </h4>
            <ul className="text-xs text-blue-700 space-y-1 pl-5 list-disc">
              <li>All documents must be clear and readable</li>
              <li>Maximum file size: 5MB per document</li>
              <li>Accepted formats: JPG, PNG, PDF</li>
              <li>Documents will be verified within 24-48 hours</li>
              <li>Ensure all information matches your registration details</li>
            </ul>
          </div>

          {/* BUTTONS */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 mt-8">
            <button
              disabled={step === 1 || loading}
              onClick={() => setStep(step - 1)}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiArrowLeft /> Previous
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={((step === 1 && !formData.panNumber) || (step === 2 && !formData.gstNumber)) || loading}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Step <FiArrowRight />
              </button>
            ) : (
              <button
                onClick={handleSubmitAll}
                disabled={loading || uploading || !formData.bankAccount}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
              >
                {loading || uploading ? (
                  <>
                    <FiLoader className="animate-spin" />
                    {uploading ? "Uploading..." : "Processing..."}
                  </>
                ) : (
                  <>
                    <FiCheckCircle size={18} />
                    Submit All for Verification
                  </>
                )}
              </button>
            )}
          </div>

          {/* UPLOAD PROGRESS */}
          {uploading && (
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Upload Progress:</h4>
              {['identity', 'business', 'bank', 'gstCertificate', 'panCard'].map(type => (
                files[type].file && (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="capitalize">{type.replace(/([A-Z])/g, ' $1')} Document</span>
                      <span>{uploadProgress[type]}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                        style={{ width: `${uploadProgress[type]}%` }}
                      ></div>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}