// src/models/TripRecord.js
import mongoose from 'mongoose';

// ---------------------------------
// GeoJSON Point 스키마 정의 (추가)
const PointSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point'
    },
    coordinates: {
        type: [Number], // [longitude, latitude] 순서
        required: true
    }
});
// ---------------------------------

const TripRecordSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true },
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
        title: { type: String, required: true },
        content: { type: String, default: '' },
        date: { type: Date, required: true },
        photoUrls: { type: [String], default: [] },
        // --- 필드 추가 ---
        location: { type: PointSchema, default: null, index: '2dsphere' } // 2dsphere 인덱스 추가
        // ----------------
    },
    { timestamps: true }
);

TripRecordSchema.index({ userId: 1, groupId: 1, date: -1 });

export const TripRecord = mongoose.model('TripRecord', TripRecordSchema);