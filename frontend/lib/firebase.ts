// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
// import { getAnalytics } from "firebase/analytics"; // Analytics can be initialized if needed

const firebaseConfig = {
  apiKey: "AIzaSyB0srpcLeNF8nR6DF_fP7_FsemKY4--4wU",
  authDomain: "nexulen-f8790.firebaseapp.com",
  projectId: "nexulen-f8790",
  storageBucket: "nexulen-f8790.firebasestorage.app",
  messagingSenderId: "718749886008",
  appId: "1:718749886008:web:df0563c31aaff0c2e628cd",
  measurementId: "G-D7B9CCNQ2G",
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
const auth = getAuth(app)
// const analytics = getAnalytics(app); // Uncomment if you need analytics

export { app, auth }
