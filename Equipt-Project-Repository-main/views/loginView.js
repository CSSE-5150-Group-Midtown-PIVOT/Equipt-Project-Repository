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
    <section class="card">
      <h2>Log In</h2>
      <form id="login-form">
        <label class="form-field">
          Email
          <input type="email" id="email" placeholder="you@example.com" required />
        </label>
        <label class="form-field">
          Password
          <input type="password" id="password" placeholder="Enter password" required />
        </label>
        <button type="submit">Submit</button>
      </form>
      <button id="back-btn" class="secondary">Back</button>
    </section>
  `;
}
