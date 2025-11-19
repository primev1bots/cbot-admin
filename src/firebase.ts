// src/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref as dbRef,
  onValue as dbOnValue,
  get as dbGet,
  set as dbSet,
} from "firebase/database";
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC0gMm_Vx3ysXTwQwmjLdoxvH_m369U7Vs",
  authDomain: "cbot-4baae.firebaseapp.com",
  databaseURL: "https://cbot-4baae-default-rtdb.firebaseio.com",
  projectId: "cbot-4baae",
  storageBucket: "cbot-4baae.firebasestorage.app",
  messagingSenderId: "726823810353",
  appId: "1:726823810353:web:1f49dd2a2e81fd4bf8ec10",
  measurementId: "G-T316MYT6D9"
};

// Initialize Firebase (ensure it's only initialized once)
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database & Storage
const database = getDatabase(app);
const storage = getStorage(app);

// Export everything you need
export {
  app,
  database,
  storage,
  dbRef as ref,
  dbOnValue as onValue,
  dbGet as get,
  dbSet as set,
};

export default app;
