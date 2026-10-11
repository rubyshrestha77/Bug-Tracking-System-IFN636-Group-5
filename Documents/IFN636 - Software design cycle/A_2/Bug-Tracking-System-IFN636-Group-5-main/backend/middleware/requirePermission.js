const RoleFactory = require('../roles/RoleFactory');

const requirePermission = (permission) => (req, res, next) => {
  const role = RoleFactory.create(req.user && req.user.role);
  if (!role || !role.can(req.user, permission)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};
module.exports = requirePermission;