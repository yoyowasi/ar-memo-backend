import mongoose from 'mongoose';

const MemorySchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        location: { // 위도, 경도 정보
            type: { type: String, enum: ['Point'], required: true, default: 'Point' },
            coordinates: { type: [Number], required: true } // [longitude, latitude] 순서
        },
        // ▼▼▼ AR 앵커 정보 필드 추가 ▼▼▼
        anchor: { type: [Number], default: null }, // 16개 double 값 배열 저장 (Matrix4.storage)
        // ▲▲▲ AR 앵커 정보 필드 추가 ▲▲▲
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

// 기존 인덱스 유지
MemorySchema.index({ location: '2dsphere' });
MemorySchema.index({ text: 'text', tags: 'text' }, { weights: { text: 10, tags: 5 }, name: 'Memory_text' });
MemorySchema.index({ userId: 1, groupId: 1, createdAt: -1 });

export const Memory = mongoose.model('Memory', MemorySchema);