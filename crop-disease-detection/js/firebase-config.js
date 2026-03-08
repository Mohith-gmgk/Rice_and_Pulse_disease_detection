// ============================================================
// firebase-config.js — Firebase Initialization
// ============================================================
// STEP 1: Replace the firebaseConfig below with YOUR project's
//         config from Firebase Console.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// 🔴 REPLACE THIS with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyDu_1clSC2EXF6_JEyEdd0MUM0qN7pthTk",
  authDomain: "crop-disease-detection-d80ef.firebaseapp.com",
  projectId: "crop-disease-detection-d80ef",
  storageBucket: "crop-disease-detection-d80ef.firebasestorage.app",
  messagingSenderId: "1048531377577",
  appId: "1:1048531377577:web:3ca619d919a7f6e6e8b8b8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
