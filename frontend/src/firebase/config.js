import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDmGcUuu8TOvGdaxt_yqKhAo6jgS2ClaC0",
  authDomain: "blockchain-supply-chain.firebaseapp.com",
  projectId: "blockchain-supply-chain",
  storageBucket: "blockchain-supply-chain.firebasestorage.app",
  messagingSenderId: "385086396413",
  appId: "1:385086396413:web:efc8a814d32bbb9b07eb94",
  measurementId: "G-08526KEESY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { auth, db }; 