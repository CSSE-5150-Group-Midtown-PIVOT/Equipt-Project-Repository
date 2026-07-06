// UserModel stores the shape of user-related data used in the app.
// Add fields here as the project grows, such as name, email, and role.
export class UserModel {
  constructor({ uid = '', email = '', displayName = '' } = {}) {
    this.uid = uid;
    this.email = email;
    this.displayName = displayName;
  }
}
