import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true,
    index: true
  },
  startUtc: {
    type: Date,
    required: true,
    index: true
  },
  endUtc: {
    type: Date,
    required: true,
    index: true
  },
  requiredSkill: {
    type: String,
    required: true
  },
  headcount: {
    type: Number,
    default: 1,
    min: 1
  },
  assigned: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }],
  published: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  version: {
    type: Number,
    default: 0
  },
  attachments: [{
    url: String,
    type: String,
    publicId: String
  }],
  pendingSwap: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SwapRequest'
  },
  auditIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AuditLog'
  }]
}, {
  timestamps: true
});

// Compound indexes for efficient queries
shiftSchema.index({ locationId: 1, startUtc: 1, endUtc: 1 });
shiftSchema.index({ assigned: 1, startUtc: 1 });
shiftSchema.index({ published: 1, locationId: 1 });

// Increment version on save
shiftSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.version += 1;
  }
  next();
});

export default mongoose.model('Shift', shiftSchema);
