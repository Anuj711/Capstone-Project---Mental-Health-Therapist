// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getStorage, FirebaseStorage } from "firebase/storage";

let app: FirebaseApp;
let storage: FirebaseStorage;

export const initializeFirebase = () => {
  if (app) {
    return app;
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set");
  }

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: `${projectId}.firebaseapp.com`,
    projectId: projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  // Initialize Firebase app
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

  // Initialize Cloud Storage
  storage = getStorage(app);

  return app;
};

// Optional helper export if you want direct access elsewhere
export const getFirebaseStorage = () => {
  if (!storage) {
    const firebaseApp = app || initializeFirebase();
    storage = getStorage(firebaseApp);
  }
  return storage;
};
