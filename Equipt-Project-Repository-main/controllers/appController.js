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

function showHomePage() {
  renderView(app, renderHomeView(Boolean(authService.getCurrentUser())));
  document.getElementById('go-login')?.addEventListener('click', showLoginPage);
}

function showLoginPage() {
  renderView(app, renderLoginView());
  document.getElementById('login-btn')?.addEventListener('click', () => {
    window.location.hash = 'login-form';
  });
  document.getElementById('register-btn')?.addEventListener('click', () => {
    window.location.hash = 'register';
  });
}

function showRegistrationPage() {
  renderView(app, renderRegistrationView());

  const registrationForm = document.getElementById('registration-form');
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

    try {
      await authService.register(formData.get('email'), password, {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        phone: formData.get('phone'),
        role: formData.get('role')
      });

      alert('Account created successfully!');
      window.location.hash = 'login';
    } catch (error) {
      console.error('Registration failed:', error);
      alert(error?.message || 'Registration failed. Please try again.');
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
      window.location.hash = 'tool-catalog';
    } catch (error) {
      console.error('Login failed:', error);
      setLoginError('Error: Invalid login credentials');
    }
  });

  document.getElementById('back-btn')?.addEventListener('click', () => {
    window.location.hash = 'login';
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
