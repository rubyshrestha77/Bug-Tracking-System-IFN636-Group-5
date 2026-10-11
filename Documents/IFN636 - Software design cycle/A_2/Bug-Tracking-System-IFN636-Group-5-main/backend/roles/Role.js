class Role {
  constructor(name) {
    if (new.target === Role) throw new Error('Role is abstract');
    this.name = name;
  }

  // TEMPLATE METHOD: fixed steps, one overridable hook
  can(user, permission) {
    if (!this.isAccountUsable(user)) return false; // shared step 1
    if (user.role !== this.name) return false;     // shared step 2
    return this.hasPermission(permission);         // step 3: subclass hook
  }

  isAccountUsable(user) {
    return Boolean(user) && user.isActive !== false;
  }

  hasPermission() {
    throw new Error('hasPermission() must be overridden');
  }
}
module.exports = Role;