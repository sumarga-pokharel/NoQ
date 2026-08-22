import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    counter: { type: mongoose.Schema.Types.ObjectId, ref: 'Counter', default: null },

    token: { type: String, required: true }, // e.g. "B-24"
    sequence: { type: Number, required: true }, // numeric part, for ordering within a prefix

    status: {
      type: String,
      enum: ['waiting', 'called', 'serving', 'done', 'skipped', 'no-show', 'left'],
      default: 'waiting',
      index: true,
    },

    priority: { type: Boolean, default: false }, // senior citizen / pregnant / disability
    isEmergency: { type: Boolean, default: false },

    // Documents required at time of join, and which ones the visitor confirmed they have
    documents: [
      {
        name: String,
        confirmed: { type: Boolean, default: false },
      },
    ],

    // Consumer contact - no account required
    phone: { type: String, trim: true, default: '' },
    notifyBrowser: { type: Boolean, default: false },
    notifySms: { type: Boolean, default: false },
    pushSubscription: { type: mongoose.Schema.Types.Mixed, default: null },

    // Optional live location for "time to get here" estimate
    consumerLocation: {
      lat: Number,
      lng: Number,
      updatedAt: Date,
    },

    heldAt: Date, // "hold my place" - pauses auto-skip without losing position
    calledAt: Date,
    servedAt: Date,
    completedAt: Date,
    leftAt: Date,
  },
  { timestamps: true }
);

ticketSchema.index({ provider: 1, status: 1, createdAt: 1 });

export default mongoose.model('Ticket', ticketSchema);
