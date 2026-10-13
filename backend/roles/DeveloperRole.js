const Role = require('./Role');
const P = require('./permissions');

const ALLOWED = new Set([P.BUG_VIEW, P.BUG_ASSIGN, P.BUG_START, P.BUG_RESOLVE]);

class DeveloperRole extends Role {
    constructor() { super('developer'); }
    get selfRegistrable() { return true; }
    hasPermission(permission) { return ALLOWED.has(permission); }
}

module.exports = DeveloperRole;
