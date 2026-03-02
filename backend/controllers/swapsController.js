import SwapRequest from '../models/SwapRequest.js';
import Shift from '../models/Shift.js';
import { createAuditLog } from '../utils/audit.js';
import { createNotification } from '../utils/notifications.js';
import { emitToUser } from '../config/socket.js';
import { checkConstraints } from '../utils/constraints.js';

export async function getSwapRequests(req, res) {
  try {
    const { userId, status } = req.query;
    const query = {};
    
    if (userId) {
      query.$or = [{ requesterId: userId }, { targetStaffId: userId }];
    }
    if (status) query.status = status;
    
    const swaps = await SwapRequest.find(query)
      .populate('shiftId')
      .populate('requesterId', 'name email')
      .populate('targetStaffId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(swaps);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function createSwapRequest(req, res) {
  try {
    const { type, shiftId, targetStaffId, notes } = req.body;
    
    const pendingCount = await SwapRequest.countDocuments({
      requesterId: req.user._id,
      status: 'pending'
    });
    
    if (pendingCount >= 3) {
      return res.status(400).json({
        error: 'Maximum pending requests reached',
        message: 'You can have at most 3 pending swap/drop requests'
      });
    }
    
    const shift = await Shift.findById(shiftId).populate('locationId');
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    
    let expiresAt;
    if (type === 'drop') {
      expiresAt = new Date(shift.startUtc);
      expiresAt.setHours(expiresAt.getHours() - 24);
    }
    
    const swapRequest = new SwapRequest({
      type,
      shiftId,
      requesterId: req.user._id,
      targetStaffId,
      notes,
      expiresAt
    });
    
    await swapRequest.save();
    
    shift.pendingSwap = swapRequest._id;
    await shift.save();
    
    await createAuditLog({
      actorId: req.user._id,
      action: 'swap.create',
      targetType: 'SwapRequest',
      targetId: swapRequest._id,
      after: swapRequest.toObject()
    });
    
    const io = req.app.get('io');
    
    // Notify requester (confirmation)
    await createNotification({
      userId: req.user._id,
      category: type === 'swap' ? 'swap_requested' : 'shift_dropped',
      title: type === 'swap' ? 'Swap Request Created' : 'Drop Request Created',
      body: type === 'swap' 
        ? `Your swap request has been sent and is pending approval`
        : `Your drop request has been created and is available for pickup`,
      payload: { swapId: swapRequest._id }
    }, null, io);
    emitToUser(io, req.user._id.toString(), 'swap:created', swapRequest);
    
    // Notify target staff if swap
    if (type === 'swap' && targetStaffId) {
      await createNotification({
        userId: targetStaffId,
        category: 'swap_requested',
        title: 'Swap Request',
        body: `${req.user.name} wants to swap shifts with you`,
        payload: { swapId: swapRequest._id }
      }, null, io);
      
      emitToUser(io, targetStaffId, 'swap:created', swapRequest);
    }
    
    // Notify managers if drop
    if (type === 'drop') {
      const User = (await import('../models/User.js')).default;
      const managers = await User.find({
        role: { $in: ['manager', 'admin'] }
      });
      
      for (const manager of managers) {
        await createNotification({
          userId: manager._id,
          category: 'shift_dropped',
          title: 'Shift Drop Request',
          body: `${req.user.name} wants to drop a shift at ${shift.locationId?.name || 'a location'}`,
          payload: { swapId: swapRequest._id }
        }, null, io);
        emitToUser(io, manager._id.toString(), 'swap:created', swapRequest);
      }
    }
    
    res.status(201).json(swapRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function acceptSwap(req, res) {
  try {
    const swap = await SwapRequest.findById(req.params.id).populate('shiftId');
    
    if (!swap) {
      return res.status(404).json({ error: 'Swap request not found' });
    }
    
    if (swap.type === 'swap' && swap.targetStaffId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    swap.status = 'accepted';
    await swap.save();
    
    const io = req.app.get('io');
    await createNotification({
      userId: swap.requesterId,
      category: 'swap_accepted',
      title: 'Swap Accepted',
      body: `Your swap request has been accepted`,
      payload: { swapId: swap._id }
    }, null, io);
    
    emitToUser(io, swap.requesterId.toString(), 'swap:updated', swap);
    
    res.json(swap);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function managerApprove(req, res) {
  try {
    const swap = await SwapRequest.findById(req.params.id)
      .populate('shiftId')
      .populate('requesterId')
      .populate('targetStaffId');
    
    if (!swap) {
      return res.status(404).json({ error: 'Swap request not found' });
    }
    
    swap.status = 'approved-by-manager';
    swap.managerApprovedBy = req.user._id;
    await swap.save();
    
    const shift = await Shift.findById(swap.shiftId);
    
    if (swap.type === 'drop') {
      shift.assigned = shift.assigned.filter(
        id => id.toString() !== swap.requesterId.toString()
      );
    } else if (swap.type === 'swap') {
      const requesterIndex = shift.assigned.findIndex(
        id => id.toString() === swap.requesterId.toString()
      );
      if (requesterIndex !== -1) {
        shift.assigned[requesterIndex] = swap.targetStaffId;
      }
    }
    
    shift.pendingSwap = null;
    await shift.save();
    
    await createAuditLog({
      actorId: req.user._id,
      action: 'swap.approve',
      targetType: 'SwapRequest',
      targetId: swap._id,
      metadata: { shiftId: shift._id }
    });
    
    const io = req.app.get('io');
    
    await createNotification({
      userId: swap.requesterId._id,
      category: 'swap_approved',
      title: 'Swap Approved',
      body: `Your ${swap.type} request has been approved by manager`,
      payload: { swapId: swap._id }
    }, null, io);
    
    if (swap.type === 'swap' && swap.targetStaffId) {
      await createNotification({
        userId: swap.targetStaffId._id,
        category: 'swap_approved',
        title: 'Swap Approved',
        body: `The swap request has been approved by manager`,
        payload: { swapId: swap._id }
      }, null, io);
    }
    
    emitToUser(io, swap.requesterId._id.toString(), 'swap:updated', swap);
    if (swap.type === 'swap' && swap.targetStaffId) {
      emitToUser(io, swap.targetStaffId._id.toString(), 'swap:updated', swap);
    }
    
    res.json({ swap, shift });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function cancelSwap(req, res) {
  try {
    const swap = await SwapRequest.findById(req.params.id).populate('targetStaffId');
    
    if (!swap) {
      return res.status(404).json({ error: 'Swap request not found' });
    }
    
    if (swap.requesterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const before = swap.toObject();
    swap.status = 'cancelled';
    await swap.save();
    
    await Shift.findByIdAndUpdate(swap.shiftId, { pendingSwap: null });
    
    await createAuditLog({
      actorId: req.user._id,
      action: 'swap.cancel',
      targetType: 'SwapRequest',
      targetId: swap._id,
      before,
      after: swap.toObject()
    });
    
    const io = req.app.get('io');
    
    if (swap.type === 'swap' && swap.targetStaffId) {
      await createNotification({
        userId: swap.targetStaffId._id,
        category: 'swap_cancelled',
        title: 'Swap Cancelled',
        body: `${req.user.name} has cancelled the swap request`,
        payload: { swapId: swap._id }
      }, null, io);
      
      emitToUser(io, swap.targetStaffId._id.toString(), 'swap:updated', swap);
    }
    
    res.json(swap);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function pickupShift(req, res) {
  try {
    const swap = await SwapRequest.findById(req.params.id)
      .populate('shiftId')
      .populate('requesterId');
    
    if (!swap) {
      return res.status(404).json({ error: 'Swap request not found' });
    }
    
    if (swap.type !== 'drop') {
      return res.status(400).json({ error: 'Only drop requests can be picked up' });
    }
    
    if (swap.status !== 'pending') {
      return res.status(400).json({ error: 'This request is no longer available' });
    }
    
    if (swap.expiresAt && new Date() > new Date(swap.expiresAt)) {
      swap.status = 'expired';
      await swap.save();
      return res.status(400).json({ error: 'This request has expired' });
    }
    
    const constraintCheck = await checkConstraints(swap.shiftId._id, req.user._id, swap.shiftId);
    
    if (!constraintCheck.valid) {
      return res.status(409).json({
        ok: false,
        violations: constraintCheck.violations,
        message: 'You do not meet the requirements to pick up this shift'
      });
    }
    
    swap.targetStaffId = req.user._id;
    swap.status = 'accepted';
    await swap.save();
    
    const io = req.app.get('io');
    
    await createNotification({
      userId: swap.requesterId._id,
      category: 'shift_picked_up',
      title: 'Shift Picked Up',
      body: `${req.user.name} wants to pick up your dropped shift`,
      payload: { swapId: swap._id }
    }, null, io);
    
    emitToUser(io, swap.requesterId.toString(), 'swap:updated', swap);
    
    res.json(swap);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
