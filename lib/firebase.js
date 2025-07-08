// firebase.js (or similar)
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration (from your Firebase console)
const firebaseConfig = {
  apiKey: "AIzaSyDrgRs_Pa0XJmn0IablggIw5WcN04eUn0I",
  authDomain: "thenewjeweller-redirecting-app.firebaseapp.com",
  projectId: "thenewjeweller-redirecting-app",
  storageBucket: "thenewjeweller-redirecting-app.firebasestorage.app",
  messagingSenderId: "958306417797",
  appId: "1:958306417797:web:6c278d20a0b06d80083dec",
  measurementId: "G-50DYFW5RMJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);