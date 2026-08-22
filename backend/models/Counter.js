import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
    name: { type: String, required: true, trim: true },
    // Which services this counter/room can serve; empty array = serves any service
    compatibleServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    status: { type: String, enum: ['idle', 'serving', 'waiting'], default: 'idle' },
    currentTicket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Counter', counterSchema);
