// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "multiplayercards-2ae3e.firebaseapp.com",
  projectId: "multiplayercards-2ae3e",
  storageBucket: "multiplayercards-2ae3e.firebasestorage.app",
  messagingSenderId: "1014999791901",
  appId: "1:1014999791901:web:f8657f2fa07a225345c9f4",
  measurementId: "G-42ZNPFC8JZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Export auth and provider
export { app, auth, googleProvider, analytics };