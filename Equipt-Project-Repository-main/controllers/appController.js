import { renderView } from '../views/viewRenderer.js';
import { renderHomeView } from '../views/homeView.js';
import { renderLoginView, renderLoginFormView, renderRegistrationView } from '../views/loginView.js';
import { renderDashboardView } from '../views/dashboardView.js';
import { renderProfileView } from '../views/profileView.js';
import { AuthService } from '../services/authService.js';
import { DatabaseService } from '../services/databaseService.js';

// Main controller for routing between starter pages.
// Add page-specific logic here as the app grows.
const app = document.getElementById('app');
const authService = new AuthService();
const databaseService = new DatabaseService();

function getFriendlyAuthError(error) {
  const code = error?.code || '';
  const message = (error?.message || '').toLowerCase();

  // fallback: if code is missing, inspect message text for known error indicators
  const inferredCode = code || (message.includes('account-exists-with-different-credential') ? 'auth/account-exists-with-different-credential' :
    message.includes('credential-already-in-use') ? 'auth/credential-already-in-use' :
    message.includes('phone-number-already-exists') ? 'auth/phone-number-already-exists' :
    '');

  switch (inferredCode) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No account was found with that email.';
    case 'auth/wrong-password':
      return 'The password is incorrect. Please try again.';
    case 'auth/email-already-in-use':
      return 'That email is already registered. Try logging in instead.';
    case 'auth/weak-password':
      return 'Your password is too weak. Use at least 12 characters and include symbols.';
    case 'auth/invalid-phone-number':
      return 'Please enter a valid phone number in international format.';
    case 'auth/missing-phone-number':
      return 'Please enter your phone number before sending a verification code.';
    case 'auth/quota-exceeded':
      return 'Too many verification attempts. Please wait and try again later.';
    case 'auth/too-many-requests':
      return 'Too many requests. Please wait a few minutes and try again.';
    case 'auth/invalid-verification-code':
      return 'The code is invalid. Please check it and try again.';
    case 'auth/code-expired':
      return 'The verification code has expired. Request a new one.';
    case 'auth/credential-already-in-use':
      return 'This phone number is already linked to another account. Try signing in or use a different phone number.';
    case 'auth/phone-number-already-exists':
      return 'This phone number is already linked to another account. Try signing in or use a different phone number.';
    case 'auth/operation-not-allowed':
      return 'Phone authentication is not enabled for this Firebase project.';
    case 'auth/billing-not-enabled':
      return 'Phone SMS verification is unavailable until billing is enabled in Firebase.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this phone number using a different sign-in method. Try signing in with that method, then link additional sign-in methods in your profile settings.';
    default:
      return error?.message || 'An unexpected error occurred. Please try again.';
  }
}

function showHomePage() {
  renderView(app, renderHomeView(Boolean(authService.getCurrentUser())));
  document.getElementById('go-login')?.addEventListener('click', showLoginPage);
}

function showLoginPage() {
  window.location.hash = 'login-form';
}

function showRegistrationPage() {
  renderView(app, renderRegistrationView());

  const registrationForm = document.getElementById('registration-form');
  const sendPhoneCodeButton = document.getElementById('send-phone-code');
  const verifyPhoneCodeButton = document.getElementById('verify-phone-code');
  const phoneVerificationStatus = document.getElementById('phone-verification-status');
  const phoneCodeInput = document.getElementById('phone-code');

  let phoneVerificationId = null;
  let phoneCredential = null;
  let phoneVerified = false;

  const setPhoneStatus = (message, isError = false) => {
    if (!phoneVerificationStatus) {
      return;
    }

    phoneVerificationStatus.textContent = message || '';
    phoneVerificationStatus.hidden = !message;
    phoneVerificationStatus.classList.toggle('form-error', isError);
    phoneVerificationStatus.classList.toggle('form-success', !isError);
  };

  sendPhoneCodeButton?.addEventListener('click', async () => {
    const phone = document.getElementById('phone')?.value?.trim() || '';

    if (!phone) {
      setPhoneStatus('Please enter a phone number before sending a code.', true);
      return;
    }

    try {
      setPhoneStatus('Sending verification code...', false);
      phoneVerificationId = await authService.sendPhoneVerification(phone);
      phoneCredential = null;
      phoneVerified = false;
      phoneCodeInput?.focus();
      setPhoneStatus('Verification code sent. Enter the code below to confirm your phone number.', false);
    } catch (error) {
      console.error('Unable to send phone verification code:', error);
      setPhoneStatus(getFriendlyAuthError(error), true);
    }
  });

  verifyPhoneCodeButton?.addEventListener('click', async () => {
    const code = phoneCodeInput?.value?.trim() || '';

    if (!phoneVerificationId) {
      setPhoneStatus('Request a verification code before confirming it.', true);
      return;
    }

    if (!code) {
      setPhoneStatus('Please enter the verification code.', true);
      return;
    }

    try {
      phoneCredential = await authService.buildPhoneCredential(phoneVerificationId, code);
      phoneVerified = true;
      setPhoneStatus('Phone number verified successfully.', false);
    } catch (error) {
      console.error('Phone verification failed:', error);
      phoneVerified = false;
      phoneCredential = null;
      setPhoneStatus(getFriendlyAuthError(error), true);
    }
  });

  registrationForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(registrationForm);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    const passwordRequirements = {
      minLength: password && password.length >= 12,
      uppercase: /[A-Z]/.test(password || ''),
      specialChar: /[^A-Za-z0-9]/.test(password || '')
    };

    const unmetRequirements = [];

    if (!passwordRequirements.minLength) {
      unmetRequirements.push('at least 12 characters');
    }
    if (!passwordRequirements.uppercase) {
      unmetRequirements.push('one uppercase letter');
    }
    if (!passwordRequirements.specialChar) {
      unmetRequirements.push('one special character');
    }

    if (unmetRequirements.length > 0) {
      alert(`Password must include ${unmetRequirements.join(', ')}.`);
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    if (!phoneVerified) {
      setPhoneStatus('Please verify your phone number before creating your account.', true);
      return;
    }

    try {
      await authService.register(formData.get('email'), password, {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        phone: formData.get('phone'),
        role: formData.get('role')
      }, phoneCredential);

      alert('Account created successfully!');
      window.location.hash = 'login';
    } catch (error) {
      console.error('Registration failed:', error);
      alert(getFriendlyAuthError(error));
    }
  });

  document.getElementById('back-to-login')?.addEventListener('click', () => {
    window.location.hash = 'login';
  });
}

