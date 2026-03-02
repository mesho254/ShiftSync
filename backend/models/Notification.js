import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'shift_assigned',
      'shift_changed',
      'shift_dropped',
      'shift_picked_up',
      'schedule_published',
      'swap_requested',
      'swap_accepted',
      'swap_rejected',
      'swap_cancelled',
      'swap_approved',
      'overtime_warning',
      'availability_changed',
      'audit_export_ready',
      'conflict'
    ]
  },
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  payload: mongoose.Schema.Types.Mixed,
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

// Compound indexes
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
