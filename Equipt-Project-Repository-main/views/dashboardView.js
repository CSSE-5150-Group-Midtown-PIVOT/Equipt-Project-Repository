// Placeholder view for the tool catalog page.
export function renderDashboardView() {
  return `
    <section class="card catalog-card">
      <h2>Tool Catalog</h2>
      <p>Search for a tool to rent and narrow your results with the available filters.</p>

      <label class="search-label" for="tool-search">Search tools</label>
      <div class="search-row">
        <input id="tool-search" class="search-input" type="text" placeholder="Type keywords like drill, ladder, paint..." />
        <button id="toggle-filters" class="secondary" type="button">Filter</button>
      </div>

      <div id="optional-filters" class="optional-filters hidden">
        <p class="filters-help">Optional filters</p>

        <div class="filter-section">
          <h3>Category</h3>
          <label class="filter-label" for="main-category-select">Main category</label>
          <select id="main-category-select" class="category-select">
            <option value="">Select a category</option>
            <option value="power-tools">Power Tools</option>
            <option value="lawn-garden">Lawn & Garden Equipment</option>
            <option value="construction-heavy">Construction & Heavy Equipment</option>
            <option value="automotive">Automotive Tools</option>
            <option value="plumbing">Plumbing Tools</option>
            <option value="electrical">Electrical Tools</option>
            <option value="painting-finishing">Painting & Finishing</option>
            <option value="cleaning">Cleaning Equipment</option>
            <option value="moving-hauling">Moving & Hauling</option>
            <option value="woodworking">Woodworking</option>
            <option value="specialty-seasonal">Specialty/Seasonal</option>
          </select>

          <div id="category-checklist" class="category-checklist">
            <p class="category-prompt">Select a main category to view its checklist.</p>

            <div class="subcategory-group" data-category="power-tools">
              <h4>Power Tools</h4>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" /> Drills & drivers</label>
                <label class="filter-option"><input type="checkbox" /> Saws (circular, miter, table, reciprocating, jig)</label>
                <label class="filter-option"><input type="checkbox" /> Sanders & grinders</label>
                <label class="filter-option"><input type="checkbox" /> Nail guns / staplers</label>
                <label class="filter-option"><input type="checkbox" /> Rotary tools</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="lawn-garden">
              <h4>Lawn & Garden Equipment</h4>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" /> Lawn mowers (push, riding, robotic)</label>
                <label class="filter-option"><input type="checkbox" /> Leaf blowers</label>
                <label class="filter-option"><input type="checkbox" /> Hedge trimmers & pole saws</label>
                <label class="filter-option"><input type="checkbox" /> Tillers & cultivators</label>
                <label class="filter-option"><input type="checkbox" /> Aerators & dethatchers</label>
                <label class="filter-option"><input type="checkbox" /> Chainsaws</label>
                <label class="filter-option"><input type="checkbox" /> Pressure washers</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="construction-heavy">
              <h4>Construction & Heavy Equipment</h4>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" /> Concrete mixers</label>
                <label class="filter-option"><input type="checkbox" /> Scaffolding</label>
                <label class="filter-option"><input type="checkbox" /> Compactors/plate tampers</label>
                <label class="filter-option"><input type="checkbox" /> Generators</label>
                <label class="filter-option"><input type="checkbox" /> Ladders & lifts</label>
                <label class="filter-option"><input type="checkbox" /> Jackhammers</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="automotive">
              <h4>Automotive Tools</h4>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" /> Jacks & jack stands</label>
                <label class="filter-option"><input type="checkbox" /> Diagnostic scanners (OBD)</label>
                <label class="filter-option"><input type="checkbox" /> Engine hoists</label>
                <label class="filter-option"><input type="checkbox" /> Tire changers/balancers</label>
                <label class="filter-option"><input type="checkbox" /> Battery chargers/jump starters</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="plumbing">
              <h4>Plumbing Tools</h4>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" /> Pipe wrenches & threaders</label>
                <label class="filter-option"><input type="checkbox" /> Drain snakes/augers</label>
                <label class="filter-option"><input type="checkbox" /> Pipe cutters</label>
                <label class="filter-option"><input type="checkbox" /> Wet/dry vacs</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="electrical">
              <h4>Electrical Tools</h4>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" /> Wire strippers/crimpers</label>
                <label class="filter-option"><input type="checkbox" /> Multimeters</label>
                <label class="filter-option"><input type="checkbox" /> Fish tape</label>
                <label class="filter-option"><input type="checkbox" /> Conduit benders</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="painting-finishing">
              <h4>Painting & Finishing</h4>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" /> Paint sprayers</label>
                <label class="filter-option"><input type="checkbox" /> Ladders/scaffolding</label>
                <label class="filter-option"><input type="checkbox" /> Wallpaper steamers</label>
                <label class="filter-option"><input type="checkbox" /> Sanders</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="cleaning">
              <h4>Cleaning Equipment</h4>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" /> Carpet cleaners</label>
                <label class="filter-option"><input type="checkbox" /> Pressure washers</label>
                <label class="filter-option"><input type="checkbox" /> Floor buffers/polishers</label>
                <label class="filter-option"><input type="checkbox" /> Wet/dry vacuums</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="moving-hauling">
              <h4>Moving & Hauling</h4>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" /> Dollies & hand trucks</label>
                <label class="filter-option"><input type="checkbox" /> Furniture straps/moving blankets</label>
                <label class="filter-option"><input type="checkbox" /> Trailers/hitches</label>
                <label class="filter-option"><input type="checkbox" /> Appliance dollies</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="woodworking">
              <h4>Woodworking</h4>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" /> Table saws</label>
                <label class="filter-option"><input type="checkbox" /> Routers</label>
                <label class="filter-option"><input type="checkbox" /> Planers/jointers</label>
                <label class="filter-option"><input type="checkbox" /> Lathes</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="specialty-seasonal">
              <h4>Specialty/Seasonal</h4>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" /> Snow blowers</label>
                <label class="filter-option"><input type="checkbox" /> Log splitters</label>
                <label class="filter-option"><input type="checkbox" /> Tile saws</label>
                <label class="filter-option"><input type="checkbox" /> Welding equipment</label>
              </div>
            </div>
          </div>
        </div>

        <div class="filter-section">
          <h3>Rental Rate</h3>
          <div class="rate-range">
            <div class="rate-range-labels">
              <span id="rate-min-value">$5</span>
              <span id="rate-max-value">$500</span>
            </div>
            <div class="rate-range-inputs">
              <input id="rate-min" class="rate-slider" type="range" min="0" max="550" step="5" value="5" />
              <input id="rate-max" class="rate-slider" type="range" min="0" max="550" step="5" value="500" />
            </div>
            <p class="rate-caption">Daily rate range</p>
          </div>
        </div>

        <div class="filter-section">
          <h3>Location</h3>
          <label class="filter-label" for="zip-code-input">ZIP code</label>
          <input id="zip-code-input" class="search-input" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="Enter ZIP code" />

          <label class="filter-label" for="distance-select">Miles from ZIP code</label>
          <select id="distance-select" class="category-select">
            <option value="5">5 miles</option>
            <option value="10">10 miles</option>
            <option value="25">25 miles</option>
            <option value="50">50 miles</option>
            <option value="100">100 miles</option>
          </select>
        </div>
      </div>

      <button id="create-record">Search</button>
    </section>
  `;
}
