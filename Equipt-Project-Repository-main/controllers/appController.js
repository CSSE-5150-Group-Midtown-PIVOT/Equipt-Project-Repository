import { renderView } from '../views/viewRenderer.js';
import { renderHomeView } from '../views/homeView.js';
import { renderLoginView, renderLoginFormView } from '../views/loginView.js';
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
  renderView(app, renderHomeView());
  document.getElementById('go-login')?.addEventListener('click', showLoginPage);
}

function showLoginPage() {
  renderView(app, renderLoginView());
  document.getElementById('login-btn')?.addEventListener('click', () => {
    window.location.hash = 'login-form';
  });
  document.getElementById('register-btn')?.addEventListener('click', () => authService.register('demo@example.com', 'password123'));
}

function showLoginFormPage() {
  renderView(app, renderLoginFormView());

  const loginForm = document.getElementById('login-form');
  loginForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = document.getElementById('email')?.value || 'demo@example.com';
    const password = document.getElementById('password')?.value || 'password123';
    authService.login(email, password);
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

function showProfilePage() {
  renderView(app, renderProfileView());
  document.getElementById('logout-btn')?.addEventListener('click', () => authService.logout());
}

function route() {
  const hash = window.location.hash.replace('#', '') || 'home';

  if (hash === 'login') {
    showLoginPage();
  } else if (hash === 'login-form') {
    showLoginFormPage();
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
