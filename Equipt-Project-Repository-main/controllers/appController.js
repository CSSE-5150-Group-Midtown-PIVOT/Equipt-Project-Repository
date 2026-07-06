import { renderView } from '../views/viewRenderer.js';
import { renderHomeView } from '../views/homeView.js';
import { renderLoginView } from '../views/loginView.js';
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
  document.getElementById('login-btn')?.addEventListener('click', () => authService.login('demo@example.com', 'password123'));
  document.getElementById('register-btn')?.addEventListener('click', () => authService.register('demo@example.com', 'password123'));
}

function showToolCatalogPage() {
  renderView(app, renderDashboardView());
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
