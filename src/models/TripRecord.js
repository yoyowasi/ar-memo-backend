// src/models/TripRecord.js
import mongoose from 'mongoose';

const TripRecordSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true },
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
        title: { type: String, required: true },
        content: { type: String, default: '' },
        date: { type: Date, required: true },
        photoUrls: { type: [String], default: [] }
    },
    { timestamps: true }
);

TripRecordSchema.index({ userId: 1, groupId: 1, date: -1 });

export const TripRecord = mongoose.model('TripRecord', TripRecordSchema);