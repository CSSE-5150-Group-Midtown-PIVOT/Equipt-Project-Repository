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
    (message.includes('invalid-credential') || message.includes('invalid login credentials')) ? 'auth/invalid-credential' :
    '');

  switch (inferredCode) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'incorrect username or password';
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

      sessionStorage.setItem('redirectAfterAuth', 'list-tool');
      sessionStorage.setItem('authPromptMessage', 'Sign in or create an account to list your tools.');
      window.location.hash = 'login-form';
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
  const promptMessage = getStoredAuthMessage();

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

  if (promptMessage) {
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
      const redirectTarget = getStoredAuthRedirect() || 'tool-catalog';
      setLoginSuccess('Successful login: welcome to Equipt!');
      window.setTimeout(() => {
        window.location.hash = redirectTarget;
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
        URL.revokeObjectURL(entry.url);
        selectedImages.splice(index, 1);
        renderPreviews();
        updatePublishState();
      });
      card.appendChild(removeButton);
      previewList.appendChild(card);
    });
  };

  fileInput?.addEventListener('change', (event) => {
    const files = Array.from(event.target.files || []);
    selectedImages = [...selectedImages, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))];
    renderPreviews();
    updatePublishState();
    event.target.value = '';
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
      setStatus('Publishing your listing to Firestore…', false);
      const photos = await readImageFilesAsDataUrls(selectedImages.map((entry) => entry.file));
      const selectedSubcategories = Array.from(document.querySelectorAll('#list-category-checklist input[type="checkbox"]:checked')).map((checkbox) => checkbox.value);
      const nextDailyRate = normalizeDailyRate(document.getElementById('rental-price')?.value || 0);
      const availabilityValue = document.getElementById('listing-availability')?.value || 'Available now';
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

      setStatus('Your listing is now live in Firestore.', false);
      form.reset();
      selectedImages = [];
      renderPreviews();
      updatePublishState();
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

