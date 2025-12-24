
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAa5MO5RwcEDOA5fZTXSHGUW74GCr_Z03g",
  authDomain: "nexoo-91eb6.firebaseapp.com",
  projectId: "nexoo-91eb6",
  storageBucket: "nexoo-91eb6.firebasestorage.app",
  messagingSenderId: "156695310052",
  appId: "1:156695310052:web:7677c8f60eddd73ae886f1",
  measurementId: "G-J63573GY6M"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
