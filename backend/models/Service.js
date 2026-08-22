import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    name: { type: String, required: true, trim: true },
    // Sector-specific category, e.g. government: 'license-renewal', hospital: 'emergency', bank: 'teller'
    category: { type: String, trim: true, default: '' },
    avgMinutes: { type: Number, required: true, default: 5, min: 1 },
    prefix: { type: String, required: true, uppercase: true, minlength: 1, maxlength: 3 },
    // Emergency-type services can jump the queue regardless of priority flag
    isEmergency: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceSchema.index({ provider: 1, prefix: 1 }, { unique: true });

export default mongoose.model('Service', serviceSchema);
