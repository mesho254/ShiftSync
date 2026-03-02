import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const availabilitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['recurring', 'one-off'],
    required: true
  },
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6
  },
  startTime: String,
  endTime: String,
  startDatetime: String,
  endDatetime: String,
  notes: String
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,  // This creates an index automatically
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'staff'],
    default: 'staff'
  },
  avatarUrl: String,
  managedLocations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  }],
  certifiedLocations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  }],
  skills: [String],
  availability: [availabilitySchema],
  desiredHoursPerWeek: Number,
  notificationPrefs: {
    inApp: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: true
    }
  },
  refreshToken: String
}, {
  timestamps: true
});

// Index for faster queries (email index is created by unique: true above)
userSchema.index({ role: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshToken;
  return obj;
};

export default mongoose.model('User', userSchema);
