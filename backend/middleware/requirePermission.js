const RoleFactory = require('../roles/RoleFactory');

const requirePermission = (permission) => (req, res, next) => {
    const role = RoleFactory.create(req.user && req.user.role);
    if (!role || !role.can(req.user, permission)) {
        return res.status(403).json({
            message: `Not permitted. This action requires the ${permission} permission.`
        });
    }
    next();
};

module.exports = requirePermission;
