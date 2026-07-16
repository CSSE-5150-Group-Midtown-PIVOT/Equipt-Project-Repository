// Landing page view for Equipt.
export function renderHomeView(isLoggedIn = false, userRole = '') {
  const normalizedRole = String(userRole || '').trim().toLowerCase();
  const isRenter = normalizedRole === 'renter';

  return `
    <section class="home-hero minimal-hero">
      <div class="minimal-hero__bg" aria-hidden="true"></div>
      <div class="minimal-hero__overlay" aria-hidden="true"></div>
      <div class="minimal-hero__inner">
        <img src="assets/equipt-hero.png" alt="Equipt logo" class="minimal-hero__logo" onerror="this.style.display='none'" />
        <div class="home-actions minimal-hero__actions">
          ${isLoggedIn ? '' : '<a class="home-btn home-btn--primary" href="#login">Log In</a>'}
          <a class="home-btn home-btn--secondary" href="#tool-catalog">Browse Tools</a>
          ${isLoggedIn && isRenter ? '' : '<a class="home-btn home-btn--accent" href="#list-tool">List Tools</a>'}
        </div>
      </div>
    </section>
  `;
}
