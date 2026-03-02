import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash -refreshToken');
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: `Required role: ${roles.join(' or ')}`
      });
    }
    
    next();
  };
};

export const authorizeLocation = async (req, res, next) => {
  try {
    const locationId = req.params.locationId || req.body.locationId || req.query.locationId;
    
    if (!locationId) {
      return next();
    }
    
    // Admins can access all locations
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Managers can only access their managed locations
    if (req.user.role === 'manager') {
      const hasAccess = req.user.managedLocations.some(
        loc => loc.toString() === locationId.toString()
      );
      
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'You do not have access to this location'
        });
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};
