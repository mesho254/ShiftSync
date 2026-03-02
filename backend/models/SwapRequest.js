import mongoose from 'mongoose';

const swapRequestSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['swap', 'drop', 'pickup'],
    required: true
  },
  shiftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    required: true
  },
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  targetStaffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'expired', 'approved-by-manager'],
    default: 'pending',
    index: true
  },
  expiresAt: Date,
  notes: String,
  managerApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound indexes
swapRequestSchema.index({ requesterId: 1, status: 1 });
swapRequestSchema.index({ targetStaffId: 1, status: 1 });
swapRequestSchema.index({ shiftId: 1 });
swapRequestSchema.index({ expiresAt: 1 });

export default mongoose.model('SwapRequest', swapRequestSchema);
