const Role = require('../Role');
const P = require('../permissions');

// Read-only auditor: can view users, nothing else.
class AuditorRole extends Role {
    constructor() { super('auditor'); }
    hasPermission(permission) { return permission === P.USERS_VIEW; }
}

module.exports = AuditorRole;
