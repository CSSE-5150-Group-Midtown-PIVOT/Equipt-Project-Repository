function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderProfileView(profile = {}) {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Your name';
  const email = profile.email || 'No email available';
  const phone = profile.phone || 'Not provided';
  const profilePhoto = profile.profilePhoto || '';
  const initials = [profile.firstName, profile.lastName]
    .map((value) => String(value || '').trim().charAt(0).toUpperCase())
    .filter(Boolean)
    .join('')
    .slice(0, 2) || 'U';
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
      <div class="profile-card-layout">
        <div class="profile-card-content">
          <h2>Profile</h2>
          <p>Your account details are shown below.</p>
          <div class="profile-details">
            <p><strong>Name:</strong> ${fullName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Role:</strong> ${role}</p>
            <p><strong>Member since:</strong> ${joined}</p>
          </div>
        </div>
        <div class="profile-photo-panel">
          <div class="profile-photo-bubble" id="profile-photo-bubble" aria-label="Profile picture">
            ${profilePhoto
              ? `<img src="${escapeHtml(profilePhoto)}" alt="${escapeHtml(fullName)} profile photo" />`
    : `<span>${initials}</span>`}
          </div>
          <input id="profile-photo-input" name="profilePhoto" type="file" accept="image/*" hidden />
          <button type="button" id="change-profile-photo-btn" class="secondary">${profilePhoto ? 'Change Photo' : 'Upload Photo'}</button>
          <p id="profile-photo-status" class="profile-photo-status" hidden></p>
        </div>
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
        <h3>Renter Reservations</h3>
        <p>Track your upcoming rentals, cancellations, and reservation history.</p>
      </div>
      <div id="reservation-status" class="form-status" hidden></div>
      <div id="upcoming-rentals-shell" class="reservation-shell"></div>
      <div id="history-rentals-shell" class="reservation-shell"></div>
    </section>

    <section class="card">
      <div class="profile-section-header">
        <h3>Booking Requests</h3>
        <p>Review incoming requests for your tools and manage pending or confirmed bookings.</p>
      </div>
      <div id="booking-requests-shell" class="booking-requests-shell"></div>
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
