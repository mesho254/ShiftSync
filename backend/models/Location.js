import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  timezone: {
    type: String,
    required: true,
    default: 'America/New_York'
  }
}, {
  timestamps: true
});

locationSchema.index({ name: 1 });

export default mongoose.model('Location', locationSchema);
