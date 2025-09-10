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
        photoUrl: { type: String },     // ← /uploads/.. 메인 이미지 URL
        audioUrl: { type: String },
        thumbUrl: { type: String },     // ← /uploads/.. 썸네일 URL (옵션)
        tags: { type: [String], default: [] },
        favorite: { type: Boolean, default: false },
        visibility: { type: String, enum: ['private', 'shared'], default: 'private' },
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null }
    },
    { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

MemorySchema.index({ location: '2dsphere' });
MemorySchema.index({ text: 'text', tags: 'text' }, { weights: { text: 10, tags: 5 }, name: 'Memory_text' });
MemorySchema.index({ userId: 1, groupId: 1, createdAt: -1 });

export const Memory = mongoose.model('Memory', MemorySchema);
