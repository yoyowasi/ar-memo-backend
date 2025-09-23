// src/services/tripRecords.service.js
import { TripRecord } from '../models/TripRecord.js';

export async function createTripRecord(userId, data) {
    return TripRecord.create({
        userId,
        groupId: data.groupId ?? null,
        title: data.title,
        content: data.content ?? '',
        date: data.date,
        photoUrls: data.photoUrls ?? []
    });
}

export async function getMyTripRecordById(userId, id) {
    return TripRecord.findOne({ _id: id, userId });
}

export async function updateMyTripRecord(userId, id, body) {
    return TripRecord.findOneAndUpdate(
        { _id: id, userId },
        body,
        { new: true, runValidators: true }
    );
}

export async function deleteMyTripRecord(userId, id) {
    return TripRecord.findOneAndDelete({ _id: id, userId });
}

export async function listMyTripRecords(userId, filter, page, limit) {
    const [items, total] = await Promise.all([
        TripRecord.find({ userId, ...filter }).sort({ date: -1 }).skip((page - 1) * limit).limit(limit),
        TripRecord.countDocuments({ userId, ...filter })
    ]);
    return { items, total };
}