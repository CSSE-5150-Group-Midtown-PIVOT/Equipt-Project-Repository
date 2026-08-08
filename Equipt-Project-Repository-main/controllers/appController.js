import { renderView } from '../views/viewRenderer.js';
import { renderHomeView } from '../views/homeView.js';
import { renderLoginView, renderLoginFormView, renderRegistrationView } from '../views/loginView.js';
import { renderDashboardView } from '../views/dashboardView.js';
import { renderProfileUpdateView, renderProfileView } from '../views/profileView.js';
import { renderListToolView } from '../views/listToolView.js';
import { AuthService } from '../services/authService.js';
import { DatabaseService } from '../services/databaseService.js';
import { createReservationSnapshot, formatUsdRate, getEffectiveDailyRate, normalizeDailyRate, shouldBlockRateChange } from '../services/pricingService.js';
import { buildReservationCancellationSummary, formatReservationDateTime, getRefundPolicy } from '../services/reservationService.js';

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
    message.includes('missing or insufficient permissions') ? 'firestore/permission-denied' :
    message.includes('permission-denied') ? 'firestore/permission-denied' :
    (message.includes('invalid-credential') || message.includes('invalid login credentials')) ? 'auth/invalid-credential' :
    '');

  switch (inferredCode) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Incorrect username or password';
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
    case 'auth/unauthorized-domain':
      return 'This site domain is not authorized for Firebase phone verification. Add it under Firebase Auth > Settings > Authorized domains.';
    case 'auth/missing-recaptcha-container':
      return 'Phone verification setup is incomplete on this page. Refresh and try again.';
    case 'auth/billing-not-enabled':
      return 'Phone SMS verification is unavailable until billing is enabled in Firebase.';
    case 'auth/internal-error':
      if (window.location.protocol === 'file:') {
        return 'Phone verification CAPTCHA cannot run from a file URL. Start the app from http://localhost (or an authorized HTTPS domain) and try again.';
      }
      return 'Phone verification could not initialize CAPTCHA. Refresh and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this phone number using a different sign-in method. Try signing in with that method, then link additional sign-in methods in your profile settings.';
    case 'firestore/permission-denied':
    case 'permission-denied':
      return 'Authentication succeeded, but database access is blocked by Firestore security rules. Update your Firestore rules to restore reads/writes.';
    default:
      return error?.message || 'An unexpected error occurred. Please try again.';
  }
}

function getStoredAuthRedirect() {
  const redirectTarget = sessionStorage.getItem('redirectAfterAuth');
  sessionStorage.removeItem('redirectAfterAuth');
  return redirectTarget;
}

function getStoredAuthMessage() {
  const message = sessionStorage.getItem('authPromptMessage');
  sessionStorage.removeItem('authPromptMessage');
  return message || '';
}

function getStoredAuthSuccessMessage() {
  const message = sessionStorage.getItem('authSuccessMessage');
  sessionStorage.removeItem('authSuccessMessage');
  return message || '';
}

function initializePasswordToggle(toggleButton, passwordInput) {
  if (!toggleButton || !passwordInput) {
    return;
  }

  const openIcon = toggleButton.querySelector('.password-toggle-icon--open');
  const closedIcon = toggleButton.querySelector('.password-toggle-icon--closed');

  const syncPasswordToggleUi = () => {
    const showingPassword = passwordInput.type === 'text';
    const shouldShowOpenEye = !showingPassword;

    toggleButton.setAttribute('aria-pressed', String(showingPassword));
    toggleButton.setAttribute('aria-label', shouldShowOpenEye ? 'Show password' : 'Hide password');
    toggleButton.setAttribute('title', shouldShowOpenEye ? 'Show password' : 'Hide password');
    openIcon?.classList.toggle('is-hidden', !shouldShowOpenEye);
    closedIcon?.classList.toggle('is-hidden', shouldShowOpenEye);
  };

  syncPasswordToggleUi();

  toggleButton.addEventListener('click', () => {
    passwordInput.type = passwordInput.type === 'text' ? 'password' : 'text';
    syncPasswordToggleUi();
  });
}

function initializeLoginPasswordToggle() {
  const toggleButton = document.getElementById('login-password-toggle');
  const passwordInput = document.getElementById('password');

  if (!toggleButton || !passwordInput) {
    return;
  }

  initializePasswordToggle(toggleButton, passwordInput);
}

function initializeRegistrationPasswordToggles() {
  const registrationPasswordToggle = document.getElementById('registration-password-toggle');
  const registrationPasswordInput = document.getElementById('registration-password');
  const registrationConfirmPasswordToggle = document.getElementById('registration-confirm-password-toggle');
  const registrationConfirmPasswordInput = document.getElementById('registration-confirm-password');

  initializePasswordToggle(registrationPasswordToggle, registrationPasswordInput);
  initializePasswordToggle(registrationConfirmPasswordToggle, registrationConfirmPasswordInput);
}

async function showHomePage() {
  const currentUser = authService.getCurrentUser();
  let userRole = '';

  if (currentUser) {
    try {
      const profile = await authService.getCurrentUserProfile();
      userRole = profile?.role || '';
    } catch (error) {
      console.error('Unable to load profile role for home page:', error);
    }
  }

  renderView(app, renderHomeView(Boolean(currentUser), userRole));
  document.getElementById('go-login')?.addEventListener('click', showLoginPage);
}

function showLoginPage() {
  window.location.hash = 'login-form';
}

function showRegistrationPage() {
  renderView(app, renderRegistrationView());
  initializeRegistrationPasswordToggles();

  const registrationForm = document.getElementById('registration-form');
  const sendPhoneCodeButton = document.getElementById('send-phone-code');
  const verifyPhoneCodeButton = document.getElementById('verify-phone-code');
  const phoneVerificationStatus = document.getElementById('phone-verification-status');
  const phoneCodeInput = document.getElementById('phone-code');
  const registrationPasswordError = document.getElementById('registration-password-error');
  const registrationPasswordInput = registrationForm?.querySelector('input[name="password"]');
  const registrationConfirmPasswordInput = registrationForm?.querySelector('input[name="confirmPassword"]');

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

  const setRegistrationPasswordError = (message) => {
    if (!registrationPasswordError) {
      return;
    }

    registrationPasswordError.textContent = message || '';
    registrationPasswordError.hidden = !message;
  };

  registrationPasswordInput?.addEventListener('input', () => setRegistrationPasswordError(''));
  registrationConfirmPasswordInput?.addEventListener('input', () => setRegistrationPasswordError(''));

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
    setRegistrationPasswordError('');

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
      setRegistrationPasswordError(`Password must include ${unmetRequirements.join(', ')}.`);
      return;
    }

    if (password !== confirmPassword) {
      setRegistrationPasswordError('Passwords do not match.');
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

      sessionStorage.setItem('authSuccessMessage', 'Account created successfully. Please log in to continue.');
      window.location.hash = 'login-form';
    } catch (error) {
      console.error('Registration failed:', error);
      setRegistrationPasswordError(getFriendlyAuthError(error));
    }
  });

  document.getElementById('back-to-login')?.addEventListener('click', () => {
    window.location.hash = 'login';
  });
}

function showLoginFormPage() {
  renderView(app, renderLoginFormView());
  initializeLoginPasswordToggle();

  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const loginSuccess = document.getElementById('login-success');
  const promptMessage = getStoredAuthMessage();
  const successMessage = getStoredAuthSuccessMessage();

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

  if (successMessage) {
    setLoginSuccess(successMessage);
  } else if (promptMessage) {
    setLoginSuccess(promptMessage);
  }

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
      getStoredAuthRedirect();
      setLoginSuccess('Successful login: Welcome to Equipt!');
      window.setTimeout(() => {
        window.location.hash = 'home';
      }, 800);
    } catch (error) {
      console.error('Login failed:', error);
      setLoginError(getFriendlyAuthError(error));
    }
  });

  document.getElementById('register-from-login')?.addEventListener('click', () => {
    sessionStorage.setItem('redirectAfterAuth', 'list-tool');
    sessionStorage.setItem('authPromptMessage', 'Sign in or create an account to list your tools.');
    window.location.hash = 'register';
  });

  document.getElementById('back-btn')?.addEventListener('click', () => {
    window.location.hash = 'home';
  });
}

function showListToolPage() {
  if (!authService.getCurrentUser()) {
    sessionStorage.setItem('redirectAfterAuth', 'list-tool');
    sessionStorage.setItem('authPromptMessage', 'Sign in or create an account to list your tools.');
    window.location.hash = 'login-form';
    return;
  }

  renderView(app, renderListToolView());

  const currentUser = authService.getCurrentUser();
  const form = document.getElementById('list-tool-form');
  const fileInput = document.getElementById('tool-images');
  const previewList = document.getElementById('image-preview-list');
  const statusEl = document.getElementById('listing-status');
  const publishButton = document.getElementById('publish-listing-btn');
  const saveDraftButton = document.getElementById('save-draft-btn');
  const categorySelect = document.getElementById('item-category');
  const subcategoryGroups = document.querySelectorAll('#list-category-checklist .subcategory-group');
  const categoryPrompt = document.querySelector('#list-category-checklist .category-prompt');
  const requiredFields = ['item-name', 'item-description', 'item-location', 'condition', 'rental-price'];
  const maxListingImageBytes = 8 * 1024 * 1024;
  const supportedImageTypes = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'image/svg+xml',
    'image/heic',
    'image/heif'
  ]);
  const supportedImageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg', 'heic', 'heif']);
  let selectedImages = [];

  const setStatus = (message, isError = false) => {
    if (!statusEl) {
      return;
    }

    statusEl.textContent = message || '';
    statusEl.hidden = !message;
    statusEl.classList.toggle('form-error', isError);
    statusEl.classList.toggle('form-success', !isError && Boolean(message));
  };

  const updateCategoryVisibility = () => {
    const selectedCategory = categorySelect?.value || '';

    subcategoryGroups.forEach((group) => {
      const isVisible = group.dataset.category === selectedCategory;
      group.classList.toggle('visible', isVisible);
    });

    if (categoryPrompt) {
      categoryPrompt.style.display = selectedCategory ? 'none' : 'block';
    }
  };

  const updatePublishState = () => {
    if (!publishButton) {
      return;
    }

    const values = requiredFields.map((fieldId) => {
      const element = document.getElementById(fieldId);
      return element ? element.value.trim() : '';
    });

    const hasRequiredValues = values.every(Boolean);
    const hasPrice = Number(document.getElementById('rental-price')?.value || 0) > 0;
    const hasImages = selectedImages.length > 0;
    const hasMainCategory = Boolean(categorySelect?.value);
    const hasSubcategory = Array.from(subcategoryGroups).some((group) => {
      return group.classList.contains('visible') && group.querySelector('input[type="checkbox"]:checked');
    });

    publishButton.disabled = !(hasRequiredValues && hasPrice && hasImages && hasMainCategory && hasSubcategory);
  };

  const buildPreviewEntry = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({ file, url: reader.result });
      };
      reader.onerror = () => {
        reject(new Error(`Unable to preview ${file?.name || 'selected image'}.`));
      };
      reader.readAsDataURL(file);
    });
  };

  const renderPreviews = () => {
    if (!previewList) {
      return;
    }

    previewList.innerHTML = '';

    selectedImages.forEach((entry, index) => {
      const card = document.createElement('div');
      card.className = 'image-preview-card';

      const image = document.createElement('img');
      image.src = entry.url;
      image.alt = `Preview ${index + 1}`;
      card.appendChild(image);

      const meta = document.createElement('div');
      meta.className = 'image-preview-card__meta';
      meta.innerHTML = `<span>${index === 0 ? 'Cover' : 'Photo'}</span><span>${entry.file.name}</span>`;
      card.appendChild(meta);

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'image-remove-btn';
      removeButton.textContent = 'Remove';
      removeButton.addEventListener('click', () => {
        selectedImages.splice(index, 1);
        renderPreviews();
        updatePublishState();
      });
      card.appendChild(removeButton);
      previewList.appendChild(card);
    });
  };

  fileInput?.addEventListener('change', async (event) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) {
      return;
    }

    const rejectedType = [];
    const rejectedSize = [];

    const getFileExtension = (fileName = '') => {
      const parts = String(fileName || '').toLowerCase().split('.');
      return parts.length > 1 ? parts.pop() : '';
    };

    const imageFiles = files.filter((file) => {
      const normalizedType = String(file.type || '').toLowerCase();
      const extension = getFileExtension(file.name || '');
      const isSupportedType = supportedImageTypes.has(normalizedType) || supportedImageExtensions.has(extension);
      const isWithinSize = Number(file.size || 0) <= maxListingImageBytes;

      if (!isSupportedType) {
        rejectedType.push(file.name || 'Unnamed file');
      }

      if (!isWithinSize) {
        rejectedSize.push(file.name || 'Unnamed file');
      }

      return isSupportedType && isWithinSize;
    });

    try {
      const results = await Promise.allSettled(imageFiles.map((file) => buildPreviewEntry(file)));
      const newEntries = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
      const failedPreviewCount = results.filter((result) => result.status === 'rejected').length;

      selectedImages = [...selectedImages, ...newEntries];
      renderPreviews();
      updatePublishState();

      if (rejectedType.length > 0 || rejectedSize.length > 0 || failedPreviewCount > 0) {
        const messages = [];
        if (rejectedType.length > 0) {
          messages.push('Unsupported format (use JPG, PNG, WEBP, GIF, AVIF, SVG, or HEIC/HEIF).');
        }
        if (rejectedSize.length > 0) {
          messages.push('Some files were larger than 8 MB.');
        }
        if (failedPreviewCount > 0) {
          messages.push('Some images could not be previewed in this browser.');
        }
        setStatus(messages.join(' '), true);
      } else if (newEntries.length > 0) {
        setStatus('', false);
      } else {
        setStatus('No compatible images were selected for preview.', true);
      }
    } catch (error) {
      console.error('Unable to generate image previews:', error);
      setStatus('We could not preview the selected files. Try JPG/PNG/WEBP under 8 MB each.', true);
    } finally {
      event.target.value = '';
    }
  });

  categorySelect?.addEventListener('change', () => {
    updateCategoryVisibility();
    updatePublishState();
  });

  subcategoryGroups.forEach((group) => {
    group.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener('change', updatePublishState);
    });
  });

  form?.querySelectorAll('input, textarea, select').forEach((element) => {
    element.addEventListener('input', updatePublishState);
    element.addEventListener('change', updatePublishState);
  });

  saveDraftButton?.addEventListener('click', () => {
    const draftData = new FormData(form);
    const draftPayload = Object.fromEntries(draftData.entries());
    localStorage.setItem('equipt-draft-listing', JSON.stringify(draftPayload));
    setStatus('Draft saved locally. You can publish it later.', false);
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const values = requiredFields.map((fieldId) => {
      const element = document.getElementById(fieldId);
      return element ? element.value.trim() : '';
    });

    const hasRequiredValues = values.every(Boolean);
    const hasPrice = Number(document.getElementById('rental-price')?.value || 0) > 0;
    const hasImages = selectedImages.length > 0;
    const hasMainCategory = Boolean(categorySelect?.value);
    const hasSubcategory = Array.from(subcategoryGroups).some((group) => {
      return group.classList.contains('visible') && group.querySelector('input[type="checkbox"]:checked');
    });

    if (!hasRequiredValues || !hasPrice || !hasImages || !hasMainCategory || !hasSubcategory) {
      setStatus('Please complete all required fields, select a main category and at least one subcategory, and add at least one photo before publishing.', true);
      return;
    }

    try {
      setStatus('', false);
      const photos = await readImageFilesAsDataUrls(selectedImages.map((entry) => entry.file));
      const selectedSubcategories = Array.from(document.querySelectorAll('#list-category-checklist input[type="checkbox"]:checked')).map((checkbox) => checkbox.value);
      const nextDailyRate = normalizeDailyRate(document.getElementById('rental-price')?.value || 0);
      const availabilityValue = 'Available now';
      const profile = await authService.getCurrentUserProfile();
      const ownerRole = String(profile?.role || 'Lender').trim();

      const createdListing = await databaseService.createRecord('listings', {
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email,
        ownerRole,
        toolName: document.getElementById('item-name')?.value?.trim() || '',
        itemDescription: document.getElementById('item-description')?.value?.trim() || '',
        itemCategory: categorySelect?.value || '',
        subcategories: selectedSubcategories,
        itemLocation: document.getElementById('item-location')?.value?.trim() || '',
        condition: document.getElementById('condition')?.value || '',
        rentalPrice: nextDailyRate,
        rentalPeriod: document.getElementById('rental-period')?.value || 'day',
        dailyRate: nextDailyRate,
        standardDailyRateUsd: nextDailyRate,
        currency: 'USD',
        availability: availabilityValue,
        publicationStatus: 'Published',
        isPublished: true,
        visibility: 'public',
        publiclyVisible: true,
        photos,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (availabilityValue.toLowerCase().includes('reserved') || availabilityValue.toLowerCase().includes('booked')) {
        const reservationSnapshot = createReservationSnapshot({
          id: createdListing.id,
          ownerId: currentUser.uid,
          toolName: document.getElementById('item-name')?.value?.trim() || '',
          dailyRate: nextDailyRate,
          rentalPrice: nextDailyRate
        }, {
          listingId: createdListing.id,
          ownerId: currentUser.uid,
          toolName: document.getElementById('item-name')?.value?.trim() || '',
          bookedRateUsd: nextDailyRate,
          status: 'Booked',
          reservationStatus: 'Booked',
          bookedAt: new Date().toISOString()
        });

        const reservationRecord = await databaseService.createRecord('reservations', reservationSnapshot);
        await databaseService.updateRecord('listings', createdListing.id, {
          reservationId: reservationRecord.id,
          bookingId: reservationRecord.id,
          reservationStatus: 'Booked'
        });
      }

      form.reset();
      selectedImages = [];
      renderPreviews();
      updatePublishState();
      setStatus('Success: listing published.', false);
      window.setTimeout(() => {
        window.location.hash = 'home';
      }, 1200);
    } catch (error) {
      console.error('Unable to publish your listing:', error);
      setStatus('We could not publish your listing. Please try again.', true);
    }
  });

  updateCategoryVisibility();
  updatePublishState();
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(amount = 0) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount || 0));
}

