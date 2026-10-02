import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  type: { type: String, required: true },
  severity: { 
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true 
  },
  location: {
    lat: { type: Number, required: true },
    long: { type: Number, required: true }
  },
  timestamp: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

export const Alert = mongoose.model('Alert', alertSchema);