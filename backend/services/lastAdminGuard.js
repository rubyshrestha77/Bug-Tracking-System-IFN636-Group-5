class LastAdminError extends Error {
  constructor() {
    super('Cannot deactivate the last active admin');
    this.name = 'LastAdminError';
    this.status = 409;
  }
}

function assertNotLastActiveAdmin(target, activeAdminCount, nextIsActive) {
  const removingAdmin = target.role === 'Admin' && target.isActive && nextIsActive === false;
  if (removingAdmin && activeAdminCount <= 1) throw new LastAdminError();
}
module.exports = { assertNotLastActiveAdmin, LastAdminError };