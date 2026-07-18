// Firebase configuration for SHOPPIQ (Project: shoppiq-9cc99)

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCBVQpMRWMZ-A_uUd4eLXg31ZRvvtTj8t0",
  authDomain: "shoppiq-9cc99.firebaseapp.com",
  projectId: "shoppiq-9cc99",
  storageBucket: "shoppiq-9cc99.firebasestorage.app",
  messagingSenderId: "1084837179155",
  appId: "1:1084837179155:web:ac57b27a1c117f3ab634e6",
  measurementId: "G-6DT19K1XY8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);

// For test phone numbers: disable app verification on localhost
// This prevents reCAPTCHA from interfering with test numbers
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  (auth.settings as any).appVerificationDisabledForTesting = true;
}

// Set language to Hindi for SMS messages
auth.useDeviceLanguage();

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
