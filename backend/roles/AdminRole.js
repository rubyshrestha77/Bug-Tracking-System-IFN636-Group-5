const Role = require('./Role');
const P = require('./permissions');

const ALLOWED = new Set([P.BUG_VIEW, P.USERS_VIEW, P.USERS_MANAGE, P.ACTIVITY_LOG_VIEW]);
class AdminRole extends Role {
    constructor() { super('admin'); }
    hasPermission(permission) { return ALLOWED.has(permission); }
}

module.exports = AdminRole;
