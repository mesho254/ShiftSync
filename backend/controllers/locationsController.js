import Location from '../models/Location.js';
import { createAuditLog } from '../utils/audit.js';

export const getAllLocations = async (req, res) => {
  try {
    const locations = await Location.find();
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createLocation = async (req, res) => {
  try {
    const location = new Location(req.body);
    await location.save();
    
    await createAuditLog({
      actorId: req.user._id,
      action: 'location.create',
      targetType: 'Location',
      targetId: location._id,
      after: location.toObject()
    });
    
    res.status(201).json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateLocation = async (req, res) => {
  try {
    const before = await Location.findById(req.params.id);
    const location = await Location.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    await createAuditLog({
      actorId: req.user._id,
      action: 'location.update',
      targetType: 'Location',
      targetId: location._id,
      before: before.toObject(),
      after: location.toObject()
    });
    
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteLocation = async (req, res) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    await createAuditLog({
      actorId: req.user._id,
      action: 'location.delete',
      targetType: 'Location',
      targetId: location._id,
      before: location.toObject()
    });
    
    res.json({ message: 'Location deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
