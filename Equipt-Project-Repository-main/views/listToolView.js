export function renderListToolView() {
  return `
    <section class="list-tool-page">
      <div class="card list-tool-card">
        <div class="list-tool-card__header">
          <p class="list-tool-eyebrow">Share your gear</p>
          <h2>List Your Tool</h2>
          <p class="list-tool-subtext">Create a polished listing with photos, details, and pricing that renters can trust.</p>
          <p class="list-tool-note"><span class="required-mark">*</span> indicates a mandatory field and is required to publish your listing.</p>
        </div>

        <form id="list-tool-form" class="list-tool-form" novalidate>
          <div class="form-field">
            <label for="tool-images">Tool Images <span class="required-mark">*</span></label>
            <label class="image-upload-box" for="tool-images">
              <input id="tool-images" name="toolImages" type="file" accept="image/*" multiple hidden />
              <div class="image-upload-box__content">
                <span class="image-upload-box__plus">+</span>
                <span class="image-upload-box__title">Add Photos</span>
                <span class="image-upload-box__hint">Upload clear photos of your tool.</span>
              </div>
            </label>
            <div id="image-preview-list" class="image-preview-list" aria-live="polite"></div>
          </div>

          <div class="form-field">
            <label for="item-name">Item Name <span class="required-mark">*</span></label>
            <input id="item-name" name="itemName" type="text" placeholder="Example: DeWalt 20V Cordless Drill Kit" required />
          </div>

          <div class="form-field">
            <label for="item-description">Item Description <span class="required-mark">*</span></label>
            <textarea id="item-description" name="itemDescription" rows="6" placeholder="Describe the tool, what is included, how it works, and anything renters should know." required></textarea>
          </div>

          <div class="form-grid">
            <div class="form-field">
              <label for="item-category">Item Category <span class="required-mark">*</span></label>
              <select id="item-category" name="itemCategory" required>
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

              <div id="list-category-checklist" class="category-checklist">
                <p class="category-prompt">Select a main category to view its checklist.</p>

                <div class="subcategory-group" data-category="power-tools">
                  <h4>Power Tools</h4>
                  <div class="subcategory-grid">
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Drills & drivers" /> Drills & drivers</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Saws (circular, miter, table, reciprocating, jig)" /> Saws (circular, miter, table, reciprocating, jig)</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Sanders & grinders" /> Sanders & grinders</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Nail guns / staplers" /> Nail guns / staplers</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Rotary tools" /> Rotary tools</label>
                  </div>
                </div>

                <div class="subcategory-group" data-category="lawn-garden">
                  <h4>Lawn & Garden Equipment</h4>
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
                  <h4>Construction & Heavy Equipment</h4>
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
                  <h4>Automotive Tools</h4>
                  <div class="subcategory-grid">
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Jacks & jack stands" /> Jacks & jack stands</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Diagnostic scanners (OBD)" /> Diagnostic scanners (OBD)</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Engine hoists" /> Engine hoists</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Tire changers/balancers" /> Tire changers/balancers</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Battery chargers/jump starters" /> Battery chargers/jump starters</label>
                  </div>
                </div>

                <div class="subcategory-group" data-category="plumbing">
                  <h4>Plumbing Tools</h4>
                  <div class="subcategory-grid">
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Pipe wrenches & threaders" /> Pipe wrenches & threaders</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Drain snakes/augers" /> Drain snakes/augers</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Pipe cutters" /> Pipe cutters</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Wet/dry vacs" /> Wet/dry vacs</label>
                  </div>
                </div>

                <div class="subcategory-group" data-category="electrical">
                  <h4>Electrical Tools</h4>
                  <div class="subcategory-grid">
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Wire strippers/crimpers" /> Wire strippers/crimpers</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Multimeters" /> Multimeters</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Fish tape" /> Fish tape</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Conduit benders" /> Conduit benders</label>
                  </div>
                </div>

                <div class="subcategory-group" data-category="painting-finishing">
                  <h4>Painting & Finishing</h4>
                  <div class="subcategory-grid">
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Paint sprayers" /> Paint sprayers</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Ladders/scaffolding" /> Ladders/scaffolding</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Wallpaper steamers" /> Wallpaper steamers</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Sanders" /> Sanders</label>
                  </div>
                </div>

                <div class="subcategory-group" data-category="cleaning">
                  <h4>Cleaning Equipment</h4>
                  <div class="subcategory-grid">
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Carpet cleaners" /> Carpet cleaners</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Pressure washers" /> Pressure washers</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Floor buffers/polishers" /> Floor buffers/polishers</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Wet/dry vacuums" /> Wet/dry vacuums</label>
                  </div>
                </div>

                <div class="subcategory-group" data-category="moving-hauling">
                  <h4>Moving & Hauling</h4>
                  <div class="subcategory-grid">
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Dollies & hand trucks" /> Dollies & hand trucks</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Furniture straps/moving blankets" /> Furniture straps/moving blankets</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Trailers/hitches" /> Trailers/hitches</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Appliance dollies" /> Appliance dollies</label>
                  </div>
                </div>

                <div class="subcategory-group" data-category="woodworking">
                  <h4>Woodworking</h4>
                  <div class="subcategory-grid">
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Table saws" /> Table saws</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Routers" /> Routers</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Planers/jointers" /> Planers/jointers</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Lathes" /> Lathes</label>
                  </div>
                </div>

                <div class="subcategory-group" data-category="specialty-seasonal">
                  <h4>Specialty/Seasonal</h4>
                  <div class="subcategory-grid">
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Snow blowers" /> Snow blowers</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Log splitters" /> Log splitters</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Tile saws" /> Tile saws</label>
                    <label class="filter-option"><input type="checkbox" name="subcategory" value="Welding equipment" /> Welding equipment</label>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-field">
              <label for="item-location">Item Location <span class="required-mark">*</span></label>
              <input id="item-location" name="itemLocation" type="text" inputmode="numeric" pattern="[0-9]{5}" placeholder="Enter ZIP code" required />
            </div>
          </div>

          <div class="form-grid">
            <div class="form-field">
              <label for="condition">Condition <span class="required-mark">*</span></label>
              <select id="condition" name="condition" required>
                <option value="">Select condition</option>
                <option value="New">New</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Well Used">Well Used</option>
              </select>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-field">
              <label for="rental-price">Daily rate (USD) <span class="required-mark">*</span></label>
              <div class="price-input-row">
                <span class="price-currency">$</span>
                <input id="rental-price" name="rentalPrice" type="number" min="1" step="0.01" placeholder="25" required />
                <select id="rental-period" name="rentalPeriod">
                  <option value="hour">Per hour</option>
                  <option value="day">Per day</option>
                  <option value="week">Per week</option>
                </select>
              </div>
            </div>
          </div>

          <div class="listing-actions">
            <button id="save-draft-btn" class="secondary" type="button">Save Draft</button>
            <button id="publish-listing-btn" class="primary" type="submit" disabled>Publish Listing</button>
          </div>

          <div id="listing-status" class="form-status" role="status" aria-live="polite" hidden></div>
        </form>
      </div>
    </section>
  `;
}