function getReservationPhoto(reservation = {}) {
  const photos = reservation.photos || reservation.toolPhotos || reservation.listing?.photos || [];
  if (Array.isArray(photos) && photos.length > 0) {
    return photos[0];
  }
  if (typeof photos === 'string') {
    return photos;
  }
  return '';
}

function getReservationToolName(reservation = {}) {
  return reservation.toolName || reservation.listing?.toolName || reservation.listingName || 'Tool reservation';
}

function normalizeRentalStatus(value = '') {
  const rawStatus = String(value || '').trim().toLowerCase();

  if (!rawStatus) {
    return 'confirmed';
  }

  if (['booked', 'reserved', 'pending', 'confirmed', 'pending confirmation'].includes(rawStatus)) {
    return 'confirmed';
  }

  if (['active', 'in progress', 'in-progress'].includes(rawStatus)) {
    return 'active';
  }

  if (['returned', 'complete', 'completed'].includes(rawStatus)) {
    return 'returned';
  }

  if (['cancelled', 'canceled'].includes(rawStatus)) {
    return 'cancelled';
  }

  return rawStatus;
}

function getRentalStatusLabel(status = '') {
  const normalizedStatus = normalizeRentalStatus(status);

  switch (normalizedStatus) {
    case 'active':
      return 'Active';
    case 'returned':
      return 'Returned';
    case 'cancelled':
      return 'Cancelled';
    case 'confirmed':
    default:
      return 'Confirmed';
  }
}

function getRentalStatusClass(status = '') {
  const normalizedStatus = normalizeRentalStatus(status);

  switch (normalizedStatus) {
    case 'active':
      return 'rental-status-chip--active';
    case 'returned':
      return 'rental-status-chip--returned';
    case 'cancelled':
      return 'rental-status-chip--cancelled';
    case 'confirmed':
    default:
      return 'rental-status-chip--confirmed';
  }
}

function getAllowedRentalStatusTransitions(status = '') {
  const normalizedStatus = normalizeRentalStatus(status);
  const transitions = [
    { label: 'Mark as Confirmed', nextStatus: 'confirmed' },
    { label: 'Mark as Active', nextStatus: 'active' },
    { label: 'Mark as Returned', nextStatus: 'returned' },
    { label: 'Cancel Rental', nextStatus: 'cancelled' }
  ];

  return transitions.filter((transition) => transition.nextStatus !== normalizedStatus);
}

async function readImageFilesAsDataUrls(files = []) {
  const fileList = Array.isArray(files) ? files : [];
  const readers = fileList.filter(Boolean).map((file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  }));

  return Promise.all(readers);
}

async function readOptimizedProfilePhotoDataUrl(file, options = {}) {
  const {
    maxDimension = 512,
    initialQuality = 0.82,
    minQuality = 0.5,
    targetMaxBytes = 360 * 1024
  } = options;

  const asDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read profile image file.'));
    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unable to load profile image for processing.'));
    img.src = asDataUrl;
  });

  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to process image in this browser.');
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  let quality = initialQuality;
  let output = canvas.toDataURL('image/jpeg', quality);

  while (output.length > targetMaxBytes * 1.37 && quality > minQuality) {
    quality = Math.max(minQuality, quality - 0.08);
    output = canvas.toDataURL('image/jpeg', quality);
  }

  return output;
}

async function loadMyRentals(currentUser) {
  const shell = document.getElementById('my-rentals-shell');

  if (!shell || !currentUser) {
    return;
  }

  shell.innerHTML = '<p class="empty-state">Loading your rentals…</p>';

  try {
    const allReservations = await databaseService.readRecords('reservations');
    const allUsers = await databaseService.readRecords('users');
    const userLookup = new Map((allUsers || []).map((user) => [user.uid || user.id, user]));
    const myRentals = (allReservations || []).filter((reservation) => {
      const renterId = reservation.renterId || reservation.userId || reservation.bookedBy || '';
      return renterId === currentUser.uid;
    });

    if (!myRentals.length) {
      shell.innerHTML = '<p class="empty-state">You have not booked any rentals yet.</p>';
      return;
    }

    shell.innerHTML = myRentals.map((reservation) => {
      const rentalStatus = normalizeRentalStatus(reservation.reservationStatus || reservation.status || 'confirmed');
      const ownerProfile = userLookup.get(reservation.ownerId || '') || null;
      const contactName = [ownerProfile?.firstName, ownerProfile?.lastName].filter(Boolean).join(' ') || 'Lender';
      const contactEmail = ownerProfile?.email || reservation.ownerEmail || '';
      const contactPhone = ownerProfile?.phone || '';
      const contactMarkup = rentalStatus === 'confirmed'
        ? `
          <div class="rental-contact-card">
            <p><strong>Contact:</strong> ${escapeHtml(contactName)}</p>
            ${contactEmail ? `<p><strong>Email:</strong> ${escapeHtml(contactEmail)}</p>` : ''}
            ${contactPhone ? `<p><strong>Phone:</strong> ${escapeHtml(contactPhone)}</p>` : ''}
          </div>
        `
        : '';

      return `
        <article class="listing-card">
          <div class="listing-card__body">
            <div class="listing-card__details">
              <h4>${escapeHtml(reservation.toolName || 'Rental')}</h4>
              <p><strong>Booking ID:</strong> ${escapeHtml(reservation.id)}</p>
              <p><strong>Status:</strong> <span class="rental-status-chip ${escapeHtml(getRentalStatusClass(rentalStatus))}">${escapeHtml(getRentalStatusLabel(rentalStatus))}</span></p>
              ${contactMarkup}
            </div>
          </div>
        </article>
      `;
    }).join('');
  } catch (error) {
    console.error('Unable to load your rentals:', error);
    shell.innerHTML = '<p class="empty-state">We could not load your rentals right now.</p>';
  }
}

