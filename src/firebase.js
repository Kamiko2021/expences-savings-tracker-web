import { getAnalytics, isSupported } from 'firebase/analytics'
import { initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  linkWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const requiredConfig = ['apiKey', 'authDomain', 'projectId', 'appId']
const missingConfig = requiredConfig.filter((key) => !firebaseConfig[key])
if (missingConfig.length) {
  throw new Error(`Missing Firebase configuration: ${missingConfig.join(', ')}. Add the VITE_FIREBASE_* values to your .env file.`)
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

export const registerAccount = async (email, password) => {
  const credential = EmailAuthProvider.credential(email, password)
  if (auth.currentUser?.isAnonymous) return linkWithCredential(auth.currentUser, credential)
  return createUserWithEmailAndPassword(auth, email, password)
}

export const loginAccount = (email, password) =>
  signInWithEmailAndPassword(auth, email, password)

export const logoutAccount = () => signOut(auth)

isSupported()
  .then((supported) => {
    if (supported) getAnalytics(app)
  })
  .catch((error) => {
    console.error('Firebase Analytics could not initialize:', error)
  })
