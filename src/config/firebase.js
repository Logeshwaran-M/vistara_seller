// src/config/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgWE_JutmLJmgIQihIcMl-wHSoNxOYHfY",
  authDomain: "vistara-d6dea.firebaseapp.com",
  projectId: "vistara-d6dea",
  storageBucket: "vistara-d6dea.appspot.com", // must be .appspot.com
  messagingSenderId: "699528287728",
  appId: "1:699528287728:web:197f51eedca7f4f058b935",
  measurementId: "G-4GNTMKC2YL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// ✅ Add these so your Dashboard can import them
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { app, analytics };