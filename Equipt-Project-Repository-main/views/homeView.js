// Landing page view for Equipt.
export function renderHomeView() {
  return `
    <section class="home-hero">
      <div class="home-hero__content">
        <p class="home-eyebrow">Rent smarter. Share faster.</p>
        <h1>Equipt</h1>
        <h2>Share Tools. Earn Income. Get the Job Done.</h2>
        <p class="home-subtext">
          Join a local network of people sharing trusted tools, earning money from idle equipment, and getting projects done faster.
        </p>
        <div class="home-actions">
          <a class="home-btn home-btn--primary" href="#login">Log In</a>
          <a class="home-btn home-btn--secondary" href="#tool-catalog">Tool Catalog</a>
        </div>
      </div>

      <div class="home-visual" aria-label="Equipt highlight illustration">
        <div class="home-visual__shape home-visual__shape--yellow"></div>
        <div class="home-visual__shape home-visual__shape--green"></div>
        <div class="home-visual__shape home-visual__shape--navy"></div>
        <div class="home-visual__badge">
          <span>🔧</span>
          <span>🪛</span>
          <span>💵</span>
          <span>✓</span>
        </div>
        <div class="home-visual__tool home-visual__tool--drill"></div>
        <div class="home-visual__tool home-visual__tool--hammer"></div>
        <div class="home-visual__person"></div>
      </div>
    </section>
  `;
}
