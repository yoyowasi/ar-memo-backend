// src/services/tripRecords.service.js
import { TripRecord } from '../models/TripRecord.js';

// ✅ 수정: 좌표 필드 및 .toObject() 추가
export async function createTripRecord(userId, data) {
    const doc = await TripRecord.create({
        userId,
        groupId: data.groupId ?? null,
        title: data.title,
        content: data.content ?? '',
        date: data.date,
        photoUrls: data.photoUrls ?? [],

        // ✅ 추가
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
    });
    // .toObject()는 Mongoose 문서를 순수 객체로 변환합니다.
    // (populate된 결과와 일관성을 맞추기 위해 추가)
    const populatedDoc = await getMyTripRecordById(userId, doc._id);
    return populatedDoc;
}

export async function getMyTripRecordById(userId, id) {
    // groupId를 이용해 그룹의 name, color 필드를 함께 가져옵니다.
    // .lean()을 추가하여 순수 JavaScript 객체를 반환하도록 수정
    return TripRecord.findOne({ _id: id, userId })
        .populate({ path: 'groupId', select: 'name color' })
        .lean();
}

// ✅ 수정: findOneAndUpdate -> findOne + save 방식으로 변경 (안전한 부분 업데이트)
export async function updateMyTripRecord(userId, id, data) {
    const doc = await TripRecord.findOne({ _id: id, userId });
    if (!doc) return null;

    // 요청 DTO(data)에 포함된 필드만 선택적으로 업데이트
    if (data.title !== undefined) doc.title = data.title;
    if (data.date !== undefined) doc.date = data.date;
    if (data.groupId !== undefined) doc.groupId = data.groupId ?? null;
    if (data.content !== undefined) doc.content = data.content ?? '';
    if (data.photoUrls !== undefined) doc.photoUrls = data.photoUrls ?? [];

    // ✅ 추가: 좌표 필드 업데이트
    if (data.latitude !== undefined) doc.latitude = data.latitude ?? null;
    if (data.longitude !== undefined) doc.longitude = data.longitude ?? null;

    await doc.save();

    // 저장 후 populate된 결과를 반환
    const populatedDoc = await getMyTripRecordById(userId, doc._id);
    return populatedDoc;
}

export async function deleteMyTripRecord(userId, id) {
    return TripRecord.findOneAndDelete({ _id: id, userId });
}

export async function listMyTripRecords(userId, filter, page, limit) {
    const [items, total] = await Promise.all([
        // .populate()를 추가하여 각 기록의 그룹 정보를 함께 가져옵니다.
        // .lean()을 추가하여 순수 JavaScript 객체를 반환하도록 수정
        TripRecord.find({ userId, ...filter })
            .populate({ path: 'groupId', select: 'name color' }) // groupId로 Group의 name, color를 찾습니다.
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        TripRecord.countDocuments({ userId, ...filter })
    ]);
    return { items, total };
}