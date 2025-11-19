// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;