async function loadLenderBookingRequests(currentUser) {
  const shell = document.getElementById('booking-requests-shell');

  if (!shell || !currentUser) {
    return;
  }

  shell.innerHTML = '<p class="empty-state">Loading booking requests…</p>';

  try {
    const [allListings, allReservations] = await Promise.all([
      databaseService.readRecords('listings'),
      databaseService.readRecords('reservations')
    ]);

    const ownerListings = (allListings || []).filter((listing) => listing.ownerId === currentUser.uid);
    const ownerListingIds = new Set(ownerListings.map((listing) => listing.id));
    const ownerReservations = (allReservations || []).filter((reservation) => {
      const listingId = reservation.listingId || reservation.listing?.id || reservation.listing_id || '';
      return ownerListingIds.has(listingId);
    });

    const getReservationDateKey = (reservation = {}) => getDateKey(
      reservation.startDate ||
      reservation.start ||
      reservation.bookedDate ||
      reservation.date ||
      reservation.reservedDates ||
      reservation.bookedDates ||
      reservation.dates ||
      reservation.bookedAt || ''
    );

    const sortReservations = (reservations = [], direction = 'asc') => reservations.sort((left, right) => {
      const leftDate = getReservationDateKey(left);
      const rightDate = getReservationDateKey(right);

      if (direction === 'desc') {
        return rightDate.localeCompare(leftDate);
      }

      return leftDate.localeCompare(rightDate);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cancelledStatuses = new Set(['cancelled', 'canceled', 'rejected']);
    const completedStatuses = new Set(['returned', 'completed']);

    const getStatusBucket = (reservation = {}) => {
      const normalizedStatus = String(getReservationStatus(reservation) || 'Pending').trim().toLowerCase();
      const dateKey = getReservationDateKey(reservation);
      const startDate = dateKey ? new Date(`${dateKey}T12:00:00`) : null;
      const isPastReservation = Boolean(startDate && startDate < today);

      if (cancelledStatuses.has(normalizedStatus)) {
        return 'cancelled';
      }

      if (completedStatuses.has(normalizedStatus) || isPastReservation) {
        return 'completed';
      }

      return 'upcoming';
    };

    const groupedReservations = {
      upcoming: [],
      completed: [],
      cancelled: []
    };

    ownerReservations.forEach((reservation) => {
      groupedReservations[getStatusBucket(reservation)].push(reservation);
    });

    sortReservations(groupedReservations.upcoming, 'asc');
    sortReservations(groupedReservations.completed, 'desc');
    sortReservations(groupedReservations.cancelled, 'desc');

    const getMonthLabel = (dateKey = '') => {
      if (!dateKey) {
        return 'No Date';
      }

      const parsedDate = new Date(`${dateKey}T12:00:00`);
      if (Number.isNaN(parsedDate.getTime())) {
        return 'No Date';
      }

      return parsedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const renderReservationCard = (reservation, bucket = 'upcoming') => {
      const listing = ownerListings.find((entry) => entry.id === (reservation.listingId || reservation.listing?.id || reservation.listing_id)) || {};
      const bookingState = getReservationStatus(reservation);
      const bookingDateKey = getReservationDateKey(reservation);
      const bookingDateLabel = bookingDateKey ? new Date(`${bookingDateKey}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date selected';
      const startDate = bookingDateKey ? new Date(`${bookingDateKey}T12:00:00`) : null;
      const isFutureBooking = startDate ? startDate >= today : false;
      const normalizedStatus = String(bookingState || 'Pending').trim().toLowerCase();
      const canReject = ['pending', 'pending request', 'requested'].includes(normalizedStatus);
      const canCancel = ['confirmed', 'booked', 'accepted'].includes(normalizedStatus) && isFutureBooking;
      const cardClass = bucket === 'cancelled' ? 'booking-request-card booking-request-card--cancelled' : 'booking-request-card';
      const cancelButtonMarkup = canCancel
        ? `<button type="button" class="secondary reservation-cancel-btn" data-action="cancel-booking" data-reservation-id="${escapeHtml(reservation.id)}">Cancel Reservation</button>`
        : '';

      return `
        <article class="${cardClass}" data-reservation-id="${escapeHtml(reservation.id)}">
          <div class="booking-request-card__body">
            <div class="booking-request-card__details">
              <h4>${escapeHtml(listing.toolName || 'Tool request')}</h4>
              <p><strong>Tool:</strong> ${escapeHtml(listing.toolName || 'Unknown listing')}</p>
              <p><strong>Date:</strong> ${escapeHtml(bookingDateLabel)}</p>
              <p><strong>Status:</strong> ${escapeHtml(bookingState || 'Pending')}</p>
              ${reservation.reason ? `<p><strong>Reason:</strong> ${escapeHtml(reservation.reason)}</p>` : ''}
              ${cancelButtonMarkup}
            </div>
            <div class="booking-request-card__actions">
              ${canReject ? `<button type="button" class="secondary" data-action="reject-booking" data-reservation-id="${escapeHtml(reservation.id)}">Reject</button>` : ''}
            </div>
          </div>
        </article>
      `;
    };

    const renderMonthGroups = (reservations = [], bucket = 'upcoming') => {
      const monthGroups = new Map();

      reservations.forEach((reservation) => {
        const dateKey = getReservationDateKey(reservation);
        const monthSortKey = dateKey ? dateKey.slice(0, 7) : '9999-99';
        const monthLabel = getMonthLabel(dateKey);
        const groupKey = `${monthSortKey}__${monthLabel}`;

        if (!monthGroups.has(groupKey)) {
          monthGroups.set(groupKey, {
            monthSortKey,
            monthLabel,
            items: []
          });
        }

        monthGroups.get(groupKey).items.push(reservation);
      });

      const sortedGroups = Array.from(monthGroups.values()).sort((left, right) => {
        if (bucket === 'upcoming') {
          return left.monthSortKey.localeCompare(right.monthSortKey);
        }

        return right.monthSortKey.localeCompare(left.monthSortKey);
      });

      return sortedGroups.map((group, index) => `
        <details class="booking-month-group" ${index === 0 ? 'open' : ''}>
          <summary>
            <span>${escapeHtml(group.monthLabel)}</span>
            <span class="booking-count-badge booking-count-badge--month">${group.items.length}</span>
          </summary>
          <div class="booking-month-group__list">
            ${group.items.map((reservation) => renderReservationCard(reservation, bucket)).join('')}
          </div>
        </details>
      `).join('');
    };

    const renderStatusSection = ({ title, bucket, reservations, emptyMessage, openByDefault = false }) => `
      <details class="booking-status-folder" ${openByDefault ? 'open' : ''}>
        <summary>
          <span>${escapeHtml(title)}</span>
          <span class="booking-count-badge">${reservations.length}</span>
        </summary>
        <div class="booking-status-folder__content">
          ${reservations.length ? renderMonthGroups(reservations, bucket) : `<p class="empty-state">${escapeHtml(emptyMessage)}</p>`}
        </div>
      </details>
    `;

    shell.innerHTML = `
      <div class="booking-requests__section">
        ${renderStatusSection({
          title: 'Upcoming Bookings',
          bucket: 'upcoming',
          reservations: groupedReservations.upcoming,
          emptyMessage: 'No upcoming bookings.',
          openByDefault: true
        })}
        ${renderStatusSection({
          title: 'Completed Bookings',
          bucket: 'completed',
          reservations: groupedReservations.completed,
          emptyMessage: 'No completed bookings yet.'
        })}
        ${renderStatusSection({
          title: 'Cancelled Bookings',
          bucket: 'cancelled',
          reservations: groupedReservations.cancelled,
          emptyMessage: 'No cancelled bookings.'
        })}
      </div>
    `;

    shell.querySelectorAll('[data-action="reject-booking"]').forEach((button) => {
      button.addEventListener('click', async () => {
        const reservationId = button.getAttribute('data-reservation-id');
        const reservation = ownerReservations.find((entry) => entry.id === reservationId);
        if (!reservation) {
          return;
        }

        const confirmed = window.confirm('Are you sure you want to reject this booking request?');
        if (!confirmed) {
          return;
        }

        const reason = window.prompt('Optional reason for rejection:', '');
        await updateBookingState(reservation, 'Rejected', reason || '');
        await loadLenderBookingRequests(currentUser);
        await loadMyListings(currentUser);
        await loadCatalogListings();
      });
    });

    shell.querySelectorAll('[data-action="cancel-booking"]').forEach((button) => {
      button.addEventListener('click', async () => {
        const reservationId = button.getAttribute('data-reservation-id');
        const reservation = ownerReservations.find((entry) => entry.id === reservationId);
        if (!reservation) {
          return;
        }

        const summary = buildReservationCancellationSummary(reservation);
        const refundPolicy = getRefundPolicy(reservation);
        const listing = ownerListings.find((entry) => entry.id === (reservation.listingId || reservation.listing?.id || reservation.listing_id)) || {};
        const photo = getReservationPhoto({
          ...reservation,
          toolPhotos: listing.photos,
          listing
        });
        const toolName = reservation.toolName || listing.toolName || 'Tool reservation';
        const status = String(reservation.status || '').trim().toLowerCase();
        const showRefundLine = status === 'cancelled' || status === 'canceled';
        const reservationDates = reservation.startDate || reservation.startAt || reservation.startDateTime || reservation.start || reservation.bookedDate || reservation.date;
        const reservationEndDate = reservation.endDate || reservation.endAt || reservation.endDateTime || reservation.end || reservation.selectedDateRange?.at(-1) || reservation.bookedDate || reservation.date;
        const displayDates = reservationDates
          ? `${formatReservationDateTime(reservationDates)}${reservationEndDate && reservationEndDate !== reservationDates ? ` – ${formatReservationDateTime(reservationEndDate)}` : ''}`
          : 'Not provided';
        const modalMarkup = `
          <div class="reservation-modal-backdrop" role="dialog" aria-modal="true" aria-label="Cancel reservation confirmation">
            <div class="reservation-modal">
              <h3>Cancel Reservation</h3>
              <div class="reservation-modal__body">
                <div class="reservation-modal__image">
                  ${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(toolName)}" />` : '<div class="reservation-modal__placeholder">No photo</div>'}
                </div>
                <div class="reservation-modal__content">
                  <p><strong>${escapeHtml(toolName)}</strong></p>
                  <p><strong>Selected rental dates:</strong> ${escapeHtml(displayDates)}</p>
                  <p><strong>Cancellation deadline:</strong> ${escapeHtml(summary.cancellationDeadlineLabel)}</p>
                  ${showRefundLine ? `<p><strong>Refund:</strong> ${escapeHtml(refundPolicy.summary)}</p>` : ''}
                  <label class="reservation-modal__field" for="lender-cancellation-reason">
                    <span>Reason</span>
                    <select id="lender-cancellation-reason">
                      <option value="Tool No Longer Available">Tool No Longer Available</option>
                      <option value="Plans Changed">Plans Changed</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                </div>
              </div>
              <div class="reservation-modal__actions">
                <button type="button" class="secondary" data-action="keep-reservation">Keep Reservation</button>
                <button type="button" class="secondary" data-action="dismiss-cancel-modal">Close</button>
                <button type="button" class="primary reservation-modal__confirm" data-action="confirm-cancellation">Confirm Cancellation</button>
              </div>
            </div>
          </div>
        `;

        const modalRoot = document.createElement('div');
        modalRoot.innerHTML = modalMarkup;
        const modalElement = modalRoot.firstElementChild;
        if (modalElement) {
          document.body.appendChild(modalElement);
        }

        const closeModal = () => {
          modalElement?.remove();
          document.removeEventListener('keydown', handleEscapeKey);
        };

        const handleEscapeKey = (event) => {
          if (event.key === 'Escape') {
            closeModal();
          }
        };

        document.addEventListener('keydown', handleEscapeKey);
        modalElement?.addEventListener('click', (event) => {
          if (event.target === modalElement) {
            closeModal();
          }
        });

        modalElement?.querySelector('[data-action="keep-reservation"]')?.addEventListener('click', () => {
          closeModal();
        });
        modalElement?.querySelector('[data-action="dismiss-cancel-modal"]')?.addEventListener('click', () => {
          closeModal();
        });

        modalElement?.querySelector('[data-action="confirm-cancellation"]')?.addEventListener('click', async () => {
          const reason = modalElement?.querySelector('#lender-cancellation-reason')?.value || 'Other';
          await updateBookingState(reservation, 'Cancelled', reason || '', {
            cancelledBy: 'lender',
            cancellationBy: currentUser.uid,
            cancellationReason: reason || ''
          });
          closeModal();
          await loadLenderBookingRequests(currentUser);
          await loadMyListings(currentUser);
          await loadCatalogListings();
        });
      });
    });
  } catch (error) {
    console.error('Unable to load lender booking requests:', error);
    shell.innerHTML = '<p class="empty-state">We could not load booking requests right now.</p>';
  }
}

async function updateBookingState(reservation = {}, nextStatus = 'Cancelled', reason = '', metadata = {}) {
  const listingId = reservation.listingId || reservation.listing?.id || reservation.listing_id || '';
  if (!listingId) {
    return;
  }

  const [allListings, allReservations] = await Promise.all([
    databaseService.readRecords('listings'),
    databaseService.readRecords('reservations')
  ]);

  const listing = (allListings || []).find((entry) => entry.id === listingId);
  const reservationDateKeySet = new Set(getReservationDateRangeKeys(reservation));
  const otherActiveReservations = (allReservations || []).filter((entry) => {
    const entryListingId = entry.listingId || entry.listing?.id || entry.listing_id || '';
    return entryListingId === listingId && entry.id !== reservation.id && isReservationActive(entry);
  });

  const existingReservedDates = Array.isArray(listing?.reservedDates)
    ? listing.reservedDates
    : [listing?.reservedDates || listing?.reservedDate || listing?.bookedDates].filter(Boolean);
  const otherActiveReservationDateKeys = otherActiveReservations.flatMap((entry) => getReservationDateRangeKeys(entry));
  const nextReservedDates = Array.from(new Set([
    ...existingReservedDates.filter((value) => {
      const dateKey = getDateKey(value);
      return dateKey && !reservationDateKeySet.has(dateKey);
    }),
    ...otherActiveReservationDateKeys
  ].filter(Boolean)));

  const hasRemainingReservations = nextReservedDates.length > 0;

  const timestamp = new Date().toISOString();
  const normalizedNextStatus = String(nextStatus || '').trim().toLowerCase();
  const reservationPayload = {
    status: nextStatus,
    reservationStatus: nextStatus,
    reason: reason || reservation.reason || '',
    updatedAt: timestamp,
    ...metadata
  };

  if (normalizedNextStatus === 'cancelled' || normalizedNextStatus === 'canceled') {
    reservationPayload.cancelledAt = metadata.cancelledAt || timestamp;
    reservationPayload.cancellationRequestedAt = metadata.cancellationRequestedAt || reservationPayload.cancelledAt;
  }

  await databaseService.updateRecord('reservations', reservation.id, reservationPayload);

  if (listing) {
    await databaseService.updateRecord('listings', listing.id, {
      availability: hasRemainingReservations ? 'Booked' : 'Available now',
      reservationStatus: hasRemainingReservations ? 'Booked' : 'Available now',
      reservedDates: nextReservedDates,
      bookingId: hasRemainingReservations ? (listing.bookingId || '') : '',
      reservationId: hasRemainingReservations ? (listing.reservationId || '') : '',
      updatedAt: timestamp
    });
  }
}

async function loadMyListings(currentUser) {
  const shell = document.getElementById('my-listings-shell');

  if (!shell || !currentUser) {
    return;
  }

  shell.innerHTML = '<p class="empty-state">Loading your listings…</p>';

  try {
    const allListings = await databaseService.readRecords('listings');
    const allReservations = await databaseService.readRecords('reservations');
    const allUsers = await databaseService.readRecords('users');
    const ownerListings = (allListings || []).filter((listing) => listing.ownerId === currentUser.uid);
    const userLookup = new Map((allUsers || []).map((user) => [user.uid || user.id, user]));

    if (!ownerListings.length) {
      shell.innerHTML = '<p class="empty-state">You have not published any listings yet.</p>';
      return;
    }

    const reservationsByListingId = new Map();
    (allReservations || []).forEach((reservation) => {
      const listingId = reservation.listingId || reservation.listing?.id || '';
      if (!listingId) {
        return;
      }

      const reservationsForListing = reservationsByListingId.get(listingId) || [];
      reservationsForListing.push(reservation);
      reservationsByListingId.set(listingId, reservationsForListing);
    });

    shell.innerHTML = ownerListings.map((listing) => {
      const photoUrl = Array.isArray(listing.photos) && listing.photos.length > 0 ? listing.photos[0] : '';
      const status = listing.publicationStatus || (listing.isPublished ? 'Published' : 'Draft');
      const rate = getEffectiveDailyRate(listing);
      const availability = listing.availability || 'Available now';
      const category = listing.category || listing.itemCategory || 'Uncategorized';
      const reservationsForListing = reservationsByListingId.get(listing.id) || [];
      const reservation = reservationsForListing.find((entry) => entry.id === listing.reservationId || entry.id === listing.bookingId || (entry.listingId || entry.listing?.id || '') === listing.id) || reservationsForListing[0] || null;
      const rentalStatus = normalizeRentalStatus(reservation?.reservationStatus || reservation?.status || listing.reservationStatus || listing.status || 'confirmed');
      const rentalStatusLabel = getRentalStatusLabel(rentalStatus);
      const rentalStatusClass = getRentalStatusClass(rentalStatus);
      const allowedTransitions = getAllowedRentalStatusTransitions(rentalStatus);
      const renterProfile = reservation ? (userLookup.get(reservation.renterId || '') || null) : null;
      const renterName = [renterProfile?.firstName, renterProfile?.lastName].filter(Boolean).join(' ') || 'Renter';
      const renterEmail = renterProfile?.email || reservation?.renterEmail || '';
      const renterPhone = renterProfile?.phone || '';
      const transitionMarkup = allowedTransitions.length > 0
        ? `<div class="rental-status-actions">${allowedTransitions.map((transition) => `<button type="button" class="secondary rental-status-action" data-action="update-rental-status" data-current-status="${escapeHtml(rentalStatus)}" data-listing-id="${escapeHtml(listing.id)}" data-reservation-id="${escapeHtml(reservation?.id || listing.reservationId || listing.bookingId || '')}" data-next-status="${escapeHtml(transition.nextStatus)}">${escapeHtml(transition.label)}</button>`).join('')}</div>`
        : '';
      const contactMarkup = reservation && !['cancelled'].includes(rentalStatus)
        ? `
          <div class="rental-contact-card">
            <p><strong>Renter contact:</strong> ${escapeHtml(renterName)}</p>
            ${renterEmail ? `<p><strong>Email:</strong> ${escapeHtml(renterEmail)}</p>` : ''}
            ${renterPhone ? `<p><strong>Phone:</strong> ${escapeHtml(renterPhone)}</p>` : ''}
          </div>
        `
        : '';

      return `
        <article class="listing-card" data-listing-id="${escapeHtml(listing.id)}">
          <div class="listing-card__body">
            <div class="listing-card__image">
              ${photoUrl ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(listing.toolName || 'Tool photo')}" />` : '<span>No photo</span>'}
            </div>
            <div class="listing-card__details">
              <h4>${escapeHtml(listing.toolName || 'Unnamed listing')}</h4>
              <p><strong>Category:</strong> ${escapeHtml(category)}</p>
              <p><strong>Daily rate:</strong> ${escapeHtml(formatUsdRate(rate))}</p>
              <p><strong>Availability:</strong> ${escapeHtml(availability)}</p>
              <p><strong>Status:</strong> ${escapeHtml(status)}</p>
              ${reservation ? `
                <div class="rental-status-panel">
                  <div class="rental-status-panel__header">
                    <strong>Rental status</strong>
                    <span class="rental-status-chip ${escapeHtml(rentalStatusClass)}">${escapeHtml(rentalStatusLabel)}</span>
                  </div>
                  <p class="rental-status-panel__hint">Advance the booking through the lender workflow as the rental progresses.</p>
                  ${transitionMarkup}
                  ${contactMarkup}
                </div>
              ` : ''}
            </div>
          </div>
          <div class="listing-card__actions">
            <button type="button" class="secondary" data-action="edit-listing" data-listing-id="${escapeHtml(listing.id)}">Edit</button>
            <button type="button" class="secondary" data-action="delete-listing" data-listing-id="${escapeHtml(listing.id)}">Delete</button>
          </div>
        </article>
      `;
    }).join('');

    shell.querySelectorAll('[data-action="edit-listing"]').forEach((button) => {
      button.addEventListener('click', async () => {
        const listingId = button.getAttribute('data-listing-id');
        const listing = ownerListings.find((entry) => entry.id === listingId);

        if (!listing) {
          return;
        }

        const card = button.closest('.listing-card');
        if (!card) {
          return;
        }

        const statusValue = listing.publicationStatus || (listing.isPublished ? 'Published' : 'Draft');
        const subcategoryValue = Array.isArray(listing.subcategories) ? listing.subcategories.join(', ') : '';
        card.innerHTML = `
          <form class="listing-edit-form" data-listing-id="${escapeHtml(listing.id)}">
            <div class="form-field">
              <label for="edit-tool-name">Tool name</label>
              <input id="edit-tool-name" name="toolName" type="text" value="${escapeHtml(listing.toolName || '')}" required />
            </div>
            <div class="form-field">
              <label for="edit-tool-description">Description</label>
              <textarea id="edit-tool-description" name="itemDescription" rows="4">${escapeHtml(listing.itemDescription || '')}</textarea>
            </div>
            <div class="form-grid">
              <div class="form-field">
                <label for="edit-item-category">Category</label>
                <select id="edit-item-category" name="itemCategory">
                  <option value="power-tools" ${listing.itemCategory === 'power-tools' ? 'selected' : ''}>Power Tools</option>
                  <option value="lawn-garden" ${listing.itemCategory === 'lawn-garden' ? 'selected' : ''}>Lawn & Garden Equipment</option>
                  <option value="construction-heavy" ${listing.itemCategory === 'construction-heavy' ? 'selected' : ''}>Construction & Heavy Equipment</option>
                  <option value="automotive" ${listing.itemCategory === 'automotive' ? 'selected' : ''}>Automotive Tools</option>
                  <option value="plumbing" ${listing.itemCategory === 'plumbing' ? 'selected' : ''}>Plumbing Tools</option>
                  <option value="electrical" ${listing.itemCategory === 'electrical' ? 'selected' : ''}>Electrical Tools</option>
                  <option value="painting-finishing" ${listing.itemCategory === 'painting-finishing' ? 'selected' : ''}>Painting & Finishing</option>
                  <option value="cleaning" ${listing.itemCategory === 'cleaning' ? 'selected' : ''}>Cleaning Equipment</option>
                  <option value="moving-hauling" ${listing.itemCategory === 'moving-hauling' ? 'selected' : ''}>Moving & Hauling</option>
                  <option value="woodworking" ${listing.itemCategory === 'woodworking' ? 'selected' : ''}>Woodworking</option>
                  <option value="specialty-seasonal" ${listing.itemCategory === 'specialty-seasonal' ? 'selected' : ''}>Specialty/Seasonal</option>
                </select>
              </div>
              <div class="form-field">
                <label for="edit-availability">Availability</label>
                <select id="edit-availability" name="availability">
                  <option value="Available now" ${listing.availability === 'Available now' ? 'selected' : ''}>Available now</option>
                  <option value="Reserved" ${listing.availability === 'Reserved' ? 'selected' : ''}>Reserved</option>
                  <option value="Pending pickup" ${listing.availability === 'Pending pickup' ? 'selected' : ''}>Pending pickup</option>
                </select>
              </div>
            </div>
            <div class="form-grid">
              <div class="form-field">
                <label for="edit-rental-price">Daily rate (USD)</label>
                <input id="edit-rental-price" name="dailyRate" type="number" min="1" step="0.01" value="${escapeHtml(Number(getEffectiveDailyRate(listing)).toFixed(2))}" required />
              </div>
              <div class="form-field">
                <label for="edit-publication-status">Publication status</label>
                <select id="edit-publication-status" name="publicationStatus">
                  <option value="Published" ${statusValue === 'Published' ? 'selected' : ''}>Published</option>
                  <option value="Draft" ${statusValue === 'Draft' ? 'selected' : ''}>Draft</option>
                </select>
              </div>
            </div>
            <div class="form-field">
              <label for="edit-subcategories">Subcategories</label>
              <input id="edit-subcategories" name="subcategories" type="text" value="${escapeHtml(subcategoryValue)}" placeholder="Separate with commas" />
            </div>
            <div class="form-field">
              <label for="edit-photos">Replace photos</label>
              <input id="edit-photos" name="photos" type="file" accept="image/*" multiple />
            </div>
            <div class="listing-edit-form__actions">
              <button type="submit" class="primary">Save Changes</button>
              <button type="button" class="secondary" data-action="cancel-edit">Cancel</button>
            </div>
          </form>
        `;

        const editForm = card.querySelector('.listing-edit-form');
        editForm?.addEventListener('submit', async (event) => {
          event.preventDefault();

          if (!currentUser || listing.ownerId !== currentUser.uid) {
            window.alert('You can only edit your own listings.');
            return;
          }

          const formData = new FormData(editForm);
          const selectedPhotos = Array.from(editForm.querySelector('#edit-photos')?.files || []);
          const nextPhotos = selectedPhotos.length > 0 ? await readImageFilesAsDataUrls(selectedPhotos) : (Array.isArray(listing.photos) ? listing.photos : []);
          const nextPublicationStatus = formData.get('publicationStatus') || 'Published';
          const nextDailyRate = normalizeDailyRate(formData.get('dailyRate') || 0);
          const nextAvailability = String(formData.get('availability') || listing.availability || 'Available now');
          const nextSubcategories = String(formData.get('subcategories') || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);

          if (shouldBlockRateChange(listing, nextDailyRate)) {
            window.alert('This listing already has a reservation booked, so the daily rate cannot be changed until the reservation is cleared.');
            return;
          }

          const profile = await authService.getCurrentUserProfile();
          const ownerRole = String(profile?.role || listing.ownerRole || 'Lender').trim();

          const updatePayload = {
            toolName: formData.get('toolName') || listing.toolName || '',
            itemDescription: formData.get('itemDescription') || listing.itemDescription || '',
            itemCategory: formData.get('itemCategory') || listing.itemCategory || '',
            subcategories: nextSubcategories,
            availability: nextAvailability,
            ownerRole,
            dailyRate: nextDailyRate,
            rentalPrice: nextDailyRate,
            standardDailyRateUsd: nextDailyRate,
            currency: 'USD',
            publicationStatus: nextPublicationStatus,
            isPublished: nextPublicationStatus === 'Published',
            visibility: nextPublicationStatus === 'Published' ? 'public' : 'private',
            publiclyVisible: nextPublicationStatus === 'Published',
            photos: nextPhotos,
            updatedAt: new Date().toISOString()
          };

          await databaseService.updateRecord('listings', listing.id, updatePayload);

          const isReservationActive = nextAvailability.toLowerCase().includes('reserved') || nextAvailability.toLowerCase().includes('booked');
          if (isReservationActive) {
            const reservationPayload = createReservationSnapshot(listing, {
              listingId: listing.id,
              ownerId: currentUser.uid,
              toolName: formData.get('toolName') || listing.toolName || '',
              bookedRateUsd: nextDailyRate,
              status: 'Booked',
              reservationStatus: 'Booked',
              bookedAt: new Date().toISOString()
            });

            if (listing.reservationId || listing.bookingId) {
              await databaseService.updateRecord('reservations', listing.reservationId || listing.bookingId, {
                ...reservationPayload,
                updatedAt: new Date().toISOString()
              });
            } else {
              const reservationRecord = await databaseService.createRecord('reservations', reservationPayload);
              await databaseService.updateRecord('listings', listing.id, {
                reservationId: reservationRecord.id,
                bookingId: reservationRecord.id,
                reservationStatus: 'Booked'
              });
            }
          }

          await loadMyListings(currentUser);
        });

        card.querySelector('[data-action="cancel-edit"]')?.addEventListener('click', async () => {
          await loadMyListings(currentUser);
        });
      });
    });

    shell.querySelectorAll('[data-action="update-rental-status"]').forEach((button) => {
      button.addEventListener('click', async () => {
        const listingId = button.getAttribute('data-listing-id');
        const reservationId = button.getAttribute('data-reservation-id');
        const nextStatus = button.getAttribute('data-next-status');
        const currentStatus = button.getAttribute('data-current-status');
        const listing = ownerListings.find((entry) => entry.id === listingId);
        const reservationsForListing = reservationsByListingId.get(listingId) || [];
        const reservation = reservationsForListing.find((entry) => entry.id === reservationId);

        if (!listing || !nextStatus || !reservationId || !reservation) {
          return;
        }

        const allowedTransitions = getAllowedRentalStatusTransitions(currentStatus);
        const isAllowed = allowedTransitions.some((transition) => transition.nextStatus === nextStatus);

        if (!isAllowed) {
          window.alert('That transition is not allowed. Please use the next valid step only.');
          return;
        }

        try {
          const normalizedNextStatus = normalizeRentalStatus(nextStatus);
          const reservationDateKeys = getReservationDateRangeKeys(reservation);
          const otherActiveReservations = reservationsForListing.filter((entry) => entry.id !== reservation.id && isReservationActive(entry));
          const otherReservedDateKeys = otherActiveReservations.flatMap((entry) => getReservationDateRangeKeys(entry));
          const shouldReserveDates = !['cancelled', 'returned'].includes(normalizedNextStatus);
          const nextReservedDates = Array.from(new Set([
            ...otherReservedDateKeys,
            ...(shouldReserveDates ? reservationDateKeys : [])
          ].filter(Boolean)));
          const hasRemainingReservations = nextReservedDates.length > 0;
          const timestamp = new Date().toISOString();

          await databaseService.updateRecord('reservations', reservationId, {
            reservationStatus: nextStatus,
            status: nextStatus,
            updatedAt: timestamp
          });
          await databaseService.updateRecord('listings', listing.id, {
            availability: hasRemainingReservations ? 'Booked' : 'Available now',
            reservationStatus: nextStatus,
            status: nextStatus,
            reservedDates: nextReservedDates,
            bookingId: hasRemainingReservations ? (listing.bookingId || reservation.id || '') : '',
            reservationId: hasRemainingReservations ? (listing.reservationId || reservation.id || '') : '',
            updatedAt: timestamp
          });
          await loadMyListings(currentUser);
          await loadCatalogListings();
        } catch (error) {
          console.error('Unable to update rental status:', error);
          window.alert('We could not update the rental status right now.');
        }
      });
    });

    shell.querySelectorAll('[data-action="delete-listing"]').forEach((button) => {
      button.addEventListener('click', async () => {
        const listingId = button.getAttribute('data-listing-id');
        const listing = ownerListings.find((entry) => entry.id === listingId);

        if (!listing) {
          return;
        }

        if (!window.confirm(`Delete ${listing.toolName || 'this listing'} permanently?`)) {
          return;
        }

        await databaseService.deleteRecord('listings', listing.id);
        await loadMyListings(currentUser);
      });
    });
  } catch (error) {
    console.error('Unable to load your listings:', error);
    shell.innerHTML = '<p class="empty-state">We could not load your listings right now.</p>';
  }
}

function isPublishedListing(listing = {}) {
  const publicationStatus = String(listing.publicationStatus || listing.status || '').trim().toLowerCase();
  const visibility = String(listing.visibility || listing.publicVisibility || '').trim().toLowerCase();
  const ownerRole = String(listing.ownerRole || listing.role || '').trim().toLowerCase();
  const hasContent = Boolean(
    listing.toolName ||
    listing.itemName ||
    listing.itemDescription ||
    listing.photos?.length ||
    listing.title
  );
  const hasExplicitPublicFlag = visibility === 'public' || visibility === 'published' || visibility === 'live';
  const hasExplicitPublishedFlag = publicationStatus === 'published' || publicationStatus === 'live' || publicationStatus === 'approved' || publicationStatus === 'active';
  const isDraftStatus = publicationStatus === 'draft' || publicationStatus === 'private';

  if (visibility === 'private' || visibility === 'hidden') {
    return false;
  }

  if (ownerRole === 'renter') {
    return false;
  }

  if (ownerRole === 'lender' || ownerRole === 'both' || !ownerRole) {
    return hasExplicitPublicFlag || hasExplicitPublishedFlag || (hasContent && !isDraftStatus && !publicationStatus);
  }

  if (hasExplicitPublicFlag || hasExplicitPublishedFlag || listing.isPublished === true || listing.publiclyVisible === true) {
    return true;
  }

  return false;
}

function getCatalogFilterState() {
  const searchInput = document.getElementById('tool-search');
  const locationInput = document.getElementById('tool-location');
  const optionalZipInput = document.getElementById('zip-code-input');
  const categorySelect = document.getElementById('main-category-select');
  const selectedSubcategories = Array.from(document.querySelectorAll('#category-checklist .subcategory-group.visible input[type="checkbox"]:checked')).map((checkbox) => checkbox.value.toLowerCase());
  const selectedConditions = Array.from(document.querySelectorAll('#optional-filters input[name="condition"]:checked')).map((checkbox) => checkbox.value);
  const locationValue = optionalZipInput?.value?.trim() || locationInput?.value?.trim() || '';

  return {
    searchText: searchInput?.value?.trim().toLowerCase() || '',
    location: locationValue,
    category: categorySelect?.value || '',
    selectedSubcategories,
    selectedConditions,
    priceMin: Number(document.getElementById('price-min-input')?.value || 0),
    priceMax: Number(document.getElementById('price-max-input')?.value || 500),
    availabilityNowChecked: Boolean(document.getElementById('available-now')?.checked),
    rentalStart: document.getElementById('rental-start')?.value || '',
    rentalEnd: document.getElementById('rental-end')?.value || ''
  };
}

function matchesCatalogFilters(listing = {}, filters = {}) {
  const searchText = filters.searchText || '';
  const locationText = filters.location || '';
  const categoryText = filters.category || '';
  const selectedSubcategories = filters.selectedSubcategories || [];
  const selectedConditions = filters.selectedConditions || [];
  const priceMin = Number(filters.priceMin || 0);
  const priceMax = Number(filters.priceMax || 500);
  const availabilityNowChecked = Boolean(filters.availabilityNowChecked);
  const rentalStart = filters.rentalStart || '';
  const rentalEnd = filters.rentalEnd || '';

  const searchableText = [
    listing.toolName,
    listing.itemDescription,
    listing.itemCategory,
    listing.category,
    Array.isArray(listing.subcategories) ? listing.subcategories.join(' ') : ''
  ].filter(Boolean).join(' ').toLowerCase();

  if (searchText && !searchableText.includes(searchText)) {
    return false;
  }

  if (categoryText && (listing.itemCategory || listing.category || '') !== categoryText) {
    return false;
  }

  // Normalize listing subcategories whether stored as array or comma-separated string
  const listingSubList = Array.isArray(listing.subcategories)
    ? listing.subcategories.map((value) => String(value || '').toLowerCase())
    : (typeof listing.subcategories === 'string'
      ? listing.subcategories.split(',').map((s) => s.trim().toLowerCase())
      : []);

  if (selectedSubcategories.length > 0) {
    const matches = selectedSubcategories.some((sel) => listingSubList.some((ls) => ls.includes(sel) || sel.includes(ls)));
    if (!matches) {
      // debug: show which listing failed subcategory match (helps trace mismatches)
      // debug logging removed
      return false;
    }
  }

  if (selectedConditions.length > 0 && !selectedConditions.includes(listing.condition || '')) {
    return false;
  }

  const dailyRate = Number(listing.dailyRate ?? listing.rentalPrice ?? 0);
  if (dailyRate < priceMin || dailyRate > priceMax) {
    return false;
  }

  if (locationText) {
    const listingLocation = String(listing.itemLocation || '').trim();
    if (!listingLocation || !listingLocation.includes(locationText)) {
      return false;
    }
  }

  if (availabilityNowChecked && String(listing.availability || 'Available now').toLowerCase() !== 'available now') {
    return false;
  }

  return true;
}

function buildCalendarDays(listing = {}, reservationRecords = [], monthDate = new Date()) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const todayKey = getDateKey(new Date());
  const reservedSet = new Set(getReservedDateKeys(listing, reservationRecords));

  const monthDays = [];
  const leadingBlanks = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  for (let i = 0; i < leadingBlanks; i += 1) {
    monthDays.push({ day: '', reserved: false, dateKey: '' });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isReserved = reservedSet.has(dateKey);
    const isPast = Boolean(todayKey && dateKey < todayKey);
    monthDays.push({ day, reserved: isReserved, dateKey, past: isPast });
  }

  return monthDays;
}

function getCalendarCaption(monthDate = new Date()) {
  return monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function getDateKey(value) {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (Array.isArray(value)) {
    return value.map(getDateKey).find(Boolean) || '';
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return '';
    }

    const normalizedValue = trimmedValue.includes('T') ? trimmedValue.slice(0, 10) : trimmedValue;
    return normalizedValue.length >= 10 ? normalizedValue.slice(0, 10) : '';
  }

  return '';
}

function getReservationStatus(reservation = {}) {
  return String(reservation.status || reservation.reservationStatus || 'Pending').trim();
}

function isReservationActive(reservation = {}) {
  const status = getReservationStatus(reservation).toLowerCase();
  return !['cancelled', 'canceled', 'rejected', 'returned', 'completed'].includes(status);
}

function getReservedDateKeys(listing = {}, reservationRecords = []) {
  const reservedDates = new Set();

  const addValue = (value) => {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(addValue);
      return;
    }

    const dateKey = getDateKey(value);
    if (dateKey) {
      reservedDates.add(dateKey);
    }
  };

  addValue(listing.reservedDates || listing.reservedDate || listing.bookedDates);

  reservationRecords.forEach((record) => {
    if (!isReservationActive(record)) {
      return;
    }

    const reservationDateRange = getReservationDateRangeKeys(record);
    if (reservationDateRange.length > 0) {
      addValue(reservationDateRange);
      return;
    }

    addValue(record.bookedDate || record.date || record.startDate || record.start || record.endDate || record.end || record.reservedDates || record.bookedDates || record.dates);
  });

  return Array.from(reservedDates);
}

function getReservationDateRangeKeys(reservation = {}) {
  const selectedDateRangeKeys = Array.isArray(reservation.selectedDateRange)
    ? reservation.selectedDateRange.map((value) => getDateKey(value)).filter(Boolean)
    : [];

  if (selectedDateRangeKeys.length > 0) {
    return Array.from(new Set(selectedDateRangeKeys));
  }

  const startDateKey = getDateKey(
    reservation.startDate ||
    reservation.start ||
    reservation.bookedDate ||
    reservation.date ||
    reservation.startAt ||
    reservation.startDateTime ||
    reservation.reservationStart ||
    reservation.pickupAt ||
    reservation.bookedAt || ''
  );
  const endDateKey = getDateKey(
    reservation.endDate ||
    reservation.end ||
    reservation.endAt ||
    reservation.endDateTime ||
    reservation.reservationEnd ||
    reservation.pickupEnd ||
    startDateKey
  );

  if (!startDateKey) {
    return [];
  }

  if (!endDateKey || endDateKey < startDateKey) {
    return [startDateKey];
  }

  const keys = [];
  const cursor = new Date(`${startDateKey}T00:00:00`);
  const end = new Date(`${endDateKey}T00:00:00`);

  while (cursor <= end) {
    keys.push(getDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys.filter(Boolean);
}

function formatBookingDateLabel(dateKey = '') {
  if (!dateKey) {
    return '';
  }

  const parsedDate = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateKey;
  }

  return parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDateRangeKeys(startDateKey = '', endDateKey = '') {
  if (!startDateKey) {
    return [];
  }

  const normalizedEndDateKey = endDateKey || startDateKey;
  const start = new Date(`${startDateKey}T00:00:00`);
  const end = new Date(`${normalizedEndDateKey}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [startDateKey];
  }

  const rangeKeys = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    rangeKeys.push(getDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return rangeKeys;
}

async function loadCatalogListings() {
  const results = document.querySelector('.catalog-results');
  const feedback = document.getElementById('catalog-feedback');

  if (!results || !feedback) {
    return;
  }

  feedback.textContent = 'Loading published listings…';
  feedback.hidden = false;
  results.innerHTML = '<div class="catalog-results__empty">Loading published tools…</div>';

  try {
    const allListings = await databaseService.readRecords('listings');
    const allReservations = await databaseService.readRecords('reservations');
    const publishedListings = (allListings || []).filter(isPublishedListing);
    const filters = getCatalogFilterState();
    const hasDateFilter = Boolean(filters.rentalStart || filters.rentalEnd);
    const selectedStartDateKey = filters.rentalStart || filters.rentalEnd || '';
    const selectedEndDateKey = filters.rentalEnd || filters.rentalStart || '';
    const selectedFilterDateKeys = getDateRangeKeys(selectedStartDateKey, selectedEndDateKey);

    // Build a lookup of reservations by listing id (may be multiple reservations per listing)
    const reservationLookup = new Map();
    (allReservations || []).forEach((reservation) => {
      const lid = reservation.listingId || reservation.listing?.id || '';
      if (!lid) return;
      const arr = reservationLookup.get(lid) || [];
      arr.push(reservation);
      reservationLookup.set(lid, arr);
    });

    const visibleListings = publishedListings.filter((listing) => {
      if (!matchesCatalogFilters(listing, filters)) {
        return false;
      }

      if (!hasDateFilter) {
        return true;
      }

      const reservationsForListing = reservationLookup.get(listing.id) || [];
      const listingReservedDateKeys = getReservedDateKeys(listing, []);
      const activeReservationDateKeys = reservationsForListing
        .filter((reservation) => isReservationActive(reservation))
        .flatMap((reservation) => getReservationDateRangeKeys(reservation));
      const reservedDateKeys = new Set([...listingReservedDateKeys, ...activeReservationDateKeys]);

      return !selectedFilterDateKeys.some((dateKey) => reservedDateKeys.has(dateKey));
    });

    if (!visibleListings.length) {
      results.innerHTML = '<div class="catalog-results__empty">No tools found</div>';
      feedback.textContent = 'No tools found';
      return;
    }

    // Cache current catalog data so calendar nav can re-render per-card without reloading from server
    window.__catalogState = {
      visibleListings,
      allListings: allListings || [],
      allReservations: allReservations || []
    };

    results.innerHTML = visibleListings.map((listing) => {
      const photoUrl = Array.isArray(listing.photos) && listing.photos.length > 0 ? listing.photos[0] : '';
      const toolName = listing.toolName || 'Untitled listing';
      const description = listing.itemDescription || 'No description provided yet.';
      const categoryLabel = listing.itemCategory || listing.category || 'Uncategorized';
      const dailyRate = Number(getEffectiveDailyRate(listing)).toFixed(2);
      const reservationsForListing = reservationLookup.get(listing.id) || [];
      const availabilityLabel = 'Available now';
      const availabilityClassName = 'catalog-result-card__availability catalog-result-card__availability--available';
      const monthDate = new Date();
      const calendarDays = buildCalendarDays(listing, reservationsForListing, monthDate);
      const reservedDays = calendarDays.filter((d) => d.day && d.reserved).length;
      const availableDays = calendarDays.filter((d) => d.day && !d.reserved).length;
      const calendarCaption = getCalendarCaption(monthDate);

      return `
        <article class="catalog-result-card" data-listing-id="${escapeHtml(listing.id)}" tabindex="0" role="button" aria-expanded="false">
          <div class="catalog-result-card__media">
            ${photoUrl ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(toolName)}" />` : '<div class="catalog-result-card__placeholder">No photo</div>'}
          </div>
          <div class="catalog-result-card__content">
            <div class="catalog-result-card__header">
              <h4>${escapeHtml(toolName)}</h4>
              <span class="catalog-result-card__price">${escapeHtml(formatUsdRate(dailyRate))}/day</span>
            </div>
            <p class="catalog-result-card__description">${escapeHtml(description)}</p>
            <div class="catalog-result-card__meta">
              <span>${escapeHtml(categoryLabel)}</span>
              ${hasDateFilter ? `<span class="${availabilityClassName}">${escapeHtml(availabilityLabel)}</span>` : ''}
            </div>
            
            <div class="catalog-calendar" aria-label="Availability calendar for ${escapeHtml(toolName)}" data-month-offset="0" hidden>
              <div class="catalog-calendar__header">
                <button type="button" class="catalog-calendar__nav catalog-calendar__prev" data-listing-id="${escapeHtml(listing.id)}" aria-label="Previous month">‹</button>
                <strong class="catalog-calendar__caption">${escapeHtml(calendarCaption)}</strong>
                <button type="button" class="catalog-calendar__nav catalog-calendar__next" data-listing-id="${escapeHtml(listing.id)}" aria-label="Next month">›</button>
                <span class="catalog-calendar__counts">${reservedDays} reserved • ${availableDays} available</span>
              </div>
              <div class="catalog-calendar__weekdays">
                <span>Mo</span>
                <span>Tu</span>
                <span>We</span>
                <span>Th</span>
                <span>Fr</span>
                <span>Sa</span>
                <span>Su</span>
              </div>
              <div class="catalog-calendar__grid">
                ${calendarDays.map((day) => {
                  if (!day.day) {
                    return '<div class="catalog-calendar__day is-empty" aria-hidden="true"></div>';
                  }

                  const classes = ['catalog-calendar__day', day.reserved ? 'is-reserved' : 'is-available'];
                  if (day.past) {
                    classes.push('is-past');
                  }
                  const disabledAttrs = day.past ? ' disabled aria-disabled="true"' : '';
                  return `<button type="button" class="${classes.join(' ')}" data-date-key="${escapeHtml(day.dateKey)}" data-listing-id="${escapeHtml(listing.id)}"${disabledAttrs}>${day.day}</button>`;
                }).join('')}
              </div>
              <div class="catalog-calendar__legend">
                <span><i class="catalog-calendar__dot catalog-calendar__dot--available"></i> Available</span>
                <span><i class="catalog-calendar__dot catalog-calendar__dot--reserved"></i> Reserved</span>
              </div>
              <div class="catalog-calendar__selection-hint">Select a start date, then an end date, or double-click a single day to book one day.</div>
              <div class="catalog-calendar__booking">
                <div class="catalog-calendar__booking-status" data-role="booking-status">Select a date to check availability.</div>
                <button type="button" class="catalog-calendar__booking-action" data-listing-id="${escapeHtml(listing.id)}" hidden>Book</button>
              </div>
              <div class="catalog-payment-panel" hidden>
                <div class="catalog-payment-panel__header">
                  <strong>PIVOT Payment System</strong>
                  <p>No real charges or data storage. Enter your name to complete this demo checkout. Other fields are optional.</p>
                </div>
                <div class="catalog-payment-panel__fields">
                  <label class="catalog-payment-field">
                    <span>Name on card</span>
                    <input type="text" autocomplete="cc-name" placeholder="Abhijeet Hoshing" />
                  </label>
                  <label class="catalog-payment-field">
                    <span>Card number</span>
                    <input type="text" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" />
                  </label>
                  <div class="catalog-payment-row">
                    <label class="catalog-payment-field">
                      <span>Expiration</span>
                      <div class="catalog-payment-row__inline">
                        <input type="text" inputmode="numeric" maxlength="2" placeholder="12" />
                        <span>/</span>
                        <input type="text" inputmode="numeric" maxlength="2" placeholder="28" />
                      </div>
                    </label>
                    <label class="catalog-payment-field catalog-payment-field--cvv">
                      <span>CVV</span>
                      <input type="text" inputmode="numeric" maxlength="4" placeholder="123" />
                    </label>
                  </div>
                </div>
                <button type="button" class="catalog-payment-action" data-listing-id="${escapeHtml(listing.id)}">Pay and complete booking</button>
                <div class="catalog-payment-confirmation" role="status" hidden></div>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    const syncBookingUiForCalendar = (calendar, listing, reservationsForListing, selectedDateKey = '') => {
      if (!calendar) {
        return;
      }

      const statusEl = calendar.querySelector('.catalog-calendar__booking-status');
      const buttonEl = calendar.querySelector('.catalog-calendar__booking-action');
      const paymentPanel = calendar.querySelector('.catalog-payment-panel');
      if (!statusEl || !buttonEl) {
        return;
      }

      const selectionStartDate = calendar.dataset.bookingStartDate || '';
      const selectionEndDate = calendar.dataset.bookingEndDate || '';
      const selectionReady = calendar.dataset.selectionReady === 'true';
      const selectionRangeKeys = getDateRangeKeys(selectionStartDate, selectionEndDate);
      const normalizedSelectedDate = selectedDateKey || selectionEndDate || selectionStartDate || '';
      const todayKey = getDateKey(new Date());
      const hasPastDateInSelection = selectionRangeKeys.some((dateKey) => dateKey < todayKey);
      const shouldKeepPaymentPanelOpen = calendar.dataset.paymentConfirmationVisible === 'true';
      if (!shouldKeepPaymentPanelOpen) {
        const paymentInputs = calendar.querySelectorAll('.catalog-payment-panel input');
        paymentInputs.forEach((input) => {
          input.value = '';
        });
      }
      if (paymentPanel && !shouldKeepPaymentPanelOpen) {
        paymentPanel.hidden = true;
      }
      if (!selectionStartDate && !selectionEndDate) {
        statusEl.textContent = 'Select a date to check availability.';
        statusEl.classList.remove('is-booked');
        buttonEl.hidden = true;
        buttonEl.disabled = true;
        buttonEl.dataset.startDate = '';
        buttonEl.dataset.endDate = '';
        buttonEl.dataset.selectedDate = '';
        calendar.dataset.selectedDate = '';
        return;
      }

      if (hasPastDateInSelection) {
        statusEl.textContent = 'Past dates cannot be booked. Please choose today or a future date.';
        statusEl.classList.remove('is-booked');
        buttonEl.hidden = true;
        buttonEl.disabled = true;
        buttonEl.dataset.startDate = '';
        buttonEl.dataset.endDate = '';
        buttonEl.dataset.selectedDate = '';
        return;
      }

      const selectedDateKeys = selectionRangeKeys.length > 1 ? selectionRangeKeys : [normalizedSelectedDate];
      const reservedDateKeys = new Set(getReservedDateKeys(listing, reservationsForListing));
      const isBooked = selectedDateKeys.some((dateKey) => reservedDateKeys.has(dateKey));

      if (selectionReady && selectionRangeKeys.length) {
        const rangeLabel = selectionRangeKeys.length > 1
          ? `${formatBookingDateLabel(selectionStartDate)} – ${formatBookingDateLabel(selectionEndDate)}`
          : formatBookingDateLabel(normalizedSelectedDate);
        statusEl.textContent = isBooked
          ? `Booked for ${rangeLabel}.`
          : `Selected rental dates: ${rangeLabel}.`;
      } else {
        statusEl.textContent = 'Choose the ending date or double-click a day to book one day.';
      }
      statusEl.classList.toggle('is-booked', isBooked);

      buttonEl.hidden = !selectionReady || isBooked;
      buttonEl.disabled = !selectionReady || isBooked;
      buttonEl.dataset.startDate = selectionStartDate;
      buttonEl.dataset.endDate = selectionEndDate || selectionStartDate;
      buttonEl.dataset.selectedDate = normalizedSelectedDate;
      calendar.dataset.selectedDate = normalizedSelectedDate;
    };

    const showPaymentPanelForBooking = (button) => {
      const listingId = button?.dataset.listingId;
      const calendar = button?.closest('.catalog-calendar');
      const selectedStartDateKey = button?.dataset.startDate || calendar?.dataset.bookingStartDate || button?.dataset.selectedDate || calendar?.dataset.selectedDate || '';
      const selectedEndDateKey = button?.dataset.endDate || calendar?.dataset.bookingEndDate || selectedStartDateKey;
      const selectedDateRange = getDateRangeKeys(selectedStartDateKey, selectedEndDateKey);
      const todayKey = getDateKey(new Date());

      if (!listingId || !selectedStartDateKey) {
        return;
      }

      if (selectedDateRange.some((dateKey) => dateKey < todayKey)) {
        const statusEl = calendar?.querySelector('.catalog-calendar__booking-status');
        if (statusEl) {
          statusEl.textContent = 'Past dates cannot be booked. Please choose today or a future date.';
        }
        return;
      }

      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        window.alert('Please sign in to book this tool.');
        window.location.hash = 'login-form';
        return;
      }

      const listing = (window.__catalogState.visibleListings || []).find((entry) => entry.id === listingId) || (window.__catalogState.allListings || []).find((entry) => entry.id === listingId);
      if (!listing) {
        return;
      }

      const statusEl = calendar?.querySelector('.catalog-calendar__booking-status');
      const paymentPanel = calendar?.querySelector('.catalog-payment-panel');
      const bookingButton = calendar?.querySelector('.catalog-calendar__booking-action');

      if (statusEl) {
        statusEl.textContent = 'Enter your name to complete this booking. Other fields are optional.';
      }

      if (bookingButton) {
        bookingButton.disabled = false;
        bookingButton.textContent = 'Book';
      }

      if (paymentPanel) {
        calendar.dataset.paymentConfirmationVisible = 'false';
        paymentPanel.hidden = false;
        paymentPanel.classList.add('is-open');
      }
    };

    const completeBookingWithPayment = async (button) => {
      const listingId = button?.dataset.listingId;
      const calendar = button?.closest('.catalog-calendar');
      const selectedStartDateKey = button?.dataset.startDate || calendar?.dataset.bookingStartDate || button?.dataset.selectedDate || calendar?.dataset.selectedDate || '';
      const selectedEndDateKey = button?.dataset.endDate || calendar?.dataset.bookingEndDate || selectedStartDateKey;
      const bookingDateRange = getDateRangeKeys(selectedStartDateKey, selectedEndDateKey);
      const todayKey = getDateKey(new Date());

      if (!listingId || !selectedStartDateKey) {
        return;
      }

      if (bookingDateRange.some((dateKey) => dateKey < todayKey)) {
        const statusEl = calendar?.querySelector('.catalog-calendar__booking-status');
        if (statusEl) {
          statusEl.textContent = 'Past dates cannot be booked. Please choose today or a future date.';
        }
        return;
      }

      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        window.alert('Please sign in to book this tool.');
        window.location.hash = 'login-form';
        return;
      }

      const listing = (window.__catalogState.visibleListings || []).find((entry) => entry.id === listingId) || (window.__catalogState.allListings || []).find((entry) => entry.id === listingId);
      if (!listing) {
        return;
      }

      const statusEl = calendar?.querySelector('.catalog-calendar__booking-status');
      const paymentPanel = calendar?.querySelector('.catalog-payment-panel');
      const paymentButton = calendar?.querySelector('.catalog-payment-action');
      const confirmationBanner = document.getElementById('booking-confirmation-banner');
      const payerNameInput = calendar?.querySelector('.catalog-payment-field input[autocomplete="cc-name"]');
      const payerName = String(payerNameInput?.value || '').trim();

      if (!payerName) {
        if (statusEl) {
          statusEl.textContent = 'Please enter your name to complete booking.';
        }
        return;
      }

      if (statusEl) {
        statusEl.textContent = 'Processing your demo payment…';
      }

      if (paymentButton) {
        paymentButton.disabled = true;
        paymentButton.textContent = 'Processing…';
      }

      try {
        const allReservations = window.__catalogState.allReservations || [];
        const existingReservation = allReservations.find((reservation) => {
          const reservationStartDate = reservation.startDate || reservation.bookedDate || reservation.date || reservation.start || reservation.startAt || reservation.startDateTime || '';
          const reservationEndDate = reservation.endDate || reservation.end || reservation.startDate || reservation.bookedDate || reservation.date || reservation.start || reservation.startAt || reservation.startDateTime || '';
          return (reservation.listingId || reservation.listing || reservation.listingRef || reservation.listing_id) === listingId && reservationStartDate === selectedStartDateKey && reservationEndDate === selectedEndDateKey;
        });

        const nextReservedDates = Array.from(new Set([
          ...(Array.isArray(listing.reservedDates) ? listing.reservedDates : [listing.reservedDates || listing.reservedDate || listing.bookedDates].filter(Boolean)),
          ...bookingDateRange
        ]));

        const reservationPayload = createReservationSnapshot(listing, {
          listingId,
          ownerId: listing.ownerId || currentUser.uid,
          ownerEmail: listing.ownerEmail || '',
          renterId: currentUser.uid,
          renterName: payerName,
          renterEmail: currentUser.email || '',
          toolName: listing.toolName || '',
          bookedDate: selectedStartDateKey,
          date: selectedStartDateKey,
          startDate: selectedStartDateKey,
          endDate: selectedEndDateKey,
          selectedDateRange: bookingDateRange,
          bookedRateUsd: getEffectiveDailyRate(listing),
          status: 'Confirmed',
          reservationStatus: 'confirmed',
          bookedAt: new Date().toISOString()
        });

        let reservationRecord;
        if (existingReservation?.id) {
          await databaseService.updateRecord('reservations', existingReservation.id, {
            ...reservationPayload,
            updatedAt: new Date().toISOString()
          });
          reservationRecord = { id: existingReservation.id, ...reservationPayload };
        } else {
          reservationRecord = await databaseService.createRecord('reservations', reservationPayload);
        }

        await databaseService.updateRecord('listings', listingId, {
          availability: 'Booked',
          reservationStatus: 'confirmed',
          bookingId: reservationRecord.id,
          reservationId: reservationRecord.id,
          reservedDates: nextReservedDates,
          updatedAt: new Date().toISOString()
        });

        const updatedListing = {
          ...listing,
          availability: 'Booked',
          reservationStatus: 'confirmed',
          bookingId: reservationRecord.id,
          reservationId: reservationRecord.id,
          reservedDates: nextReservedDates
        };

        const visibleListings = (window.__catalogState.visibleListings || []).slice();
        const allListings = (window.__catalogState.allListings || []).slice();
        const listingIndex = visibleListings.findIndex((entry) => entry.id === listingId);
        const allListingIndex = allListings.findIndex((entry) => entry.id === listingId);
        if (listingIndex >= 0) {
          visibleListings[listingIndex] = updatedListing;
        }
        if (allListingIndex >= 0) {
          allListings[allListingIndex] = updatedListing;
        }

        const nextReservations = [
          ...(window.__catalogState.allReservations || []).filter((reservation) => {
            const reservationStartDate = reservation.startDate || reservation.bookedDate || reservation.date || reservation.start || reservation.startAt || reservation.startDateTime || '';
            const reservationEndDate = reservation.endDate || reservation.end || reservation.startDate || reservation.bookedDate || reservation.date || reservation.start || reservation.startAt || reservation.startDateTime || '';
            return !((reservation.listingId || reservation.listing || reservation.listingRef || reservation.listing_id) === listingId && reservationStartDate === selectedStartDateKey && reservationEndDate === selectedEndDateKey && reservation.id !== reservationRecord.id);
          }),
          { id: reservationRecord.id, ...reservationPayload }
        ];

        window.__catalogState = {
          ...window.__catalogState,
          visibleListings,
          allListings,
          allReservations: nextReservations
        };

        if (calendar) {
          if (confirmationBanner) {
            confirmationBanner.textContent = 'Booking confirmed! For additional details including contact information, visit your rental status dashboard';
            confirmationBanner.hidden = false;
          }

          window.setTimeout(() => {
            if (confirmationBanner) {
              confirmationBanner.textContent = '';
              confirmationBanner.hidden = true;
            }

            const paymentInputs = calendar.querySelectorAll('.catalog-payment-panel input');
            paymentInputs.forEach((input) => {
              input.value = '';
            });

            if (paymentPanel) {
              paymentPanel.hidden = true;
            }

            const offset = Number(calendar.dataset.monthOffset || '0');
            renderCalendarForListing(listingId, offset);
          }, 5000);
        }

        if (statusEl) {
          statusEl.textContent = 'Booking confirmed. Your demo payment completed successfully.';
        }
      } catch (error) {
        console.error('Unable to complete booking:', error);
        if (statusEl) {
          statusEl.textContent = 'Unable to book this date right now. Please try again.';
        }
        if (paymentButton) {
          paymentButton.disabled = false;
          paymentButton.textContent = 'Pay and complete booking';
        }
      }
    };

    // Make each listing card expandable: click or Enter/Space toggles details (calendar)
    results.querySelectorAll('.catalog-result-card').forEach((card) => {
      const listingId = card.dataset.listingId;
      card.addEventListener('click', (e) => {
        const clickedInsideCalendar = e.target.closest('.catalog-calendar');
        if (clickedInsideCalendar) {
          return;
        }

        const isExpanded = card.getAttribute('aria-expanded') === 'true';
        card.setAttribute('aria-expanded', String(!isExpanded));
        const calendar = card.querySelector('.catalog-calendar');
        if (calendar) {
          const willShow = !isExpanded;
          calendar.toggleAttribute('hidden', !willShow);
          if (willShow) {
            const offset = Number(calendar.dataset.monthOffset || '0');
            renderCalendarForListing(listingId, offset);
          }
        }
      });

      card.addEventListener('keydown', (ev) => {
        const interactiveTarget = ev.target instanceof Element
          ? ev.target.closest('input, button, textarea, select, a, label')
          : null;

        if (interactiveTarget && interactiveTarget !== card) {
          return;
        }

        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          card.click();
        }
      });
    });

    // Helper to render calendar for a listing and month offset
    const renderCalendarForListing = (listingId, offset) => {
      if (!window.__catalogState) return;
      const listing = (window.__catalogState.visibleListings || []).find((l) => l.id === listingId) || (window.__catalogState.allListings || []).find((l) => l.id === listingId);
      if (!listing) return;
      const allRes = window.__catalogState.allReservations || [];
      const reservationsForListing = allRes.filter((r) => (r.listingId || r.listing || r.listingRef || r.listing_id) === listingId);

      const now = new Date();
      const target = new Date(now.getFullYear(), now.getMonth() + Number(offset || 0), 1);
      const monthDays = buildCalendarDays(listing, reservationsForListing, target);

      const toggleButton = results.querySelector(`.catalog-calendar-toggle[data-listing-id="${listingId}"]`) || results.querySelector(`.catalog-calendar__prev[data-listing-id="${listingId}"]`);
      const card = toggleButton ? toggleButton.closest('.catalog-result-card') : null;
      const calendar = card ? card.querySelector('.catalog-calendar') : null;
      if (!calendar) return;

      calendar.dataset.monthOffset = String(offset);
      const captionEl = calendar.querySelector('.catalog-calendar__caption');
      const countsEl = calendar.querySelector('.catalog-calendar__counts');
      const gridEl = calendar.querySelector('.catalog-calendar__grid');
      const selectedDateKey = calendar.dataset.selectedDate || '';
      const monthPrefix = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
      const activeSelectedDate = selectedDateKey.startsWith(monthPrefix) ? selectedDateKey : '';
      if (activeSelectedDate !== selectedDateKey) {
        calendar.dataset.selectedDate = activeSelectedDate;
      }
      const selectionStartDate = calendar.dataset.bookingStartDate || '';
      const selectionEndDate = calendar.dataset.bookingEndDate || '';
      const selectionReady = calendar.dataset.selectionReady === 'true';
      const selectionRangeKeys = getDateRangeKeys(selectionStartDate, selectionEndDate);

      if (captionEl) captionEl.textContent = getCalendarCaption(target);
      if (countsEl) countsEl.textContent = `${monthDays.filter((d) => d.day && d.reserved).length} reserved • ${monthDays.filter((d) => d.day && !d.reserved).length} available`;
      if (gridEl) {
        gridEl.innerHTML = monthDays.map((day) => {
          if (!day.day) {
            return '<div class="catalog-calendar__day is-empty" aria-hidden="true"></div>';
          }

          const classes = ['catalog-calendar__day', day.reserved ? 'is-reserved' : 'is-available'];
          if (day.past) {
            classes.push('is-past');
          }
          if (selectionStartDate && day.dateKey === selectionStartDate) {
            classes.push('is-range-start');
          }
          if (selectionEndDate && day.dateKey === selectionEndDate) {
            classes.push('is-range-end');
          }
          if (selectionRangeKeys.includes(day.dateKey)) {
            classes.push('is-in-range');
          }
          if (calendar.dataset.selectedDate && day.dateKey === calendar.dataset.selectedDate && !selectionReady) {
            classes.push('is-selected');
          }

          const disabledAttrs = day.past ? ' disabled aria-disabled="true"' : '';
          return `<button type="button" class="${classes.join(' ')}" data-date-key="${escapeHtml(day.dateKey)}" data-listing-id="${escapeHtml(listing.id)}"${disabledAttrs}>${day.day}</button>`;
        }).join('');
      }
      syncBookingUiForCalendar(calendar, listing, reservationsForListing, calendar.dataset.selectedDate || '');

      // update prev/next state: hide the prev button on the current month (offset <= 0)
      const prevBtn = calendar.querySelector('.catalog-calendar__prev');
      const nextBtn = calendar.querySelector('.catalog-calendar__next');
      const numOffset = Number(offset || 0);
      if (prevBtn) {
        const hidePrev = numOffset <= 0;
        prevBtn.classList.toggle('is-hidden', hidePrev);
        if (hidePrev) {
          prevBtn.removeAttribute('aria-disabled');
          prevBtn.classList.remove('is-disabled');
        } else {
          prevBtn.disabled = false;
          prevBtn.removeAttribute('aria-hidden');
        }
      }
      if (nextBtn) {
        // next button always enabled for future navigation; ensure it's visible
        nextBtn.style.display = '';
        nextBtn.disabled = false;
        nextBtn.removeAttribute('aria-disabled');
        nextBtn.classList.remove('is-disabled');
      }
    };

    results.querySelectorAll('.catalog-calendar').forEach((calendar) => {
      calendar.addEventListener('click', (event) => {
        const paymentButton = event.target.closest('.catalog-payment-action');
        if (paymentButton) {
          event.stopPropagation();
          completeBookingWithPayment(paymentButton);
          return;
        }

        const bookedButton = event.target.closest('.catalog-calendar__booking-action');
        if (bookedButton) {
          event.stopPropagation();
          showPaymentPanelForBooking(bookedButton);
          return;
        }

        const dayButton = event.target.closest('.catalog-calendar__day');
        if (!dayButton || dayButton.classList.contains('is-empty') || dayButton.classList.contains('is-past') || !dayButton.dataset.dateKey) {
          return;
        }

        event.stopPropagation();
        const clickedDateKey = dayButton.dataset.dateKey;
        const currentStartDate = calendar.dataset.bookingStartDate || '';
        const currentEndDate = calendar.dataset.bookingEndDate || '';

        if (event.detail === 2) {
          calendar.dataset.bookingStartDate = clickedDateKey;
          calendar.dataset.bookingEndDate = clickedDateKey;
          calendar.dataset.selectionReady = 'true';
        } else if (!currentStartDate || currentEndDate) {
          calendar.dataset.bookingStartDate = clickedDateKey;
          calendar.dataset.bookingEndDate = '';
          calendar.dataset.selectionReady = 'false';
        } else {
          if (clickedDateKey < currentStartDate) {
            calendar.dataset.bookingEndDate = currentStartDate;
            calendar.dataset.bookingStartDate = clickedDateKey;
          } else {
            calendar.dataset.bookingEndDate = clickedDateKey;
          }
          calendar.dataset.selectionReady = 'true';
        }

        calendar.dataset.selectedDate = clickedDateKey;
        renderCalendarForListing(dayButton.dataset.listingId, Number(calendar.dataset.monthOffset || '0'));
      });
    });

    // Wire prev/next month buttons
    results.querySelectorAll('.catalog-calendar__prev').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.listingId;
        const card = btn.closest('.catalog-result-card');
        const calendar = card ? card.querySelector('.catalog-calendar') : null;
        const current = calendar ? Number(calendar.dataset.monthOffset || '0') : 0;
        const next = Math.max(current - 1, 0);
        // clamp to 0 to prevent past navigation
        renderCalendarForListing(id, next);
      });
    });

    results.querySelectorAll('.catalog-calendar__next').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.listingId;
        const card = btn.closest('.catalog-result-card');
        const calendar = card ? card.querySelector('.catalog-calendar') : null;
        const current = calendar ? Number(calendar.dataset.monthOffset || '0') : 0;
        const next = current + 1;
        renderCalendarForListing(id, next);
      });
    });

    feedback.textContent = `Showing ${visibleListings.length} published listing${visibleListings.length === 1 ? '' : 's'}.`;
  } catch (error) {
    console.error('Unable to load published listings:', error);
    results.innerHTML = '<div class="catalog-results__empty">We could not load listings right now.</div>';
    feedback.textContent = 'Unable to load listings from Firestore.';
  }
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
  const priceMinInput = document.getElementById('price-min-input');
  const priceMaxInput = document.getElementById('price-max-input');
  const priceRangeDisplay = document.getElementById('price-range-display');
  const feedback = document.getElementById('catalog-feedback');
  const searchInput = document.getElementById('tool-search');
  const searchButton = document.getElementById('search-tools');
  const applyFiltersButton = document.getElementById('apply-filters');
  const clearFiltersButton = document.getElementById('clear-filters');

  const clampValues = () => {
    const minValue = Number(priceMinInput?.value || rateMinInput?.value || 0);
    const maxValue = Number(priceMaxInput?.value || rateMaxInput?.value || 500);
    const lower = Math.min(Math.max(minValue, 0), 500);
    const upper = Math.min(Math.max(maxValue, 0), 500);
    const safeLower = Math.min(lower, upper);
    const safeUpper = Math.max(upper, lower);

    if (priceMinInput) {
      priceMinInput.value = safeLower;
    }
    if (priceMaxInput) {
      priceMaxInput.value = safeUpper;
    }
    if (rateMinInput) {
      rateMinInput.value = safeLower;
    }
    if (rateMaxInput) {
      rateMaxInput.value = safeUpper;
    }

    return { min: safeLower, max: safeUpper };
  };

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

  const updatePriceRange = () => {
    const { min, max } = clampValues();
    if (priceRangeDisplay) {
      priceRangeDisplay.textContent = `$${min} – $${max} per day`;
    }

    const shell = document.querySelector('.range-slider-shell');
    const startPercent = (min / 500) * 100;
    const endPercent = (max / 500) * 100;

    if (shell) {
      shell.style.setProperty('--range-start', `${startPercent}%`);
      shell.style.setProperty('--range-end', `${endPercent}%`);
      // trigger a subtle pulse animation when the range updates
      shell.classList.remove('pulse');
      // allow reflow
      // eslint-disable-next-line no-unused-expressions
      shell.offsetWidth;
      shell.classList.add('pulse');
    }
  };

  const setFeedback = (message) => {
    if (!feedback) {
      return;
    }

    feedback.textContent = message;
    feedback.hidden = !message;
  };

  toggleFiltersButton?.addEventListener('click', () => {
    if (!optionalFilters) {
      return;
    }

    const isHidden = optionalFilters.classList.toggle('hidden');
    toggleFiltersButton.textContent = isHidden ? '⚲ Filter' : 'Hide Filters';
  });

  categorySelect?.addEventListener('change', updateCategoryVisibility);

  const syncRangeInputs = (sourceInput) => {
    const minValue = Number(priceMinInput?.value || 0);
    const maxValue = Number(priceMaxInput?.value || 500);
    const nextMin = sourceInput === rateMinInput ? Math.min(Number(sourceInput.value), maxValue) : Math.min(minValue, maxValue);
    const nextMax = sourceInput === rateMaxInput ? Math.max(Number(sourceInput.value), minValue) : Math.max(maxValue, minValue);

    if (priceMinInput) {
      priceMinInput.value = nextMin;
    }
    if (priceMaxInput) {
      priceMaxInput.value = nextMax;
    }
    if (rateMinInput) {
      rateMinInput.value = nextMin;
    }
    if (rateMaxInput) {
      rateMaxInput.value = nextMax;
    }

    updatePriceRange();
  };

  [rateMinInput, rateMaxInput, priceMinInput, priceMaxInput].forEach((input) => {
    input?.addEventListener('input', () => {
      if (input === rateMinInput || input === rateMaxInput) {
        syncRangeInputs(input);
      } else {
        const minValue = Number(priceMinInput?.value || 0);
        const maxValue = Number(priceMaxInput?.value || 500);
        const safeMin = Math.min(minValue, maxValue);
        const safeMax = Math.max(minValue, maxValue);
        if (priceMinInput) {
          priceMinInput.value = safeMin;
        }
        if (priceMaxInput) {
          priceMaxInput.value = safeMax;
        }
        if (rateMinInput) {
          rateMinInput.value = safeMin;
        }
        if (rateMaxInput) {
          rateMaxInput.value = safeMax;
        }
        updatePriceRange();
      }
    });
  });

  const submitCatalogSearch = async () => {
    await loadCatalogListings();
  };

  searchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitCatalogSearch();
    }
  });

  searchButton?.addEventListener('click', async () => {
    await submitCatalogSearch();
  });

  applyFiltersButton?.addEventListener('click', async () => {
    await loadCatalogListings();
  });

  clearFiltersButton?.addEventListener('click', async () => {
    const formFields = document.querySelectorAll('#optional-filters input, #optional-filters select');
    formFields.forEach((element) => {
      if (element.type === 'checkbox') {
        element.checked = false;
      } else if (element.type === 'date') {
        element.value = '';
      } else if (element.id === 'price-min-input' || element.id === 'price-max-input') {
        element.value = element.id === 'price-min-input' ? '0' : '500';
      } else if (element.id === 'rate-min' || element.id === 'rate-max') {
        element.value = element.id === 'rate-min' ? '0' : '500';
      } else if (element.tagName === 'SELECT') {
        element.value = '';
      }
    });
    const toolbarLocationInput = document.getElementById('tool-location');
    const optionalZipInput = document.getElementById('zip-code-input');
    if (toolbarLocationInput) {
      toolbarLocationInput.value = '';
    }
    if (optionalZipInput) {
      optionalZipInput.value = '';
    }
    categorySelect.value = '';
    updateCategoryVisibility();
    updatePriceRange();
    await loadCatalogListings();
    setFeedback('Filters cleared.');
  });

  updateCategoryVisibility();
  updatePriceRange();
  // Set up realtime listeners for listings and reservations so calendars update automatically
  if (window.__equiptUnsubscribers) {
    window.__equiptUnsubscribers.forEach((u) => { try { u(); } catch (e) {} });
  }
  const unsubListings = databaseService.subscribeToCollection('listings', () => loadCatalogListings());
  const unsubReservations = databaseService.subscribeToCollection('reservations', () => loadCatalogListings());
  window.__equiptUnsubscribers = [unsubListings, unsubReservations];

  loadCatalogListings();
}

