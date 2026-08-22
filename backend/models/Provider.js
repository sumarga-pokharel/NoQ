import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const SECTORS = ['government', 'hospital', 'bank', 'other'];

const providerSchema = new mongoose.Schema(
  {
    officeName: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    sector: { type: String, enum: SECTORS, default: 'government' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    tokenVersion: { type: Number, default: 0, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    address: { type: String, trim: true },
    location: {
      lat: Number,
      lng: Number,
    },

    // Documents required from every visitor before they can be marked "ready"
    requiredDocuments: [
      {
        name: { type: String, required: true },
        required: { type: Boolean, default: true },
      },
    ],

    // Whether this office is accepting new joins right now (Setup/Dashboard "pause new joins")
    isAcceptingJoins: { type: Boolean, default: true },
    onboardingComplete: { type: Boolean, default: false },

    // Rolling counters, reset daily by a cron/seed job if desired
    dailyTicketSeed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

providerSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

providerSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

providerSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    officeName: this.officeName,
    slug: this.slug,
    sector: this.sector,
    email: this.email,
    phone: this.phone,
    address: this.address,
    location: this.location,
    requiredDocuments: this.requiredDocuments,
    isAcceptingJoins: this.isAcceptingJoins,
    onboardingComplete: this.onboardingComplete,
  };
};

export const SECTOR_VALUES = SECTORS;
export default mongoose.model('Provider', providerSchema);
