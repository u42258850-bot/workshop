// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {

  
  apiKey: "AIzaSyDzKIJsS7_O2jjPgTCepHe8xNxTUxm6JyU",
  authDomain: "logistics-29f2f.firebaseapp.com",
  projectId: "logistics-29f2f",
  storageBucket: "logistics-29f2f.firebasestorage.app",
  messagingSenderId: "588152735653",
  appId: "1:588152735653:web:8342b26ed8485137104a4c",
  measurementId: "G-N6EDN6WW9Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);