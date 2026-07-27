export function renderProfileView(profile = {}) {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Your name';
  const email = profile.email || 'No email available';
  const phone = profile.phone || 'Not provided';
  const role = profile.role === 'Both'
    ? 'Both (Lender & Renter)'
    : profile.role === 'Lender'
      ? 'Lender'
      : profile.role === 'Renter'
        ? 'Renter'
        : profile.role || 'Renter';
  const joined = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Recently joined';

  return `
    <section class="card">
      <h2>Profile</h2>
      <p>Your account details are shown below.</p>
      <div class="profile-details">
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Role:</strong> ${role}</p>
        <p><strong>Member since:</strong> ${joined}</p>
      </div>

      <div class="profile-form-actions profile-form-actions--top">
        <button type="button" id="go-update-profile-btn" class="primary">Update Profile</button>
        <button type="button" id="logout-btn" class="secondary">Log Out</button>
      </div>
    </section>

    <section class="card">
      <div class="profile-section-header">
        <h3>My Tool Listings</h3>
        <p>Manage the tools you are currently renting out.</p>
      </div>
      <div id="my-listings-shell" class="my-listings-shell"></div>
    </section>

    <section class="card">
      <div class="profile-section-header">
        <h3>My Rentals</h3>
        <p>Track the current status of the tools you have booked.</p>
      </div>
      <div id="my-rentals-shell" class="my-rentals-shell"></div>
    </section>
  `;
}

export function renderProfileUpdateView(profile = {}) {
  const roleOptions = [
    { value: 'Renter', label: 'Renter' },
    { value: 'Lender', label: 'Lender' },
    { value: 'Both', label: 'Both (Lender & Renter)' },
    { value: 'Admin', label: 'Admin' }
  ]
    .map(({ value, label }) => `<option value="${value}" ${profile.role === value ? 'selected' : ''}>${label}</option>`)
    .join('');

  return `
    <section class="card">
      <h2>Update Profile</h2>
      <p>Change your profile details here.</p>

      <form id="profile-update-form" class="profile-form">
        <div class="profile-form-grid">
          <label class="profile-form__field">
            <span>First name</span>
            <input type="text" name="firstName" value="${profile.firstName || ''}" />
          </label>
          <label class="profile-form__field">
            <span>Last name</span>
            <input type="text" name="lastName" value="${profile.lastName || ''}" />
          </label>
          <label class="profile-form__field">
            <span>Email</span>
            <input type="email" name="email" value="${profile.email || ''}" required />
          </label>
          <label class="profile-form__field">
            <span>Phone</span>
            <input type="tel" name="phone" value="${profile.phone || ''}" />
          </label>
          <label class="profile-form__field profile-form__field--full">
            <span>Role</span>
            <select name="role">
              ${roleOptions}
            </select>
          </label>
        </div>
        <div id="profile-status" class="profile-status" hidden></div>
        <div class="profile-form-actions">
          <button type="submit" class="primary">Save Changes</button>
          <button type="button" id="back-to-profile-btn" class="secondary">Back to Profile</button>
        </div>
      </form>
    </section>
  `;
}
