const Role = require('./Role');
const P = require('./permissions');
const ALLOWED = new Set([P.USERS_VIEW, P.USERS_MANAGE]);

class AdminRole extends Role {
  constructor() { super('Admin'); }
  hasPermission(permission) { return ALLOWED.has(permission); }
}
module.exports = AdminRole;