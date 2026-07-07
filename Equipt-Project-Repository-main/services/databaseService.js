import { addDoc, collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';
import { firebaseDb } from './firebase-config.js';

export class DatabaseService {
  async createUserProfile(uid, data) {
    await setDoc(doc(firebaseDb, 'users', uid), {
      uid,
      ...data
    });
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
