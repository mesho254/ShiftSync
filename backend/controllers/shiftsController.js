import mongoose from 'mongoose';
import Shift from '../models/Shift.js';
import { checkConstraints, getSuggestions } from '../utils/constraints.js';
import { createAuditLog } from '../utils/audit.js';
import { createNotification } from '../utils/notifications.js';
import { emitToUser, emitToLocation } from '../config/socket.js';

export async function getShifts(req, res) {
  try {
    const { locationId, dateFrom, dateTo, published } = req.query;
    const query = {};
    
    if (locationId) query.locationId = locationId;
    if (published !== undefined) query.published = published === 'true';
    if (dateFrom || dateTo) {
      query.startUtc = {};
      if (dateFrom) query.startUtc.$gte = new Date(dateFrom);
      if (dateTo) query.startUtc.$lte = new Date(dateTo);
    }
    
    const shifts = await Shift.find(query)
      .populate('locationId')
      .populate('assigned', 'name email avatarUrl skills')
      .populate('createdBy', 'name')
      .sort({ startUtc: 1 });
    
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function createShift(req, res) {
  try {
    const shift = new Shift({
      ...req.body,
      createdBy: req.user._id
    });
    
    await shift.save();
    await shift.populate('locationId');
    
    await createAuditLog({
      actorId: req.user._id,
      action: 'shift.create',
      targetType: 'Shift',
      targetId: shift._id,
      after: shift.toObject()
    });
    
    const io = req.app.get('io');
    emitToLocation(io, shift.locationId._id, 'shifts:updated', {
      action: 'created',
      shift
    });
    
    res.status(201).json(shift);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function assignStaff(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { userId } = req.body;
    const shift = await Shift.findById(req.params.id)
      .populate('locationId')
      .session(session);
    
    if (!shift) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Shift not found' });
    }
    
    if (shift.assigned.includes(userId)) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'User already assigned to this shift' });
    }
    
    if (shift.assigned.length >= shift.headcount) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Shift is at full capacity' });
    }
    
    const constraintCheck = await checkConstraints(shift._id, userId, shift);
    
    if (!constraintCheck.valid) {
      const suggestions = await getSuggestions(shift);
      await session.abortTransaction();
      
      return res.status(409).json({
        ok: false,
        violations: constraintCheck.violations,
        suggestions
      });
    }
    
    const before = shift.toObject();
    shift.assigned.push(userId);
    shift.updatedBy = req.user._id;
    await shift.save({ session });
    
    await createAuditLog({
      actorId: req.user._id,
      action: 'shift.assign',
      targetType: 'Shift',
      targetId: shift._id,
      before,
      after: shift.toObject(),
      metadata: { userId, weeklyHours: constraintCheck.weeklyHours }
    }, session);
    
    await createNotification({
      userId,
      category: 'shift_assigned',
      title: 'New Shift Assignment',
      body: `You have been assigned to a shift at ${shift.locationId.name}`,
      payload: { shiftId: shift._id }
    }, session);
    
    await session.commitTransaction();
    
    const io = req.app.get('io');
    emitToUser(io, userId, 'notifications:new', {
      category: 'shift_assigned',
      shiftId: shift._id
    });
    emitToLocation(io, shift.locationId._id, 'shifts:updated', {
      action: 'assigned',
      shift,
      userId
    });
    
    // Send overtime warning to managers if staff is approaching overtime
    const overtimeViolation = constraintCheck.violations.find(v => v.rule === 'overtime_warning' || v.rule === 'overtime_exceeded');
    if (overtimeViolation) {
      const User = (await import('../models/User.js')).default;
      const managers = await User.find({ role: { $in: ['admin', 'manager'] } });
      
      for (const manager of managers) {
        await createNotification({
          userId: manager._id,
          category: 'overtime_warning',
          title: 'Overtime Warning',
          body: `Staff member assigned to shift may exceed overtime limits: ${overtimeViolation.msg}`,
          payload: { shiftId: shift._id, staffId: userId, weeklyHours: constraintCheck.weeklyHours }
        }, null, io);
      }
    }
    
    await shift.populate('assigned', 'name email avatarUrl');
    
    res.json({
      ok: true,
      shift,
      warnings: constraintCheck.violations.filter(v => v.severity === 'warning')
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
}

export async function unassignStaff(req, res) {
  try {
    const { userId } = req.body;
    const shift = await Shift.findById(req.params.id).populate('locationId');
    
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    
    const before = shift.toObject();
    shift.assigned = shift.assigned.filter(id => id.toString() !== userId);
    shift.updatedBy = req.user._id;
    await shift.save();
    
    await createAuditLog({
      actorId: req.user._id,
      action: 'shift.unassign',
      targetType: 'Shift',
      targetId: shift._id,
      before,
      after: shift.toObject(),
      metadata: { userId }
    });
    
    const io = req.app.get('io');
    emitToLocation(io, shift.locationId._id, 'shifts:updated', {
      action: 'unassigned',
      shift,
      userId
    });
    
    res.json({ ok: true, shift });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function publishSchedule(req, res) {
  try {
    const { weekStart, locationId } = req.body;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    // Get all shifts that will be published
    const shiftsToPublish = await Shift.find({
      locationId,
      startUtc: { $gte: new Date(weekStart), $lt: weekEnd },
      published: false
    }).populate('assigned');
    
    // Update shifts to published
    const result = await Shift.updateMany(
      {
        locationId,
        startUtc: { $gte: new Date(weekStart), $lt: weekEnd },
        published: false
      },
      { published: true }
    );
    
    await createAuditLog({
      actorId: req.user._id,
      action: 'schedule.publish',
      targetType: 'Schedule',
      targetId: locationId,
      metadata: { weekStart, affectedShifts: result.modifiedCount }
    });
    
    const io = req.app.get('io');
    
    // Notify all affected staff
    const notifiedStaff = new Set();
    for (const shift of shiftsToPublish) {
      for (const staffId of shift.assigned) {
        const staffIdStr = staffId._id ? staffId._id.toString() : staffId.toString();
        if (!notifiedStaff.has(staffIdStr)) {
          await createNotification({
            userId: staffIdStr,
            category: 'schedule_published',
            title: 'Schedule Published',
            body: `The schedule for week of ${new Date(weekStart).toLocaleDateString()} has been published`,
            payload: { weekStart, locationId }
          }, null, io);
          notifiedStaff.add(staffIdStr);
        }
      }
    }
    
    emitToLocation(io, locationId, 'schedule:published', {
      weekStart,
      locationId
    });
    
    res.json({ message: 'Schedule published', count: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateShift(req, res) {
  try {
    const { id } = req.params;
    const shift = await Shift.findById(id).populate('locationId');
    
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    
    if (shift.published) {
      const now = new Date();
      const shiftStart = new Date(shift.startUtc);
      const hoursUntilShift = (shiftStart - now) / (1000 * 60 * 60);
      
      if (hoursUntilShift <= 48) {
        return res.status(403).json({ 
          error: 'Cannot edit shift within 48 hours of start time',
          message: 'This shift is locked due to the 48-hour cutoff policy'
        });
      }
    }
    
    if (shift.pendingSwap) {
      const SwapRequest = (await import('../models/SwapRequest.js')).default;
      const pendingSwap = await SwapRequest.findById(shift.pendingSwap).populate('requesterId targetStaffId');
      
      if (pendingSwap && pendingSwap.status === 'pending') {
        pendingSwap.status = 'cancelled';
        await pendingSwap.save();
        
        const io = req.app.get('io');
        
        await createNotification({
          userId: pendingSwap.requesterId._id,
          category: 'swap_cancelled',
          title: 'Swap Request Cancelled',
          body: 'Your swap request was cancelled because the shift was edited by a manager',
          payload: { swapId: pendingSwap._id, shiftId: shift._id }
        }, null, io);
        
        if (pendingSwap.type === 'swap' && pendingSwap.targetStaffId) {
          await createNotification({
            userId: pendingSwap.targetStaffId._id,
            category: 'swap_cancelled',
            title: 'Swap Request Cancelled',
            body: 'A swap request was cancelled because the shift was edited by a manager',
            payload: { swapId: pendingSwap._id, shiftId: shift._id }
          }, null, io);
        }
        
        shift.pendingSwap = null;
      }
    }
    
    const before = shift.toObject();
    
    if (req.body.startUtc) shift.startUtc = req.body.startUtc;
    if (req.body.endUtc) shift.endUtc = req.body.endUtc;
    if (req.body.requiredSkill) shift.requiredSkill = req.body.requiredSkill;
    if (req.body.headcount) shift.headcount = req.body.headcount;
    shift.updatedBy = req.user._id;
    
    await shift.save();
    
    await createAuditLog({
      actorId: req.user._id,
      action: 'shift.update',
      targetType: 'Shift',
      targetId: shift._id,
      before,
      after: shift.toObject()
    });
    
    const io = req.app.get('io');
    
    // Notify assigned staff about the change
    for (const userId of shift.assigned) {
      await createNotification({
        userId,
        category: 'shift_changed',
        title: 'Shift Updated',
        body: `A shift you are assigned to has been modified`,
        payload: { shiftId: shift._id }
      }, null, io);
    }
    
    emitToLocation(io, shift.locationId._id, 'shifts:updated', {
      action: 'updated',
      shift
    });
    
    res.json(shift);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteShift(req, res) {
  try {
    const { id } = req.params;
    const shift = await Shift.findById(id).populate('locationId');
    
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    
    if (shift.published) {
      const now = new Date();
      const shiftStart = new Date(shift.startUtc);
      const hoursUntilShift = (shiftStart - now) / (1000 * 60 * 60);
      
      if (hoursUntilShift <= 48) {
        return res.status(403).json({ 
          error: 'Cannot delete shift within 48 hours of start time',
          message: 'This shift is locked due to the 48-hour cutoff policy'
        });
      }
    }
    
    const before = shift.toObject();
    
    await Shift.findByIdAndDelete(id);
    
    await createAuditLog({
      actorId: req.user._id,
      action: 'shift.delete',
      targetType: 'Shift',
      targetId: shift._id,
      before
    });
    
    for (const userId of shift.assigned) {
      await createNotification({
        userId,
        category: 'shift_changed',
        title: 'Shift Deleted',
        body: `A shift you were assigned to has been deleted`,
        payload: { shiftId: shift._id }
      });
    }
    
    const io = req.app.get('io');
    emitToLocation(io, shift.locationId._id, 'shifts:updated', {
      action: 'deleted',
      shiftId: id
    });
    
    res.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function unpublishSchedule(req, res) {
  try {
    const { weekStart, locationId } = req.body;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const shifts = await Shift.updateMany(
      {
        locationId,
        startUtc: { $gte: new Date(weekStart), $lt: weekEnd },
        published: true
      },
      { published: false }
    );
    
    await createAuditLog({
      actorId: req.user._id,
      action: 'schedule.unpublish',
      targetType: 'Schedule',
      targetId: locationId,
      metadata: { weekStart, affectedShifts: shifts.modifiedCount }
    });
    
    const io = req.app.get('io');
    emitToLocation(io, locationId, 'schedule:unpublished', {
      weekStart,
      locationId
    });
    
    res.json({ message: 'Schedule unpublished', count: shifts.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
