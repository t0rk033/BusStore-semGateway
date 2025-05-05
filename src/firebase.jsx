import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth"; 
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDqkkOFOV7Mfm24L-K1NsqxjLi0sL71MDY",
  authDomain: "busstore-3240d.firebaseapp.com",
  projectId: "busstore-3240d",
  storageBucket: "busstore-3240d.firebasestorage.app",
  messagingSenderId: "723435108935",
  appId: "1:723435108935:web:71f138311de99e3a2c4f62"
};


const app = initializeApp(firebaseConfig);


const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage, googleProvider, facebookProvider };