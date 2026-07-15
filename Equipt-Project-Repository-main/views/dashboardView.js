// Tool catalog page.
export function renderDashboardView() {
  return `
    <section class="card catalog-card">
      <div class="catalog-header">
        <div>
          <p class="catalog-eyebrow">Nearby rentals</p>
          <h2>Browse Tools</h2>
          <p class="catalog-subtext">Find tools available to rent near you.</p>
        </div>
      </div>

      <div class="catalog-toolbar">
        <div class="catalog-toolbar__main">
          <input id="tool-search" class="search-input" type="text" placeholder="Search for drills, ladders, pressure washers…" />
          <input id="tool-location" class="search-input" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="ZIP code" />
          <button id="search-tools" class="primary" type="button">Search</button>
        </div>
        <div class="catalog-toolbar__secondary">
          <select id="sort-select" class="category-select">
            <option value="recommended">Sort: Recommended</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="newest">Newest Listings</option>
          </select>
          <button id="toggle-filters" class="secondary catalog-filter-toggle" type="button">⚲ Filter</button>
        </div>
      </div>

      <div id="catalog-feedback" class="catalog-feedback" role="status" aria-live="polite" hidden></div>

      <div id="optional-filters" class="optional-filters hidden">
        <div class="filter-header-row">
          <h3>Refine your search</h3>
          <div class="filter-actions">
            <button id="apply-filters" class="primary" type="button">Apply Filters</button>
            <button id="clear-filters" class="secondary" type="button">Clear All</button>
          </div>
        </div>

        <div class="filter-section">
          <h4>Category</h4>
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
              <h5>Power Tools</h5>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Drills & drivers" /> Drills & drivers</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Saws (circular, miter, table, reciprocating, jig)" /> Saws (circular, miter, table, reciprocating, jig)</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Sanders & grinders" /> Sanders & grinders</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Nail guns / staplers" /> Nail guns / staplers</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Rotary tools" /> Rotary tools</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="lawn-garden">
              <h5>Lawn & Garden Equipment</h5>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Lawn mowers (push, riding, robotic)" /> Lawn mowers (push, riding, robotic)</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Leaf blowers" /> Leaf blowers</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Hedge trimmers & pole saws" /> Hedge trimmers & pole saws</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Tillers & cultivators" /> Tillers & cultivators</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Aerators & dethatchers" /> Aerators & dethatchers</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Chainsaws" /> Chainsaws</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Pressure washers" /> Pressure washers</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="construction-heavy">
              <h5>Construction & Heavy Equipment</h5>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Concrete mixers" /> Concrete mixers</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Scaffolding" /> Scaffolding</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Compactors/plate tampers" /> Compactors/plate tampers</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Generators" /> Generators</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Ladders & lifts" /> Ladders & lifts</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Jackhammers" /> Jackhammers</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="automotive">
              <h5>Automotive Tools</h5>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Jacks & jack stands" /> Jacks & jack stands</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Diagnostic scanners (OBD)" /> Diagnostic scanners (OBD)</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Engine hoists" /> Engine hoists</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Tire changers/balancers" /> Tire changers/balancers</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Battery chargers/jump starters" /> Battery chargers/jump starters</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="plumbing">
              <h5>Plumbing Tools</h5>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Pipe wrenches & threaders" /> Pipe wrenches & threaders</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Drain snakes/augers" /> Drain snakes/augers</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Pipe cutters" /> Pipe cutters</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Wet/dry vacs" /> Wet/dry vacs</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="electrical">
              <h5>Electrical Tools</h5>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Wire strippers/crimpers" /> Wire strippers/crimpers</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Multimeters" /> Multimeters</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Fish tape" /> Fish tape</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Conduit benders" /> Conduit benders</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="painting-finishing">
              <h5>Painting & Finishing</h5>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Paint sprayers" /> Paint sprayers</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Ladders/scaffolding" /> Ladders/scaffolding</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Wallpaper steamers" /> Wallpaper steamers</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Sanders" /> Sanders</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="cleaning">
              <h5>Cleaning Equipment</h5>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Carpet cleaners" /> Carpet cleaners</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Pressure washers" /> Pressure washers</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Floor buffers/polishers" /> Floor buffers/polishers</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Wet/dry vacuums" /> Wet/dry vacuums</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="moving-hauling">
              <h5>Moving & Hauling</h5>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Dollies & hand trucks" /> Dollies & hand trucks</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Furniture straps/moving blankets" /> Furniture straps/moving blankets</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Trailers/hitches" /> Trailers/hitches</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Appliance dollies" /> Appliance dollies</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="woodworking">
              <h5>Woodworking</h5>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Table saws" /> Table saws</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Routers" /> Routers</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Planers/jointers" /> Planers/jointers</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Lathes" /> Lathes</label>
              </div>
            </div>

            <div class="subcategory-group" data-category="specialty-seasonal">
              <h5>Specialty/Seasonal</h5>
              <div class="subcategory-grid">
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Snow blowers" /> Snow blowers</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Log splitters" /> Log splitters</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Tile saws" /> Tile saws</label>
                <label class="filter-option"><input type="checkbox" name="subcategory" value="Welding equipment" /> Welding equipment</label>
              </div>
            </div>
          </div>
        </div>

        <div class="filter-section">
          <h4>Price</h4>
          <div class="price-range-display" id="price-range-display">$0 – $500 per day</div>
          <div class="price-range-inputs">
            <div class="form-field form-field--inline">
              <label for="price-min-input">Min daily rate</label>
              <input id="price-min-input" class="search-input" type="number" min="0" max="500" step="5" value="0" />
            </div>
            <div class="form-field form-field--inline">
              <label for="price-max-input">Max daily rate</label>
              <input id="price-max-input" class="search-input" type="number" min="0" max="500" step="5" value="500" />
            </div>
          </div>
          <div class="range-slider-shell">
            <input id="rate-min" class="rate-slider" type="range" min="0" max="500" step="5" value="0" />
            <input id="rate-max" class="rate-slider" type="range" min="0" max="500" step="5" value="500" />
          </div>
        </div>

        <div class="filter-section">
          <h4>Location</h4>
          <label class="filter-label" for="zip-code-input">ZIP code</label>
          <input id="zip-code-input" class="search-input" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="Enter ZIP code" />

          <label class="filter-label" for="distance-select">Distance</label>
          <select id="distance-select" class="category-select">
            <option value="5">5 miles</option>
            <option value="10">10 miles</option>
            <option value="25">25 miles</option>
            <option value="50">50 miles</option>
            <option value="100">100 miles</option>
          </select>
        </div>

        <div class="filter-section">
          <h4>Condition</h4>
          <div class="condition-group">
            <label class="filter-option"><input type="checkbox" name="condition" value="New" /> New</label>
            <label class="filter-option"><input type="checkbox" name="condition" value="Like New" /> Like New</label>
            <label class="filter-option"><input type="checkbox" name="condition" value="Good" /> Good</label>
            <label class="filter-option"><input type="checkbox" name="condition" value="Fair" /> Fair</label>
            <label class="filter-option"><input type="checkbox" name="condition" value="Well Used" /> Well Used</label>
          </div>
        </div>

        <div class="filter-section">
          <h4>Availability</h4>
          <label class="toggle-row">
            <input id="available-now" type="checkbox" />
            <span>Available now</span>
          </label>
          <div class="availability-dates">
            <div class="form-field form-field--inline">
              <label for="rental-start">Start date</label>
              <input id="rental-start" class="search-input" type="date" />
            </div>
            <div class="form-field form-field--inline">
              <label for="rental-end">End date</label>
              <input id="rental-end" class="search-input" type="date" />
            </div>
          </div>
        </div>
      </div>

      <div class="catalog-results">
        <div class="catalog-results__empty">Browse available tools or refine your filters to see results.</div>
      </div>
    </section>
  `;
}
