# Critical Fixes Implementation Guide

This document provides implementation guidance for the high-priority issues identified in the system evaluation.

---

## 1. Implement Optimistic Locking (CRITICAL)

### Problem
Two managers can simultaneously modify the same shift, causing one to overwrite the other's changes without warning.

### Solution
Use the existing `version` field to detect conflicts.

### Implementation

**Step 1: Update Shift Assignment Controller**

```javascript
// backend/controllers/shiftsController.js

export async function assignStaff(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { userId, version } = req.body; // Add version to request
    const shift = await Shift.findById(req.params.id)
      .populate('locationId')
      .session(session);
    
    if (!shift) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Shift not found' });
    }
    
    // CHECK VERSION BEFORE PROCEEDING
    if (version !== undefined && shift.version !== version) {
      await session.abortTransaction();
      return res.status(409).json({
        error: 'Conflict detected',
        message: 'This shift was modified by another user. Please refresh and try again.',
        currentVersion: shift.version
      });
    }
    
    // ... rest of assignment logic
  }
}
```

**Step 2: Update Frontend to Send Version**

```typescript
// frontend/src/components/AssignStaffModal.tsx

const assignStaff = async () => {
  try {
    await api.post(`/shifts/${shift._id}/assign`, {
      userId: selectedStaff,
      version: shift.version // Include current version
    });
    // ... success handling
  } catch (error: any) {
    if (error.response?.status === 409) {
      // Conflict detected
      toast.error('This shift was modified by another user. Refreshing...');
      // Refresh shift data
      queryClient.invalidateQueries(['shifts']);
    } else {
      toast.error(error.response?.data?.error || 'Failed to assign staff');
    }
  }
};
```

**Step 3: Apply to All Shift Modifications**

Apply the same pattern to:
- `updateShift`
- `unassignStaff`
- `deleteShift`

---

## 2. Implement Consecutive Days Constraint

### Problem
`MAX_CONSECUTIVE_DAYS` is defined but never checked.

### Solution
Add consecutive days checking to constraint validation.

### Implementation

**Add to constraints.js:**

```javascript
// backend/utils/constraints.js

export const checkConsecutiveDays = async (userId, shiftDate) => {
  // Get shifts in a window around the target date
  const windowStart = DateTime.fromJSDate(shiftDate)
    .minus({ days: MAX_CONSECUTIVE_DAYS + 1 })
    .startOf('day')
    .toJSDate();
  
  const windowEnd = DateTime.fromJSDate(shiftDate)
    .plus({ days: MAX_CONSECUTIVE_DAYS + 1 })
    .endOf('day')
    .toJSDate();
  
  const shifts = await Shift.find({
    assigned: userId,
    startUtc: { $gte: windowStart, $lte: windowEnd }
  }).sort({ startUtc: 1 });
  
  // Group shifts by calendar day
  const daysWorked = new Set();
  shifts.forEach(shift => {
    const day = DateTime.fromJSDate(shift.startUtc)
      .setZone('UTC')
      .toISODate();
    daysWorked.add(day);
  });
  
  // Add the new shift's day
  const newShiftDay = DateTime.fromJSDate(shiftDate)
    .setZone('UTC')
    .toISODate();
  daysWorked.add(newShiftDay);
  
  // Check for consecutive sequence
  const sortedDays = Array.from(daysWorked).sort();
  let consecutiveCount = 1;
  let maxConsecutive = 1;
  
  for (let i = 1; i < sortedDays.length; i++) {
    const prevDay = DateTime.fromISO(sortedDays[i-1]);
    const currDay = DateTime.fromISO(sortedDays[i]);
    const daysDiff = currDay.diff(prevDay, 'days').days;
    
    if (daysDiff === 1) {
      consecutiveCount++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
    } else {
      consecutiveCount = 1;
    }
  }
  
  if (maxConsecutive > MAX_CONSECUTIVE_DAYS) {
    return {
      valid: false,
      consecutiveDays: maxConsecutive,
      msg: `Would result in ${maxConsecutive} consecutive days worked (max: ${MAX_CONSECUTIVE_DAYS})`
    };
  }
  
  return { 
    valid: true,
    consecutiveDays: maxConsecutive
  };
};

// Update checkConstraints to include consecutive days check
export const checkConstraints = async (shiftId, userId, shift = null) => {
  const violations = [];
  
  // ... existing checks ...
  
  // Check consecutive days
  const consecutiveCheck = await checkConsecutiveDays(userId, shift.startUtc);
  if (!consecutiveCheck.valid) {
    violations.push({
      rule: 'max_consecutive_days',
      msg: consecutiveCheck.msg,
      severity: 'high'
    });
  }
  
  return {
    valid: violations.filter(v => v.severity !== 'warning').length === 0,
    violations,
    weeklyHours: weeklyHours.toFixed(1),
    consecutiveDays: consecutiveCheck.consecutiveDays
  };
};
```