async function loadMyListings(currentUser) {
  const shell = document.getElementById('my-listings-shell');

  if (!shell || !currentUser) {
    return;
  }

  shell.innerHTML = '<p class="empty-state">Loading your listings…</p>';

  try {
    const allListings = await databaseService.readRecords('listings');
    const ownerListings = (allListings || []).filter((listing) => listing.ownerId === currentUser.uid);

    if (!ownerListings.length) {
      shell.innerHTML = '<p class="empty-state">You have not published any listings yet.</p>';
      return;
    }

    shell.innerHTML = ownerListings.map((listing) => {
      const photoUrl = Array.isArray(listing.photos) && listing.photos.length > 0 ? listing.photos[0] : '';
      const status = listing.publicationStatus || (listing.isPublished ? 'Published' : 'Draft');
      const rate = getEffectiveDailyRate(listing);
      const availability = listing.availability || 'Available now';
      const category = listing.category || listing.itemCategory || 'Uncategorized';

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
  const categorySelect = document.getElementById('main-category-select');
  const selectedSubcategories = Array.from(document.querySelectorAll('#category-checklist .subcategory-group.visible input[type="checkbox"]:checked')).map((checkbox) => checkbox.value.toLowerCase());
  const selectedConditions = Array.from(document.querySelectorAll('#optional-filters input[name="condition"]:checked')).map((checkbox) => checkbox.value);

  return {
    searchText: searchInput?.value?.trim().toLowerCase() || '',
    location: locationInput?.value?.trim() || '',
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

  if (rentalStart && listing.availability && String(listing.availability).toLowerCase() === 'reserved') {
    return false;
  }

  if (rentalEnd && listing.availability && String(listing.availability).toLowerCase() === 'pending pickup') {
    return false;
  }

  return true;
}

function buildCalendarDays(listing = {}, reservationRecords = [], monthDate = new Date()) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const reservedSet = new Set();

  const addDateKey = (d) => {
    if (!d) return;
    if (typeof d === 'string') {
      // normalize to YYYY-MM-DD
      const key = d.includes('T') ? d.slice(0, 10) : d;
      reservedSet.add(key);
      return;
    }
    if (d instanceof Date) {
      reservedSet.add(d.toISOString().slice(0, 10));
      return;
    }
    if (Array.isArray(d)) {
      d.forEach(addDateKey);
    }
  };

  // gather reservation dates from records
  reservationRecords.forEach((rec) => {
    const normalizedStatus = String(rec.status || rec.reservationStatus || '').trim().toLowerCase();
    if (normalizedStatus === 'cancelled') {
      return;
    }
    addDateKey(rec.startDate || rec.bookedDate || rec.date || rec.bookedAt || rec.start || rec.reservedDates || rec.bookedDates || rec.dates || rec.endDate || rec.end);
  });

  // listing-level reservedDates
  addDateKey(listing.reservedDates || listing.reservedDate || listing.bookedDates);

  const monthDays = [];
  const leadingBlanks = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  for (let i = 0; i < leadingBlanks; i += 1) {
    monthDays.push({ day: '', reserved: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isReserved = reservedSet.has(dateKey);
    monthDays.push({ day, reserved: isReserved });
  }

  return monthDays;
}

function getCalendarCaption(monthDate = new Date()) {
  return monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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
    const visibleListings = publishedListings.filter((listing) => matchesCatalogFilters(listing, filters));

    if (!visibleListings.length) {
      results.innerHTML = '<div class="catalog-results__empty">No tools found</div>';
      feedback.textContent = 'No tools found';
      return;
    }

    // Build a lookup of reservations by listing id (may be multiple reservations per listing)
    const reservationLookup = new Map();
    (allReservations || []).forEach((reservation) => {
      const lid = reservation.listingId || reservation.listing?.id || '';
      if (!lid) return;
      const arr = reservationLookup.get(lid) || [];
      arr.push(reservation);
      reservationLookup.set(lid, arr);
    });

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
      const availability = listing.availability || 'Available now';
      const status = listing.publicationStatus || (listing.isPublished ? 'Published' : 'Draft');
      const reservationsForListing = reservationLookup.get(listing.id) || [];
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
            <p>${escapeHtml(description)}</p>
            <div class="catalog-result-card__meta">
              <span>${escapeHtml(categoryLabel)}</span>
              <span>${escapeHtml(availability)}</span>
              <span>${escapeHtml(status)}</span>
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
                ${calendarDays.map((day) => `
                  <div class="catalog-calendar__day ${day.day ? (day.reserved ? 'is-reserved' : 'is-available') : 'is-empty'}">${day.day || ''}</div>
                `).join('')}
              </div>
              <div class="catalog-calendar__legend">
                <span><i class="catalog-calendar__dot catalog-calendar__dot--available"></i> Available</span>
                <span><i class="catalog-calendar__dot catalog-calendar__dot--reserved"></i> Reserved</span>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Make each listing card expandable: click or Enter/Space toggles details (calendar)
    results.querySelectorAll('.catalog-result-card').forEach((card) => {
      const listingId = card.dataset.listingId;
      card.addEventListener('click', (e) => {
        // ignore clicks on prev/next nav buttons inside the calendar
        if (e.target.closest('.catalog-calendar__nav')) return;
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

      if (captionEl) captionEl.textContent = getCalendarCaption(target);
      if (countsEl) countsEl.textContent = `${monthDays.filter((d) => d.day && d.reserved).length} reserved • ${monthDays.filter((d) => d.day && !d.reserved).length} available`;
      if (gridEl) {
        gridEl.innerHTML = monthDays.map((day) => `
                  <div class="catalog-calendar__day ${day.day ? (day.reserved ? 'is-reserved' : 'is-available') : 'is-empty'}">${day.day || ''}</div>
                `).join('');
      }
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
    const allReservations = await databaseService.readRecords('reservations');
    const renterReservations = (allReservations || []).filter((reservation) => {
      const renterId = reservation.renterId || reservation.renter?.uid || reservation.userId || reservation.user?.uid || reservation.createdByUserId;
      return renterId === currentUser.uid;
    });

    const upcoming = renterReservations.filter((reservation) => {
      const summary = buildReservationCancellationSummary(reservation);
      const normalizedStatus = String(reservation.status || '').trim().toLowerCase();
      return normalizedStatus !== 'cancelled' && !summary.hasStarted && !summary.hasEnded && (summary.eligible || normalizedStatus === 'confirmed' || normalizedStatus === 'booked' || normalizedStatus === 'reserved');
    });

    const history = renterReservations.filter((reservation) => {
      const summary = buildReservationCancellationSummary(reservation);
      const normalizedStatus = String(reservation.status || '').trim().toLowerCase();
      return normalizedStatus === 'cancelled' || summary.hasStarted || summary.hasEnded || (!summary.eligible && normalizedStatus !== 'confirmed' && normalizedStatus !== 'booked' && normalizedStatus !== 'reserved');
    });

    upcomingShell.innerHTML = upcoming.length
      ? upcoming.map((reservation) => {
        const summary = buildReservationCancellationSummary(reservation);
        const refundPolicy = getRefundPolicy(reservation);
        const photo = getReservationPhoto(reservation);
        const toolName = getReservationToolName(reservation);
        const status = String(reservation.status || 'Confirmed').trim();
        return `
          <article class="reservation-card" data-reservation-id="${escapeHtml(reservation.id)}">
            <div class="reservation-card__media">
              ${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(toolName)}" />` : '<div class="reservation-card__placeholder">No photo</div>'}
            </div>
            <div class="reservation-card__details">
              <h4>${escapeHtml(toolName)}</h4>
              <p><strong>Dates:</strong> ${escapeHtml(formatReservationDateTime(reservation.startAt || reservation.startDateTime || reservation.startDate || reservation.start))} – ${escapeHtml(formatReservationDateTime(reservation.endAt || reservation.endDateTime || reservation.endDate || reservation.end))}</p>
              <p><strong>Status:</strong> ${escapeHtml(status)}</p>
              <p><strong>Cancellation deadline:</strong> ${escapeHtml(summary.cancellationDeadlineLabel)}</p>
              <p><strong>Refund:</strong> ${escapeHtml(refundPolicy.summary)}</p>
              ${summary.eligible
          ? `<button type="button" class="secondary reservation-cancel-btn" data-reservation-id="${escapeHtml(reservation.id)}">Cancel Reservation</button>`
          : `<p class="reservation-message">${escapeHtml(summary.message)}</p>`}
            </div>
          </article>
        `;
      }).join('')
      : '<p class="empty-state">You do not have any upcoming rentals right now.</p>';

    historyShell.innerHTML = history.length
      ? history.map((reservation) => {
        const summary = buildReservationCancellationSummary(reservation);
        const refundPolicy = getRefundPolicy(reservation);
        const photo = getReservationPhoto(reservation);
        const toolName = getReservationToolName(reservation);
        const status = String(reservation.status || 'Completed').trim();
        return `
          <article class="reservation-card reservation-card--history">
            <div class="reservation-card__media">
              ${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(toolName)}" />` : '<div class="reservation-card__placeholder">No photo</div>'}
            </div>
            <div class="reservation-card__details">
              <h4>${escapeHtml(toolName)}</h4>
              <p><strong>Status:</strong> ${escapeHtml(status)}</p>
              <p><strong>Refund:</strong> ${escapeHtml(refundPolicy.summary)}</p>
              <p><strong>Cancellation deadline:</strong> ${escapeHtml(summary.cancellationDeadlineLabel)}</p>
            </div>
          </article>
        `;
      }).join('')
      : '<p class="empty-state">No cancelled or completed reservations yet.</p>';

    upcomingShell.querySelectorAll('.reservation-cancel-btn').forEach((button) => {
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
                  <p><strong>Start:</strong> ${escapeHtml(formatReservationDateTime(reservation.startAt || reservation.startDateTime || reservation.startDate || reservation.start))}</p>
                  <p><strong>End:</strong> ${escapeHtml(formatReservationDateTime(reservation.endAt || reservation.endDateTime || reservation.endDate || reservation.end))}</p>
                  <p><strong>Cancellation deadline:</strong> ${escapeHtml(summary.cancellationDeadlineLabel)}</p>
                  <p><strong>Refund:</strong> ${escapeHtml(refundPolicy.summary)}</p>
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
                <button type="button" class="primary reservation-modal__confirm" data-action="confirm-cancellation">Confirm Cancellation</button>
              </div>
            </div>
          </div>
        `;

        const modalRoot = document.createElement('div');
        modalRoot.innerHTML = modalMarkup;
        document.body.appendChild(modalRoot.firstElementChild);

        modalRoot.firstElementChild?.querySelector('[data-action="keep-reservation"]')?.addEventListener('click', () => {
          modalRoot.firstElementChild.remove();
        });

        modalRoot.firstElementChild?.querySelector('[data-action="confirm-cancellation"]')?.addEventListener('click', async () => {
          const reason = modalRoot.firstElementChild?.querySelector('#cancellation-reason')?.value || 'Other';
          const cancellationPayload = {
            status: 'Cancelled',
            reservationStatus: 'Cancelled',
            cancelledAt: new Date().toISOString(),
            cancellationReason: reason,
            cancellationRequestedAt: new Date().toISOString(),
            cancellationBy: currentUser.uid,
            cancelledBy: 'renter',
            lenderNotifiedAt: new Date().toISOString(),
            lenderNotified: true
          };

          await databaseService.updateRecord('reservations', reservation.id, cancellationPayload);

          if (reservation.listingId) {
            await databaseService.updateRecord('listings', reservation.listingId, {
              availability: 'Available now',
              reservationStatus: 'Cancelled',
              updatedAt: new Date().toISOString()
            });
          }
          modalRoot.firstElementChild.remove();
          if (statusEl) {
            statusEl.textContent = 'Your reservation has been cancelled. Your refund is being processed.';
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
      createdAt: profileData.createdAt
    }));

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
      createdAt: profile?.createdAt
    });

    await loadMyListings(currentUser);
    await loadRenterReservations(currentUser);
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
