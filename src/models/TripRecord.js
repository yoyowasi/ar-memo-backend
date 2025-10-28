// src/models/TripRecord.js
import mongoose from 'mongoose';

const TripRecordSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true },
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
        title: { type: String, required: true },
        content: { type: String, default: '' },
        date: { type: Date, required: true, index: true }, // ✅ 수정: index: true 추가
        photoUrls: { type: [String], default: [] },

        // ✅ 추가: 좌표 필드
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
    },
    { timestamps: true }
);

TripRecordSchema.index({ userId: 1, groupId: 1, date: -1 });

export const TripRecord = mongoose.model('TripRecord', TripRecordSchema);