async function loadRenterReservations(currentUser) {
  const statusEl = document.getElementById('reservation-status');
  const upcomingShell = document.getElementById('upcoming-rentals-shell');
  const historyShell = document.getElementById('history-rentals-shell');

  if (!currentUser || !upcomingShell || !historyShell) {
    return;
  }

  if (statusEl) {
    statusEl.textContent = 'Loading your reservations…';
    statusEl.hidden = false;
    statusEl.classList.remove('form-error');
    statusEl.classList.add('form-success');
  }

  try {
    const [allReservations, allListings, allUsers] = await Promise.all([
      databaseService.readRecords('reservations'),
      databaseService.readRecords('listings'),
      databaseService.readRecords('users')
    ]);
    const listingsById = new Map((allListings || []).map((listing) => [listing.id, listing]));
    const userLookup = new Map((allUsers || []).map((user) => [user.uid || user.id, user]));
    const getReservationListingId = (reservation = {}) => {
      if (typeof reservation.listing === 'string') {
        return reservation.listing;
      }

      return reservation.listingId || reservation.listing?.id || reservation.listing_id || reservation.listingRef || '';
    };
    const withListing = (reservation = {}) => {
      const linkedListing = listingsById.get(getReservationListingId(reservation));
      if (!linkedListing) {
        return reservation;
      }

      const existingListing = reservation.listing && typeof reservation.listing === 'object'
        ? reservation.listing
        : {};

      return {
        ...reservation,
        listing: {
          ...existingListing,
          ...linkedListing
        }
      };
    };
    const renterReservations = (allReservations || []).filter((reservation) => {
      const renterId = reservation.renterId || reservation.renter?.uid || reservation.userId || reservation.user?.uid || reservation.createdByUserId;
      return renterId === currentUser.uid;
    }).map(withListing);

    const isConfirmedLikeStatus = (normalizedStatus = '') => ['confirmed', 'booked', 'reserved'].includes(normalizedStatus);
    const getReservationStartValue = (reservation = {}) => reservation.startDate || reservation.startAt || reservation.startDateTime || reservation.start || reservation.bookedDate || reservation.date;
    const getReservationDateScore = (reservation = {}) => {
      const startValue = getReservationStartValue(reservation);
      const parsedDate = startValue ? new Date(startValue) : null;
      return parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.getTime() : 0;
    };

    const groupedReservations = {
      cancelled: [],
      upcoming: [],
      past: []
    };

    renterReservations.forEach((reservation) => {
      const summary = buildReservationCancellationSummary(reservation);
      const normalizedStatus = String(reservation.status || '').trim().toLowerCase();

      if (normalizedStatus === 'cancelled' || normalizedStatus === 'canceled') {
        groupedReservations.cancelled.push(reservation);
        return;
      }

      if (summary.hasStarted || summary.hasEnded || (!summary.eligible && !isConfirmedLikeStatus(normalizedStatus))) {
        groupedReservations.past.push(reservation);
        return;
      }

      groupedReservations.upcoming.push(reservation);
    });

    groupedReservations.upcoming.sort((left, right) => getReservationDateScore(left) - getReservationDateScore(right));
    groupedReservations.cancelled.sort((left, right) => getReservationDateScore(right) - getReservationDateScore(left));
    groupedReservations.past.sort((left, right) => getReservationDateScore(right) - getReservationDateScore(left));

    const renderReservationCard = (reservation, bucket = 'upcoming') => {
      const summary = buildReservationCancellationSummary(reservation);
      const refundPolicy = getRefundPolicy(reservation);
      const photo = getReservationPhoto(reservation);
      const toolName = getReservationToolName(reservation);
      const status = String(reservation.status || (bucket === 'upcoming' ? 'Confirmed' : 'Completed')).trim();
      const normalizedStatus = status.toLowerCase();
      const showRefundLine = normalizedStatus === 'cancelled' || normalizedStatus === 'canceled';
      const reservationDates = getReservationStartValue(reservation);
      const reservationEndDate = reservation.endDate || reservation.endAt || reservation.endDateTime || reservation.end || reservation.selectedDateRange?.at(-1) || reservation.bookedDate || reservation.date;
      const displayDates = reservationDates
        ? `${formatReservationDateTime(reservationDates)}${reservationEndDate && reservationEndDate !== reservationDates ? ` – ${formatReservationDateTime(reservationEndDate)}` : ''}`
        : 'Not provided';
      const isHistoryCard = bucket === 'cancelled' || bucket === 'past';

      const ownerId = reservation.ownerId || reservation.listing?.ownerId || '';
      const ownerProfile = userLookup.get(ownerId) || null;
      const lenderName = [ownerProfile?.firstName, ownerProfile?.lastName].filter(Boolean).join(' ') || 'Lender';
      const lenderEmail = ownerProfile?.email || reservation.ownerEmail || reservation.listing?.ownerEmail || '';
      const lenderPhone = ownerProfile?.phone || reservation.ownerPhone || reservation.listing?.ownerPhone || '';
      const lenderContactMarkup = !['cancelled', 'canceled', 'rejected'].includes(normalizedStatus)
        ? `
            <div class="rental-contact-card">
              <p><strong>Lender contact:</strong> ${escapeHtml(lenderName)}</p>
              ${lenderEmail ? `<p><strong>Email:</strong> ${escapeHtml(lenderEmail)}</p>` : ''}
              ${lenderPhone ? `<p><strong>Phone:</strong> ${escapeHtml(lenderPhone)}</p>` : ''}
            </div>
          `
        : '';

      return `
        <article class="reservation-card${isHistoryCard ? ' reservation-card--history' : ''}" data-reservation-id="${escapeHtml(reservation.id)}">
          <div class="reservation-card__media">
            ${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(toolName)}" />` : '<div class="reservation-card__placeholder">No photo</div>'}
          </div>
          <div class="reservation-card__details">
            <h4>${escapeHtml(toolName)}</h4>
            <p><strong>Dates:</strong> ${escapeHtml(displayDates)}</p>
            <p><strong>Status:</strong> ${escapeHtml(status)}</p>
            ${lenderContactMarkup}
            ${showRefundLine ? `<p><strong>Refund:</strong> ${escapeHtml(refundPolicy.summary)}</p>` : ''}
            <p><strong>Cancellation deadline:</strong> ${escapeHtml(summary.cancellationDeadlineLabel)}</p>
            ${bucket === 'upcoming'
          ? (summary.eligible
              ? `<button type="button" class="secondary reservation-cancel-btn" data-reservation-id="${escapeHtml(reservation.id)}">Cancel Reservation</button>`
              : `<p class="reservation-message">${escapeHtml(summary.message)}</p>`)
          : ''}
          </div>
        </article>
      `;
    };

    const renderReservationGroup = (title, bucketKey, emptyMessage, openByDefault = false) => {
      const reservations = groupedReservations[bucketKey] || [];
      return `
        <details class="booking-status-folder" ${openByDefault ? 'open' : ''}>
          <summary>
            <span>${escapeHtml(title)}</span>
            <span class="booking-count-badge">${reservations.length}</span>
          </summary>
          <div class="booking-status-folder__content">
            ${reservations.length ? reservations.map((reservation) => renderReservationCard(reservation, bucketKey)).join('') : `<p class="empty-state">${escapeHtml(emptyMessage)}</p>`}
          </div>
        </details>
      `;
    };

    upcomingShell.innerHTML = '';
    historyShell.innerHTML = `
      <div class="reservation-history-groups">
        ${renderReservationGroup('Upcoming Bookings', 'upcoming', 'You do not have any upcoming rentals right now.', true)}
        ${renderReservationGroup('Cancelled Bookings', 'cancelled', 'No cancelled bookings yet.')}
        ${renderReservationGroup('Past Bookings', 'past', 'No past bookings yet.')}
      </div>
    `;

    historyShell.querySelectorAll('.reservation-cancel-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        const reservationId = button.getAttribute('data-reservation-id');
        const reservation = renterReservations.find((entry) => entry.id === reservationId);

        if (!reservation) {
          return;
        }

        const summary = buildReservationCancellationSummary(reservation);
        const refundPolicy = getRefundPolicy(reservation);
        const photo = getReservationPhoto(reservation);
        const toolName = getReservationToolName(reservation);
        const status = String(reservation.status || '').trim().toLowerCase();
        const showRefundLine = status === 'cancelled' || status === 'canceled';
        const reservationDates = reservation.startDate || reservation.startAt || reservation.startDateTime || reservation.start || reservation.bookedDate || reservation.date;
        const reservationEndDate = reservation.endDate || reservation.endAt || reservation.endDateTime || reservation.end || reservation.selectedDateRange?.at(-1) || reservation.bookedDate || reservation.date;
        const displayDates = reservationDates
          ? `${formatReservationDateTime(reservationDates)}${reservationEndDate && reservationEndDate !== reservationDates ? ` – ${formatReservationDateTime(reservationEndDate)}` : ''}`
          : 'Not provided';
        const modalMarkup = `
          <div class="reservation-modal-backdrop" role="dialog" aria-modal="true" aria-label="Cancel reservation confirmation">
            <div class="reservation-modal">
              <h3>Cancel Reservation</h3>
              <div class="reservation-modal__body">
                <div class="reservation-modal__image">
                  ${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(toolName)}" />` : '<div class="reservation-modal__placeholder">No photo</div>'}
                </div>
                <div class="reservation-modal__content">
                  <p><strong>${escapeHtml(toolName)}</strong></p>
                  <p><strong>Selected rental dates:</strong> ${escapeHtml(displayDates)}</p>
                  <p><strong>Cancellation deadline:</strong> ${escapeHtml(summary.cancellationDeadlineLabel)}</p>
                  ${showRefundLine ? `<p><strong>Refund:</strong> ${escapeHtml(refundPolicy.summary)}</p>` : ''}
                  <label class="reservation-modal__field" for="cancellation-reason">
                    <span>Reason</span>
                    <select id="cancellation-reason">
                      <option value="Plans changed">Plans changed</option>
                      <option value="No longer need the tool">No longer need the tool</option>
                      <option value="Found another tool">Found another tool</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                </div>
              </div>
              <div class="reservation-modal__actions">
                <button type="button" class="secondary" data-action="keep-reservation">Keep Reservation</button>
                <button type="button" class="secondary" data-action="dismiss-cancel-modal">Close</button>
                <button type="button" class="primary reservation-modal__confirm" data-action="confirm-cancellation">Confirm Cancellation</button>
              </div>
            </div>
          </div>
        `;

        const modalRoot = document.createElement('div');
        modalRoot.innerHTML = modalMarkup;
        const modalElement = modalRoot.firstElementChild;
        if (modalElement) {
          document.body.appendChild(modalElement);
        }

        const closeModal = () => {
          modalElement?.remove();
          document.removeEventListener('keydown', handleEscapeKey);
        };

        const handleEscapeKey = (event) => {
          if (event.key === 'Escape') {
            closeModal();
          }
        };

        document.addEventListener('keydown', handleEscapeKey);
        modalElement?.addEventListener('click', (event) => {
          if (event.target === modalElement) {
            closeModal();
          }
        });

        modalElement?.querySelector('[data-action="keep-reservation"]')?.addEventListener('click', () => {
          closeModal();
        });
        modalElement?.querySelector('[data-action="dismiss-cancel-modal"]')?.addEventListener('click', () => {
          closeModal();
        });

        modalElement?.querySelector('[data-action="confirm-cancellation"]')?.addEventListener('click', async () => {
          const reason = modalRoot.firstElementChild?.querySelector('#cancellation-reason')?.value || 'Other';
          const timestamp = new Date().toISOString();
          await updateBookingState(reservation, 'Cancelled', reason, {
            cancellationReason: reason,
            cancellationBy: currentUser.uid,
            cancelledBy: 'renter',
            lenderNotifiedAt: timestamp,
            lenderNotified: true,
            cancelledAt: timestamp,
            cancellationRequestedAt: timestamp
          });
          closeModal();
          if (statusEl) {
            statusEl.textContent = 'Your reservation has been cancelled.';
            statusEl.hidden = false;
            statusEl.classList.remove('form-error');
            statusEl.classList.add('form-success');
          }
          await loadRenterReservations(currentUser);
        });
      });
    });

    if (statusEl) {
      statusEl.textContent = 'Your reservations are up to date.';
      statusEl.hidden = false;
      statusEl.classList.remove('form-error');
      statusEl.classList.add('form-success');
    }
  } catch (error) {
    console.error('Unable to load renter reservations:', error);
    if (statusEl) {
      statusEl.textContent = 'We could not load your reservations right now.';
      statusEl.hidden = false;
      statusEl.classList.add('form-error');
      statusEl.classList.remove('form-success');
    }
  }
}

async function showProfilePage() {
  const currentUser = authService.getCurrentUser();

  if (!currentUser) {
    window.location.hash = 'login';
    return;
  }

  const renderProfileShell = (profileData = {}) => {
    renderView(app, renderProfileView({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email || currentUser.email,
      phone: profileData.phone,
      role: profileData.role || 'Member',
      createdAt: profileData.createdAt,
      profilePhoto: profileData.profilePhoto
    }));

    const profilePhotoInput = document.getElementById('profile-photo-input');
    const changePhotoButton = document.getElementById('change-profile-photo-btn');
    const photoStatus = document.getElementById('profile-photo-status');

    const setPhotoStatus = (message, isError = false) => {
      if (!photoStatus) {
        return;
      }

      photoStatus.textContent = message || '';
      photoStatus.hidden = !message;
      photoStatus.classList.toggle('form-error', isError);
      photoStatus.classList.toggle('form-success', !isError && Boolean(message));
    };

    changePhotoButton?.addEventListener('click', () => {
      profilePhotoInput?.click();
    });

    profilePhotoInput?.addEventListener('change', async () => {
      const selectedFile = profilePhotoInput.files?.[0];
      if (!selectedFile) {
        return;
      }

      if (!selectedFile.type.startsWith('image/')) {
        setPhotoStatus('Please choose an image file.', true);
        profilePhotoInput.value = '';
        return;
      }

      if (selectedFile.size > 8 * 1024 * 1024) {
        setPhotoStatus('Please choose an image smaller than 8 MB.', true);
        profilePhotoInput.value = '';
        return;
      }

      setPhotoStatus('Optimizing and uploading profile photo...');

      try {
        const photoDataUrl = await readOptimizedProfilePhotoDataUrl(selectedFile);
        const updatePayload = {
          profilePhoto: photoDataUrl,
          updatedAt: new Date().toISOString()
        };

        try {
          await databaseService.updateRecord('users', currentUser.uid, updatePayload);
        } catch (updateError) {
          // If profile doc does not exist yet, create it and include the uploaded photo.
          await databaseService.createUserProfile(currentUser.uid, {
            email: currentUser.email || '',
            createdAt: new Date().toISOString(),
            ...updatePayload
          });
        }

        renderProfileShell({
          ...profileData,
          profilePhoto: photoDataUrl
        });

        await loadMyListings(currentUser);
        await loadRenterReservations(currentUser);
        await loadLenderBookingRequests(currentUser);

        const refreshedStatus = document.getElementById('profile-photo-status');
        if (refreshedStatus) {
          refreshedStatus.textContent = 'Profile photo updated.';
          refreshedStatus.hidden = false;
          refreshedStatus.classList.remove('form-error');
          refreshedStatus.classList.add('form-success');
        }
      } catch (error) {
        console.error('Unable to update profile photo:', error);
        setPhotoStatus('Unable to update profile photo right now. Please try a different image.', true);
      } finally {
        profilePhotoInput.value = '';
      }
    });

    document.getElementById('go-update-profile-btn')?.addEventListener('click', () => {
      window.location.hash = 'profile-update';
    });

    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      await authService.logout();
      window.location.hash = 'login';
    });
  };

  renderProfileShell({ email: currentUser.email });

  try {
    const profile = await authService.getCurrentUserProfile();

    renderProfileShell({
      firstName: profile?.firstName,
      lastName: profile?.lastName,
      email: profile?.email || currentUser.email,
      phone: profile?.phone,
      role: profile?.role,
      createdAt: profile?.createdAt,
      profilePhoto: profile?.profilePhoto
    });

    await loadMyListings(currentUser);
    await loadRenterReservations(currentUser);
    await loadLenderBookingRequests(currentUser);
  } catch (error) {
    console.error('Unable to load profile data:', error);
  }
}

async function showProfileUpdatePage() {
  const currentUser = authService.getCurrentUser();

  if (!currentUser) {
    window.location.hash = 'login';
    return;
  }

  const renderUpdateView = (profileData = {}) => {
    renderView(app, renderProfileUpdateView({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email || currentUser.email,
      phone: profileData.phone,
      role: profileData.role || 'Member'
    }));

    const profileForm = document.getElementById('profile-update-form');
    const profileStatus = document.getElementById('profile-status');

    const setProfileStatus = (message, isError = false) => {
      if (!profileStatus) {
        return;
      }

      profileStatus.textContent = message || '';
      profileStatus.hidden = !message;
      profileStatus.classList.toggle('form-error', isError);
      profileStatus.classList.toggle('form-success', !isError && Boolean(message));
    };

    document.getElementById('back-to-profile-btn')?.addEventListener('click', () => {
      window.location.hash = 'profile';
    });

    profileForm?.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(profileForm);
      const updatedProfile = {
        firstName: (formData.get('firstName') || '').toString().trim(),
        lastName: (formData.get('lastName') || '').toString().trim(),
        email: (formData.get('email') || '').toString().trim(),
        phone: (formData.get('phone') || '').toString().trim(),
        role: (formData.get('role') || 'Member').toString().trim()
      };

      if (!updatedProfile.email) {
        setProfileStatus('Please enter an email address before saving.', true);
        return;
      }

      setProfileStatus('Saving your profile...', false);

      try {
        const refreshedProfile = await authService.updateUserProfile(updatedProfile);
        renderUpdateView({
          ...profileData,
          ...updatedProfile,
          ...(refreshedProfile || {})
        });
        const updatedStatus = document.getElementById('profile-status');
        if (updatedStatus) {
          updatedStatus.textContent = 'Profile updated successfully.';
          updatedStatus.hidden = false;
          updatedStatus.classList.remove('form-error');
          updatedStatus.classList.add('form-success');
        }
      } catch (error) {
        console.error('Unable to update profile:', error);
        setProfileStatus(error?.message || 'Unable to update your profile right now.', true);
      }
    });
  };

  renderUpdateView({ email: currentUser.email });

  try {
    const profile = await authService.getCurrentUserProfile();

    renderUpdateView({
      firstName: profile?.firstName,
      lastName: profile?.lastName,
      email: profile?.email || currentUser.email,
      phone: profile?.phone,
      role: profile?.role,
      createdAt: profile?.createdAt
    });
  } catch (error) {
    console.error('Unable to load profile data:', error);
  }
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
  } else if (hash === 'list-tool') {
    showListToolPage();
  } else if (hash === 'profile') {
    showProfilePage();
  } else if (hash === 'profile-update') {
    showProfileUpdatePage();
  } else {
    showHomePage();
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);