---

## 3. Fix Swap Pickup Race Condition

### Problem
Multiple staff can simultaneously accept the same drop request.

### Solution
Use transactions and check swap status within transaction.

### Implementation

```javascript
// backend/controllers/swapsController.js

export async function pickupShift(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const swap = await SwapRequest.findById(req.params.id)
      .populate('shiftId')
      .populate('requesterId')
      .session(session); // Use session
    
    if (!swap) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Swap request not found' });
    }
    
    if (swap.type !== 'drop') {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Only drop requests can be picked up' });
    }
    
    // CHECK STATUS WITHIN TRANSACTION
    if (swap.status !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: 'This request is no longer available',
        message: 'Another staff member may have already picked up this shift'
      });
    }
    
    if (swap.expiresAt && new Date() > new Date(swap.expiresAt)) {
      swap.status = 'expired';
      await swap.save({ session });
      await session.abortTransaction();
      return res.status(400).json({ error: 'This request has expired' });
    }
    
    const constraintCheck = await checkConstraints(
      swap.shiftId._id, 
      req.user._id, 
      swap.shiftId
    );
    
    if (!constraintCheck.valid) {
      await session.abortTransaction();
      return res.status(409).json({
        ok: false,
        violations: constraintCheck.violations,
        message: 'You do not meet the requirements to pick up this shift'
      });
    }
    
    // Update swap within transaction
    swap.targetStaffId = req.user._id;
    swap.status = 'accepted';
    await swap.save({ session });
    
    await session.commitTransaction();
    
    // Notifications after successful commit
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
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
}
```

---

## 4. Add Comprehensive Error Handling

### Problem
Inconsistent error handling across controllers.

### Solution
Create centralized error handling middleware.

### Implementation

**Step 1: Create Error Handler Middleware**

```javascript
// backend/middlewares/errorHandler.js

export class AppError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message, details } = err;
  
  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = Object.values(err.errors).map(e => e.message);
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate Entry';
    details = 'A record with this value already exists';
  }
  
  // Mongoose cast error
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  
  // Log error for debugging
  if (!err.isOperational) {
    console.error('💥 UNEXPECTED ERROR:', err);
  }
  
  res.status(statusCode).json({
    error: message,
    details: details,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Async handler wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

**Step 2: Apply to Express App**

```javascript
// backend/index.js

import { errorHandler } from './middlewares/errorHandler.js';

// ... routes ...

// Error handling middleware (must be last)
app.use(errorHandler);
```

**Step 3: Use in Controllers**

```javascript
// backend/controllers/shiftsController.js

import { asyncHandler, AppError } from '../middlewares/errorHandler.js';

export const assignStaff = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { userId, version } = req.body;
    const shift = await Shift.findById(req.params.id)
      .populate('locationId')
      .session(session);
    
    if (!shift) {
      throw new AppError('Shift not found', 404);
    }
    
    if (version !== undefined && shift.version !== version) {
      throw new AppError(
        'Conflict detected',
        409,
        'This shift was modified by another user. Please refresh and try again.'
      );
    }
    
    // ... rest of logic
    
    await session.commitTransaction();
    res.json({ ok: true, shift });
  } catch (error) {
    await session.abortTransaction();
    throw error; // Will be caught by asyncHandler
  } finally {
    session.endSession();
  }
});
```

---

## 5. Add Real-Time Conflict Notifications

### Problem
When two managers conflict, only the second one knows about it.

### Solution
Emit conflict events to notify all relevant parties.

### Implementation

```javascript
// backend/controllers/shiftsController.js

