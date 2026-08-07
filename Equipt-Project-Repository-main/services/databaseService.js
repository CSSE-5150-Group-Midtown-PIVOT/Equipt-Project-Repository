import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';
import { firebaseDb } from './firebase-config.js';

export class DatabaseService {
  async createUserProfile(uid, data) {
    await setDoc(doc(firebaseDb, 'users', uid), {
      uid,
      ...data
    });
  }

  async getUserProfile(uid) {
    const userRef = doc(firebaseDb, 'users', uid);
    const snapshot = await getDoc(userRef);

    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  }

  async createRecord(collectionName, data) {
    return addDoc(collection(firebaseDb, collectionName), data);
  }

  async readRecords(collectionName) {
    const querySnapshot = await getDocs(collection(firebaseDb, collectionName));
    return querySnapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
  }

  subscribeToCollection(collectionName, onChange) {
    const collRef = collection(firebaseDb, collectionName);
    const unsubscribe = onSnapshot(collRef, (snapshot) => {
      const records = snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
      try {
        if (typeof onChange === 'function') {
          onChange(records);
        }
      } catch (err) {
        console.error('Error in onChange callback for subscribeToCollection:', err);
      }
    }, (error) => {
      console.error(`Realtime listener error for collection ${collectionName}:`, error);
    });

    return unsubscribe;
  }

  async updateRecord(collectionName, id, data) {
    const recordRef = doc(firebaseDb, collectionName, id);
    return updateDoc(recordRef, data);
  }

  async deleteRecord(collectionName, id) {
    const recordRef = doc(firebaseDb, collectionName, id);
    return deleteDoc(recordRef);
  }
}
