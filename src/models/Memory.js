import mongoose from 'mongoose';

const MemorySchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },

        // GeoJSON Point: [longitude, latitude]
        location: {
            type: { type: String, enum: ['Point'], required: true, default: 'Point' },
            coordinates: { type: [Number], required: true } // [lng, lat]
        },

        anchor: { type: mongoose.Schema.Types.Mixed, required: true }, // AR 앵커(클라 그대로)

        text: { type: String },
        photoUrl: { type: String },
        audioUrl: { type: String },

        tags: { type: [String], default: [] },
        favorite: { type: Boolean, default: false },
        visibility: { type: String, enum: ['private', 'shared'], default: 'private' },

        // 그룹 연결 (선택)
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null }
    },
    { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

// 인덱스
MemorySchema.index({ location: '2dsphere' });

// ✅ text + tags 모두 텍스트 인덱스로
MemorySchema.index(
    { text: 'text', tags: 'text' },
    { weights: { text: 10, tags: 5 }, name: 'Memory_text' }
);

MemorySchema.index({ userId: 1, groupId: 1, createdAt: -1 });

export const Memory = mongoose.model('Memory', MemorySchema);