export const assignStaff = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { userId, version } = req.body;
    const shift = await Shift.findById(req.params.id)
      .populate('locationId')
      .session(session);
    
    if (!shift) {
      throw new AppError('Shift not found', 404);
    }
    
    if (version !== undefined && shift.version !== version) {
      await session.abortTransaction();
      
      // EMIT CONFLICT EVENT TO LOCATION
      const io = req.app.get('io');
      emitToLocation(io, shift.locationId._id, 'shift:conflict', {
        shiftId: shift._id,
        conflictType: 'version_mismatch',
        attemptedBy: req.user._id,
        message: 'Multiple managers attempted to modify this shift simultaneously'
      });
      
      throw new AppError(
        'Conflict detected',
        409,
        'This shift was modified by another user. Please refresh and try again.'
      );
    }
    
    // ... rest of logic
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});
```

**Frontend Handler:**

```typescript
// frontend/src/pages/Schedule.tsx

useSocket('shift:conflict', (data) => {
  if (data.shiftId) {
    toast.warning(
      `Conflict detected: ${data.message}`,
      { duration: 5000 }
    );
    // Refresh shifts to get latest data
    queryClient.invalidateQueries(['shifts']);
  }
});
```

---

## Testing Checklist

After implementing these fixes, test the following scenarios:

### Optimistic Locking Tests
- [ ] Two managers open same shift simultaneously
- [ ] Manager A assigns staff
- [ ] Manager B tries to assign different staff
- [ ] Verify Manager B gets conflict error
- [ ] Verify Manager B can refresh and retry
- [ ] Verify Manager A sees conflict notification

### Consecutive Days Tests
- [ ] Staff works 6 consecutive days
- [ ] Try to assign 7th consecutive day
- [ ] Verify assignment blocked
- [ ] Verify clear error message
- [ ] Test with day off in between (should allow)

### Swap Pickup Race Condition Tests
- [ ] Create drop request
- [ ] Two staff try to pick up simultaneously
- [ ] Verify only one succeeds
- [ ] Verify second gets clear error
- [ ] Verify swap status updated correctly

### Error Handling Tests
- [ ] Invalid shift ID
- [ ] Missing required fields
- [ ] Database connection error
- [ ] Verify consistent error format
- [ ] Verify appropriate status codes

---

## Deployment Checklist

Before deploying to production:

1. [ ] Run all tests
2. [ ] Update API documentation
3. [ ] Add database migration for any schema changes
4. [ ] Update frontend to handle new error responses
5. [ ] Add monitoring for conflict events
6. [ ] Set up alerts for high conflict rates
7. [ ] Document new behavior in user guide
8. [ ] Train managers on conflict resolution

---

## Performance Considerations

### Database Indexes
Ensure these indexes exist for optimal performance:

```javascript
// Shift model
shiftSchema.index({ assigned: 1, startUtc: 1 }); // For consecutive days check
shiftSchema.index({ version: 1 }); // For optimistic locking

// SwapRequest model
swapRequestSchema.index({ status: 1, shiftId: 1 }); // For pickup race condition
```

### Caching Strategy
Consider caching frequently accessed data:

```javascript
// Cache user certifications and skills
// Cache location timezones
// Cache constraint thresholds
```

---

## Monitoring & Alerts

Set up monitoring for:

1. **Conflict Rate**: Alert if > 5% of operations result in conflicts
2. **Transaction Failures**: Alert on high transaction abort rate
3. **Consecutive Days Violations**: Track how often this constraint is hit
4. **Swap Pickup Conflicts**: Monitor race condition frequency

---

## Conclusion

These critical fixes address the main concurrency and data integrity issues identified in the evaluation. Implementing them will significantly improve system reliability and user experience in multi-manager environments.

**Estimated Implementation Time:**
- Optimistic Locking: 4-6 hours
- Consecutive Days: 3-4 hours
- Swap Race Condition: 2-3 hours
- Error Handling: 3-4 hours
- Conflict Notifications: 2-3 hours
- Testing: 6-8 hours

**Total: 20-28 hours**
