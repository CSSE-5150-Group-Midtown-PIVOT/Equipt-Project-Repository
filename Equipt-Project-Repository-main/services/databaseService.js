import { addDoc, collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';
import { firebaseDb } from './firebase-config.js';

export class DatabaseService {
  async createUserProfile(uid, data) {
    await setDoc(doc(firebaseDb, 'users', uid), {
      uid,
      ...data
    });
  }

  async getUserProfile(uid) {
    const userDoc = await doc(firebaseDb, 'users', uid);
    const snapshot = await getDocs(collection(firebaseDb, 'users'));
    const match = snapshot.docs.find((docSnapshot) => docSnapshot.id === uid);

    return match ? { id: match.id, ...match.data() } : null;
  }

  async createRecord(collectionName, data) {
    return addDoc(collection(firebaseDb, collectionName), data);
  }

  async readRecords(collectionName) {
    const querySnapshot = await getDocs(collection(firebaseDb, collectionName));
    return querySnapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
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
