const jwt = require('jsonwebtoken');
const User = require('../models/User');
const requirePermission = require('./requirePermission');

const requireAuth = async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    let user;
    try {
        const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
        user = await User.findById(decoded.id).select('-password');
    } catch (error) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }

    if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
    }
    if (user.isActive === false) {
        return res.status(401).json({ message: 'Account deactivated' });
    }

    req.user = user;
    next();
};

module.exports = { requireAuth, requirePermission };
