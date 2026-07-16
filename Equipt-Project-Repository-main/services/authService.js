import {
  createUserWithEmailAndPassword,
  linkWithCredential,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updateProfile
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

  async updateUserProfile(profileData = {}) {
    const user = this.getCurrentUser();

    if (!user) {
      throw new Error('You must be signed in to update your profile.');
    }

    const normalizedEmail = (profileData.email || '').trim();
    const normalizedFirstName = (profileData.firstName || '').trim();
    const normalizedLastName = (profileData.lastName || '').trim();
    const displayName = [normalizedFirstName, normalizedLastName].filter(Boolean).join(' ').trim();

    if (normalizedEmail && normalizedEmail !== user.email) {
      await updateEmail(user, normalizedEmail);
    }

    if (displayName || user.displayName !== displayName) {
      await updateProfile(user, { displayName });
    }

    await this.databaseService.updateRecord('users', user.uid, {
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      email: normalizedEmail || user.email,
      phone: (profileData.phone || '').trim() || null,
      role: (profileData.role || 'Member').trim() || 'Member'
    });

    return this.getCurrentUserProfile();
  }

  async sendPhoneVerification(phoneNumber, recaptchaContainerId = 'phone-recaptcha-container') {
    const existingVerifier = window.recaptchaVerifier;
    if (existingVerifier) {
      await existingVerifier.clear();
    }

    // Use invisible reCAPTCHA verifier created on-demand; avoid extra console output in production.
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
      try {
        await linkWithCredential(userCredential.user, phoneCredential);
      } catch (linkError) {
        // Clean up the newly created user to avoid orphaned accounts when linking fails.
        try {
          await userCredential.user.delete();
        } catch (deleteErr) {
          // ignore deletion errors
        }
        throw linkError;
      }
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
