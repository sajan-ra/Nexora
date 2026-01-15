
// Standard modular imports for Firebase v11+
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAa5MO5RwcEDOA5fZTXSHGUW74GCr_Z03g",
  authDomain: "nexoo-91eb6.firebaseapp.com",
  projectId: "nexoo-91eb6",
  storageBucket: "nexoo-91eb6.firebasestorage.app",
  messagingSenderId: "156695310052",
  appId: "1:156695310052:web:7677c8f60eddd73ae886f1",
  measurementId: "G-J63573GY6M",
  databaseURL: "https://nexoo-91eb6-default-rtdb.firebaseio.com/"
};

// Initialize Firebase app and services
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app); 
export default app;
