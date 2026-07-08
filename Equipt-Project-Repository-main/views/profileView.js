export function renderProfileView(profile = {}) {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Your name';
  const email = profile.email || 'No email available';
  const phone = profile.phone || 'Not provided';
  const role = profile.role || 'Member';
  const joined = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Recently joined';

  return `
    <section class="card">
      <h2>Profile</h2>
      <p>Here is the account information currently linked to your sign-in.</p>
      <div class="profile-details">
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Role:</strong> ${role}</p>
        <p><strong>Member since:</strong> ${joined}</p>
      </div>
      <button id="logout-btn" class="secondary">Log Out</button>
    </section>
  `;
}
