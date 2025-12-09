
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const defaultFirebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyD93oOC3BeBbq3SvallhENhXXAaWtTl-aY",
  authDomain: "psychoplan-kanban.firebaseapp.com",
  projectId: "psychoplan-kanban",
  storageBucket: "psychoplan-kanban.firebasestorage.app",
  messagingSenderId: "892599305146",
  appId: "1:892599305146:web:24dda7067c3fb49b279383",
  measurementId: "G-VTFH0616WM"
};

const getFirebaseConfig = (): FirebaseConfig => {
  try {
    const stored = localStorage.getItem('firebase_config');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Invalid stored firebase config", e);
  }
  return defaultFirebaseConfig;
};

const app = initializeApp(getFirebaseConfig());
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
