const Role = require('../Role');
const P = require('../permissions');

class AuditorRole extends Role {
  constructor() { super('Auditor'); }
  hasPermission(permission) { return permission === P.USERS_VIEW; }
}
module.exports = AuditorRole;