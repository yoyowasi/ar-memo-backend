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
        audioUrl: { type: String }
    },
    { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

// 반경 검색을 위한 2dsphere 인덱스
MemorySchema.index({ location: '2dsphere' });

export const Memory = mongoose.model('Memory', MemorySchema);
