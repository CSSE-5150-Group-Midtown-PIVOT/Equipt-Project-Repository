import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyAKswRvqVeBIdGmePN5O8Yyn2sblaUlgCk',
  authDomain: 'equipt-a4fdd.firebaseapp.com',
  projectId: 'equipt-a4fdd',
  storageBucket: 'equipt-a4fdd.firebasestorage.app',
  messagingSenderId: '43253169672',
  appId: '1:43253169672:web:294ac4c59c8f64e8a75bbd',
  measurementId: 'G-R66CY0XDKP'
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = getFirestore(firebaseApp);
