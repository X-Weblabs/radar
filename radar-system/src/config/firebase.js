import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDZn7KDnqXBJhT4jDkq2qvDvrHLEm-aOZc",
  authDomain: "systemradar.firebaseapp.com",
  projectId: "systemradar",
  storageBucket: "systemradar.firebasestorage.app",
  messagingSenderId: "824731943642",
  appId: "1:824731943642:web:928ca8da188683fbaa1be3"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const secondaryApp = getApps().find((firebaseApp) => firebaseApp.name === 'Secondary')
  || initializeApp(firebaseConfig, 'Secondary');

export const auth = getAuth(app);
export const secondaryAuth = getAuth(secondaryApp);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

export default app;
