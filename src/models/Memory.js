import mongoose from 'mongoose';

const MemorySchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        location: {
            type: { type: String, enum: ['Point'], required: true, default: 'Point' },
            coordinates: { type: [Number], required: true } // [lng, lat]
        },
        anchor: { type: mongoose.Schema.Types.Mixed, required: true },
        text: { type: String },
        photoUrl: { type: String },
        audioUrl: { type: String },
        tags: { type: [String], default: [] },
        favorite: { type: Boolean, default: false },
        visibility: { type: String, enum: ['private', 'shared'], default: 'private' }
    },
    { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

MemorySchema.index({ location: '2dsphere' });
MemorySchema.index({ text: 'text', tags: 1 });

export const Memory = mongoose.model('Memory', MemorySchema);
