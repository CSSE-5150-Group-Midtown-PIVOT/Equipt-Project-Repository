// Placeholder view for the tool catalog page.
export function renderDashboardView() {
  return `
    <section class="card catalog-card">
      <h2>Tool Catalog</h2>
      <p>Search for a tool to rent and narrow your results with the available filters.</p>

      <label class="search-label" for="tool-search">Search tools</label>
      <input id="tool-search" class="search-input" type="text" placeholder="Type keywords like drill, ladder, paint..." />

      <div class="filter-section">
        <h3>Category</h3>
        <label class="filter-option"><input type="checkbox" checked /> Construction</label>
        <label class="filter-option"><input type="checkbox" checked /> Gardening</label>
        <label class="filter-option"><input type="checkbox" checked /> Cleaning</label>
        <label class="filter-option"><input type="checkbox" checked /> Party</label>
      </div>

      <div class="filter-section">
        <h3>Rental Rate</h3>
        <label class="filter-option"><input type="checkbox" checked /> Under $20</label>
        <label class="filter-option"><input type="checkbox" checked /> $20 - $50</label>
        <label class="filter-option"><input type="checkbox" checked /> Over $50</label>
      </div>

      <div class="filter-section">
        <h3>Location</h3>
        <label class="filter-option"><input type="checkbox" checked /> Downtown</label>
        <label class="filter-option"><input type="checkbox" checked /> Uptown</label>
        <label class="filter-option"><input type="checkbox" checked /> Westside</label>
        <label class="filter-option"><input type="checkbox" checked /> Online</label>
      </div>

      <button id="create-record">Create Sample Record</button>
    </section>
  `;
}
