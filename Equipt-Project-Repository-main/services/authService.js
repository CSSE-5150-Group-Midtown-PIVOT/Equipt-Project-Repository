import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { firebaseAuth } from './firebase-config.js';
import { DatabaseService } from './databaseService.js';

export class AuthService {
  constructor() {
    this.databaseService = new DatabaseService();
  }

  async login(email, password) {
    const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const existingProfile = await this.databaseService.getUserProfile(userCredential.user.uid);

    if (!existingProfile) {
      await this.databaseService.createUserProfile(userCredential.user.uid, {
        email: userCredential.user.email,
        createdAt: new Date().toISOString()
      });
    }

    return userCredential;
  }

  getCurrentUser() {
    return firebaseAuth.currentUser;
  }

  async getCurrentUserProfile() {
    const user = this.getCurrentUser();

    if (!user) {
      return null;
    }

    return this.databaseService.getUserProfile(user.uid);
  }

  async logout() {
    return signOut(firebaseAuth);
  }

  async register(email, password, userData = {}) {
    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);

    await this.databaseService.createUserProfile(userCredential.user.uid, {
      ...userData,
      email,
      createdAt: new Date().toISOString()
    });

    return userCredential;
  }
}
