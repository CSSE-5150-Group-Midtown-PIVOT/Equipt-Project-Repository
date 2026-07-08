import {
  createUserWithEmailAndPassword,
  linkWithCredential,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
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

  async sendPhoneVerification(phoneNumber, recaptchaContainerId = 'phone-recaptcha-container') {
    const existingVerifier = window.recaptchaVerifier;
    if (existingVerifier) {
      await existingVerifier.clear();
    }

    console.log('Firebase project config:', firebaseAuth?.app?.options);
    console.log('Current browser origin:', window.location.origin);

    const appVerifier = new RecaptchaVerifier(firebaseAuth, recaptchaContainerId, {
      size: 'invisible',
      callback: () => {}
    });

    window.recaptchaVerifier = appVerifier;

    const phoneProvider = new PhoneAuthProvider(firebaseAuth);
    return phoneProvider.verifyPhoneNumber(phoneNumber, appVerifier);
  }

  async buildPhoneCredential(verificationId, code) {
    return PhoneAuthProvider.credential(verificationId, code);
  }

  async register(email, password, userData = {}, phoneCredential = null) {
    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);

    if (phoneCredential) {
      await linkWithCredential(userCredential.user, phoneCredential);
    }

    await this.databaseService.createUserProfile(userCredential.user.uid, {
      ...userData,
      email,
      phone: userData.phone || null,
      createdAt: new Date().toISOString()
    });

    return userCredential;
  }
}