function showLoginFormPage() {
  renderView(app, renderLoginFormView());

  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const loginSuccess = document.getElementById('login-success');

  const setLoginError = (message) => {
    if (loginError) {
      loginError.textContent = message || '';
      loginError.hidden = !message;
    }
  };

  const setLoginSuccess = (message) => {
    if (loginSuccess) {
      loginSuccess.textContent = message || '';
      loginSuccess.hidden = !message;
    }
  };

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value || '';

    setLoginError('');
    setLoginSuccess('');

    if (!email || !password) {
      setLoginError('Please enter both your email and password.');
      return;
    }

    try {
      await authService.login(email, password);
      setLoginSuccess('Successful login: welcome to Equipt!');
      window.setTimeout(() => {
        window.location.hash = 'tool-catalog';
      }, 1200);
    } catch (error) {
      console.error('Login failed:', error);
      setLoginError(getFriendlyAuthError(error));
    }
  });

  document.getElementById('register-from-login')?.addEventListener('click', () => {
    window.location.hash = 'register';
  });

  document.getElementById('back-btn')?.addEventListener('click', () => {
    window.location.hash = 'home';
  });
}

function showToolCatalogPage() {
  renderView(app, renderDashboardView());

  const categorySelect = document.getElementById('main-category-select');
  const subcategoryGroups = document.querySelectorAll('.subcategory-group');
  const prompt = document.querySelector('.category-prompt');
  const toggleFiltersButton = document.getElementById('toggle-filters');
  const optionalFilters = document.getElementById('optional-filters');
  const rateMinInput = document.getElementById('rate-min');
  const rateMaxInput = document.getElementById('rate-max');
  const minValueEl = document.getElementById('rate-min-value');
  const maxValueEl = document.getElementById('rate-max-value');

  const updateCategoryVisibility = () => {
    const selectedCategory = categorySelect?.value || '';
    subcategoryGroups.forEach((group) => {
      const isVisible = group.dataset.category === selectedCategory;
      group.classList.toggle('visible', isVisible);
    });

    if (prompt) {
      prompt.style.display = selectedCategory ? 'none' : 'block';
    }
  };

  const updateRateLabels = () => {
    if (!rateMinInput || !rateMaxInput || !minValueEl || !maxValueEl) {
      return;
    }

    const minValue = Number(rateMinInput.value);
    const maxValue = Number(rateMaxInput.value);
    minValueEl.textContent = `$${minValue}`;
    maxValueEl.textContent = `$${maxValue}`;
  };

  toggleFiltersButton?.addEventListener('click', () => {
    if (!optionalFilters) {
      return;
    }

    const isHidden = optionalFilters.classList.toggle('hidden');
    toggleFiltersButton.textContent = isHidden ? 'Filter' : 'Hide Filters';
  });

  categorySelect?.addEventListener('change', updateCategoryVisibility);
  rateMinInput?.addEventListener('input', () => {
    if (Number(rateMinInput.value) > Number(rateMaxInput.value)) {
      rateMaxInput.value = rateMinInput.value;
    }
    updateRateLabels();
  });
  rateMaxInput?.addEventListener('input', () => {
    if (Number(rateMaxInput.value) < Number(rateMinInput.value)) {
      rateMinInput.value = rateMaxInput.value;
    }
    updateRateLabels();
  });

  updateCategoryVisibility();
  updateRateLabels();

  document.getElementById('create-record')?.addEventListener('click', () => {
    databaseService.createRecord('starterCollection', { title: 'Sample record', createdAt: new Date().toISOString() });
  });
}

async function showProfilePage() {
  const currentUser = authService.getCurrentUser();

  if (!currentUser) {
    window.location.hash = 'login';
    return;
  }

  renderView(app, renderProfileView({ email: currentUser.email }));

  try {
    const profile = await authService.getCurrentUserProfile();

    renderView(app, renderProfileView({
      firstName: profile?.firstName,
      lastName: profile?.lastName,
      email: profile?.email || currentUser.email,
      phone: profile?.phone,
      role: profile?.role,
      createdAt: profile?.createdAt
    }));
  } catch (error) {
    console.error('Unable to load profile data:', error);
  }

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await authService.logout();
    window.location.hash = 'login';
  });
}

function route() {
  const hash = window.location.hash.replace('#', '') || 'home';

  if (hash === 'login') {
    showLoginPage();
  } else if (hash === 'login-form') {
    showLoginFormPage();
  } else if (hash === 'register') {
    showRegistrationPage();
  } else if (hash === 'tool-catalog') {
    showToolCatalogPage();
  } else if (hash === 'profile') {
    showProfilePage();
  } else {
    showHomePage();
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);
