const Role = require('./Role');
const P = require('./permissions');

const ALLOWED = new Set([P.BUG_VIEW, P.USERS_VIEW, P.USERS_MANAGE]);

class AdminRole extends Role {
    constructor() { super('admin'); }
    hasPermission(permission) { return ALLOWED.has(permission); }
}

module.exports = AdminRole;
