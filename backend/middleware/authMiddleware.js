const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user to request (excluding password)
      req.user = await User.findById(decoded.id).select('-password');

      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

// Middleware factory: restrict access to one or more roles.
// Must be used AFTER protect so that req.user is populated.
const requireRole = (...roles) => (req, res, next) => {
  const userRole = req.user?.role ?? 'listener';
  if (!roles.includes(userRole)) {
    return res.status(403).json({
      message: `Forbidden: requires role [${roles.join(' | ')}], you have [${userRole}]`,
    });
  }
  next();
};

module.exports = { protect, requireRole };
