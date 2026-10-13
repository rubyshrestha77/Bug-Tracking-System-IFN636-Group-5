const Role = require('./Role');
const P = require('./permissions');

const ALLOWED = new Set([P.BUG_VIEW, P.BUG_REPORT, P.BUG_VERIFY, P.BUG_REOPEN, P.BUG_DELETE]);

class ReporterRole extends Role {
    constructor() { super('reporter'); }
    get selfRegistrable() { return true; }
    hasPermission(permission) { return ALLOWED.has(permission); }
}

module.exports = ReporterRole;
