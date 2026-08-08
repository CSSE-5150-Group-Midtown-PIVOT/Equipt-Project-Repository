// Placeholder view for the login entry page.
export function renderLoginView() {
  return `
    <section class="card">
      <h2>Login</h2>
      <p>Press log in to continue to your account or register to create one</p>
      <button id="login-btn">Log In</button>
      <button id="register-btn" class="secondary">Register</button>
    </section>
  `;
}

// Placeholder login form page with email and password fields.
export function renderLoginFormView() {
  return `
    <section class="login-hero">
      <div class="login-hero__bg" aria-hidden="true"></div>
      <div class="login-hero__overlay" aria-hidden="true"></div>
      <div class="card login-card">
        <div class="login-card__header">
          <h2>Log In</h2>
          <button id="register-from-login" class="secondary">Register</button>
        </div>
        <p class="login-card__subtext">Welcome back. Sign in to manage your rentals and listings.</p>
        <form id="login-form" class="login-form">
          <div id="login-error" class="form-error" role="alert" aria-live="polite" hidden></div>
          <div id="login-success" class="form-success" role="status" aria-live="polite" hidden></div>
          <label class="form-field">
            Email
            <input type="email" id="email" placeholder="you@example.com" required />
          </label>
          <label class="form-field">
            Password
            <div class="password-input-wrap">
              <input type="password" id="password" placeholder="Enter password" required />
              <button type="button" id="login-password-toggle" class="password-toggle" aria-label="Show password" aria-pressed="false" title="Show password">
                <span class="password-toggle-icon password-toggle-icon--open" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path d="M1.5 12s3.8-6 10.5-6 10.5 6 10.5 6-3.8 6-10.5 6-10.5-6-10.5-6z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </span>
                <span class="password-toggle-icon password-toggle-icon--closed is-hidden" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path d="M1.5 12s3.8-6 10.5-6c2.3 0 4.2.7 5.8 1.7"></path>
                    <path d="M22.5 12s-3.8 6-10.5 6c-2.3 0-4.2-.7-5.8-1.7"></path>
                    <path d="M3 3l18 18"></path>
                  </svg>
                </span>
              </button>
            </div>
          </label>
          <div class="login-actions">
            <button type="submit">Submit</button>
            <button id="back-btn" class="secondary">Back</button>
          </div>
        </form>
      </div>
    </section>
  `;
}

export function renderRegistrationView() {
  return `
    <section class="registration-shell">
      <div class="registration-visual" aria-label="Background image of tools for registration">
        <div class="registration-visual__copy">
          <div class="registration-visual__badge">Trusted tools. Shared locally.</div>
          <h3>Join your local tool-sharing network</h3>
          <p>List your equipment or reserve what you need, all in one place.</p>
        </div>
      </div>

      <div class="card registration-card">
        <p class="registration-eyebrow">Join Equipt</p>
        <h2>Create your account</h2>
        <p class="registration-subtext">Rent tools confidently or earn by lending your equipment to neighbors.</p>
        <form id="registration-form" class="registration-form">
          <div class="registration-grid">
            <label class="form-field">
              First Name
              <input type="text" name="firstName" placeholder="First name" required />
            </label>
            <label class="form-field">
              Last Name
              <input type="text" name="lastName" placeholder="Last name" required />
            </label>
          </div>
          <label class="form-field">
            Email
            <input type="email" name="email" placeholder="you@example.com" required />
          </label>
          <label class="form-field">
            Phone Number
            <input type="tel" id="phone" name="phone" placeholder="+1 555 123 4567" required />
            <small>Use international format such as +1 555 123 4567.</small>
          </label>
          <div class="form-field">
            <div class="registration-actions">
              <button id="send-phone-code" type="button">Send verification code</button>
            </div>
            <input type="text" id="phone-code" name="phoneCode" placeholder="Enter 6-digit code" inputmode="numeric" autocomplete="one-time-code" />
            <div class="registration-actions" style="margin-top: 0.5rem;">
              <button id="verify-phone-code" type="button" class="secondary">Verify code</button>
            </div>
            <div id="phone-verification-status" class="form-success" role="status" aria-live="polite" hidden></div>
            <div id="phone-recaptcha-container"></div>
          </div>
          <label class="form-field">
            Password
            <div class="password-input-wrap">
              <input type="password" id="registration-password" name="password" placeholder="Create a password" required />
              <button type="button" id="registration-password-toggle" class="password-toggle" aria-label="Show password" aria-pressed="false" title="Show password">
                <span class="password-toggle-icon password-toggle-icon--open" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path d="M1.5 12s3.8-6 10.5-6 10.5 6 10.5 6-3.8 6-10.5 6-10.5-6-10.5-6z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </span>
                <span class="password-toggle-icon password-toggle-icon--closed is-hidden" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path d="M1.5 12s3.8-6 10.5-6c2.3 0 4.2.7 5.8 1.7"></path>
                    <path d="M22.5 12s-3.8 6-10.5 6c-2.3 0-4.2-.7-5.8-1.7"></path>
                    <path d="M3 3l18 18"></path>
                  </svg>
                </span>
              </button>
            </div>
          </label>
          <label class="form-field">
            Confirm Password
            <div class="password-input-wrap">
              <input type="password" id="registration-confirm-password" name="confirmPassword" placeholder="Re-enter password" required />
              <button type="button" id="registration-confirm-password-toggle" class="password-toggle" aria-label="Show password" aria-pressed="false" title="Show password">
                <span class="password-toggle-icon password-toggle-icon--open" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path d="M1.5 12s3.8-6 10.5-6 10.5 6 10.5 6-3.8 6-10.5 6-10.5-6-10.5-6z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </span>
                <span class="password-toggle-icon password-toggle-icon--closed is-hidden" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path d="M1.5 12s3.8-6 10.5-6c2.3 0 4.2.7 5.8 1.7"></path>
                    <path d="M22.5 12s-3.8 6-10.5 6c-2.3 0-4.2-.7-5.8-1.7"></path>
                    <path d="M3 3l18 18"></path>
                  </svg>
                </span>
              </button>
            </div>
          </label>
          <div id="registration-password-error" class="form-error" role="alert" aria-live="polite" hidden></div>
          <label class="form-field">
            Role
            <select name="role" required>
              <option value="">Select a role</option>
              <option value="Lender">Lender</option>
              <option value="Renter">Renter</option>
              <option value="Both">Both (Lender &amp; Renter)</option>
            </select>
          </label>
          <div class="registration-actions">
            <button type="submit">Create Account</button>
            <button id="back-to-login" class="secondary" type="button">Back</button>
          </div>
        </form>
      </div>
    </section>
  `;
}
