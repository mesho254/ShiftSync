import User from '../models/User.js';

export const getAllUsers = async (req, res) => {
  try {
    const { role, locationId } = req.query;
    const query = {};
    
    if (role) query.role = role;
    if (locationId && req.user.role === 'manager') {
      query.certifiedLocations = locationId;
    }
    
    const users = await User.find(query)
      .populate('certifiedLocations')
      .populate('managedLocations')
      .select('-passwordHash -refreshToken');
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getStaffList = async (req, res) => {
  try {
    // Return basic staff info for swaps - exclude current user
    const users = await User.find({
      role: 'staff',
      _id: { $ne: req.user._id }
    })
      .select('name email skills certifiedLocations')
      .populate('certifiedLocations', 'name');
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('certifiedLocations')
      .populate('managedLocations');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Users can only update themselves unless admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const updates = req.body;
    delete updates.passwordHash;
    delete updates.refreshToken;
    
    // Only admins can change roles
    if (updates.role && req.user.role !== 'admin') {
      delete updates.role;
    }
    
    // Check if availability is being updated
    const availabilityChanged = updates.availability !== undefined;
    
    const user = await User.findByIdAndUpdate(id, updates, { new: true })
      .populate('certifiedLocations')
      .populate('managedLocations');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Notify managers if staff availability changed
    if (availabilityChanged && user.role === 'staff') {
      const { createNotification } = await import('../utils/notifications.js');
      const User = (await import('../models/User.js')).default;
      const managers = await User.find({ role: { $in: ['admin', 'manager'] } });
      
      const io = req.app.get('io');
      for (const manager of managers) {
        await createNotification({
          userId: manager._id,
          category: 'availability_changed',
          title: 'Staff Availability Updated',
          body: `${user.name} has updated their availability`,
          payload: { userId: user._id }
        }, null, io);
      }
    }
    
    res.json(user.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const certifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { locationId } = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.certifiedLocations.includes(locationId)) {
      user.certifiedLocations.push(locationId);
      await user.save();
    }
    
    res.json(user.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
